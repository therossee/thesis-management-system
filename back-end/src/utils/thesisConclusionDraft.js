const path = require('path');
const { Op } = require('sequelize');

const {
  LoggedStudent,
  Student,
  Thesis,
  Teacher,
  ThesisKeyword,
  Keyword,
  ThesisSupervisorCoSupervisor,
  SustainableDevelopmentGoal,
  ThesisSustainableDevelopmentGoal,
  EmbargoMotivation,
  ThesisEmbargo,
  ThesisEmbargoMotivation,
} = require('../models');

const toSnakeCase = require('./snakeCase');
const { parseJsonField } = require('./parseJson');
const { ensureDirExists, moveFile, resolveValidDraftFilePath, safeUnlink } = require('./uploads');
const { httpError } = require('./httpError');
const thesisConclusionDraftSchema = require('../schemas/ThesisConclusionDraft');

const normalizeDraftTextFields = draftData => {
  const alignNullable = value => (value === undefined ? undefined : (value ?? null));
  const fromItOrEn = (itValue, enValue, language) =>
    language === 'en' ? alignNullable(itValue ?? enValue) : alignNullable(itValue);
  const fromEnOrIt = (itValue, enValue, language) =>
    language === 'en' ? alignNullable(itValue ?? enValue) : alignNullable(enValue);

  return {
    title: fromItOrEn(draftData.title, draftData.titleEng, draftData.language),
    titleEng: fromEnOrIt(draftData.title, draftData.titleEng, draftData.language),
    abstract: fromItOrEn(draftData.abstract, draftData.abstractEng, draftData.language),
    abstractEng: fromEnOrIt(draftData.abstract, draftData.abstractEng, draftData.language),
  };
};

const saveDraftFiles = async ({
  thesis,
  loggedStudentId,
  baseUploadDir,
  draftUploadDir,
  files,
  removeFlags,
  setField,
}) => {
  const removeStoredDraftFile = async thesisPathField => {
    if (!thesis[thesisPathField]) return;
    const storedRelativePath = await resolveValidDraftFilePath(thesis[thesisPathField], loggedStudentId, baseUploadDir);
    if (!storedRelativePath) return;
    const storedAbsolutePath = path.join(baseUploadDir, storedRelativePath);
    await safeUnlink(storedAbsolutePath);
    setField(thesisPathField, null);
  };

  const moveDraftFile = async (file, thesisPathField) => {
    if (!file?.path) return;
    await ensureDirExists(draftUploadDir);
    const safeName = path.basename(file.originalname || file.path);
    const destination = path.join(draftUploadDir, safeName);

    const storedRelativePath = await resolveValidDraftFilePath(thesis[thesisPathField], loggedStudentId, baseUploadDir);
    if (storedRelativePath) {
      const storedAbsolutePath = path.join(baseUploadDir, storedRelativePath);
      if (path.resolve(storedAbsolutePath) !== path.resolve(destination)) {
        await safeUnlink(storedAbsolutePath);
      }
    }

    await moveFile(file.path, destination);
    setField(thesisPathField, path.relative(baseUploadDir, destination));
  };

  if (removeFlags.removeThesisSummary && !files.thesisSummary) await removeStoredDraftFile('thesis_summary_path');
  if (removeFlags.removeThesisFile && !files.thesisFile) await removeStoredDraftFile('thesis_file_path');
  if (removeFlags.removeAdditionalZip && !files.additionalZip) await removeStoredDraftFile('additional_zip_path');

  await moveDraftFile(files.thesisSummary, 'thesis_summary_path');
  await moveDraftFile(files.thesisFile, 'thesis_file_path');
  await moveDraftFile(files.additionalZip, 'additional_zip_path');
};

const saveDraftCoSupervisors = async ({ thesisId, coSupervisors, transaction }) => {
  if (coSupervisors === undefined) return;

  await ThesisSupervisorCoSupervisor.destroy({
    where: { thesis_id: thesisId, is_supervisor: false, scope: 'draft' },
    transaction,
  });

  const ids = (coSupervisors || [])
    .map(coSup => (typeof coSup === 'object' ? coSup.id : coSup))
    .filter(id => id !== null && id !== undefined);

  if (!ids.length) return;

  const teachers = await Teacher.findAll({ where: { id: { [Op.in]: ids } }, transaction });
  if (teachers.length !== ids.length) {
    throw httpError(400, 'One or more co-supervisors not found');
  }

  await ThesisSupervisorCoSupervisor.bulkCreate(
    ids.map(teacherId => ({
      thesis_id: thesisId,
      teacher_id: teacherId,
      scope: 'draft',
      is_supervisor: false,
    })),
    { transaction },
  );
};

const saveDraftSdgs = async ({ thesisId, sdgs, transaction }) => {
  if (sdgs === undefined) return;

  const normalizedSdgs = (sdgs || [])
    .map(goal => ({
      id: typeof goal === 'object' ? (goal.goalId ?? goal.id) : goal,
      level: typeof goal === 'object' ? goal.level : null,
    }))
    .filter(goal => Number.isFinite(Number(goal.id)));

  const uniqueGoalIds = [...new Set(normalizedSdgs.map(goal => Number(goal.id)))];
  if (uniqueGoalIds.length) {
    const existingGoals = await SustainableDevelopmentGoal.findAll({
      where: { id: { [Op.in]: uniqueGoalIds } },
      transaction,
    });
    if (existingGoals.length !== uniqueGoalIds.length) {
      throw httpError(400, 'One or more sustainable development goals not found');
    }
  }

  await ThesisSustainableDevelopmentGoal.destroy({ where: { thesis_id: thesisId }, transaction });

  const dedupedByGoalId = new Map();
  for (const goal of normalizedSdgs) {
    const id = Number(goal.id);
    const previous = dedupedByGoalId.get(id);
    if (!previous || goal.level === 'primary') {
      dedupedByGoalId.set(id, { id, level: goal.level || 'secondary' });
    }
  }

  if (!dedupedByGoalId.size) return;

  await ThesisSustainableDevelopmentGoal.bulkCreate(
    [...dedupedByGoalId.values()].map(goal => ({
      thesis_id: thesisId,
      goal_id: goal.id,
      sdg_level: goal.level,
    })),
    { transaction },
  );
};

const saveDraftKeywords = async ({ thesisId, keywords, transaction }) => {
  if (keywords === undefined) return;

  await ThesisKeyword.destroy({ where: { thesis_id: thesisId }, transaction });

  const normalizedKeywords = Array.isArray(keywords) ? keywords : [];
  const keywordIds = [
    ...new Set(normalizedKeywords.map(keyword => Number(keyword?.id)).filter(id => Number.isFinite(id) && id > 0)),
  ];
  const keywordNames = normalizedKeywords
    .filter(keyword => typeof keyword === 'string' && keyword.trim().length > 0)
    .map(keyword => keyword.trim());

  if (keywordIds.length) {
    const currentKeywords = await Keyword.findAll({ where: { id: { [Op.in]: keywordIds } }, transaction });
    if (currentKeywords.length !== keywordIds.length) {
      throw httpError(400, 'One or more keywords not found');
    }

    await ThesisKeyword.bulkCreate(
      currentKeywords.map(keyword => ({ thesis_id: thesisId, keyword_id: keyword.id })),
      { transaction },
    );
  }

  if (keywordNames.length) {
    await ThesisKeyword.bulkCreate(
      keywordNames.map(keywordName => ({ thesis_id: thesisId, keyword_other: keywordName })),
      { transaction },
    );
  }
};

const clearDraftEmbargo = async ({ thesisId, transaction }) => {
  const currentEmbargo = await ThesisEmbargo.findOne({
    where: { thesis_id: String(thesisId) },
    transaction,
  });
  if (!currentEmbargo) return;

  await ThesisEmbargoMotivation.destroy({
    where: { thesis_embargo_id: currentEmbargo.id },
    transaction,
  });
  await ThesisEmbargo.destroy({
    where: { id: currentEmbargo.id },
    transaction,
  });
};

const normalizeDraftEmbargoMotivations = motivations => {
  const normalized = (Array.isArray(motivations) ? motivations : [])
    .map(motivation =>
      typeof motivation === 'object'
        ? {
            id: Number(motivation?.motivationId ?? motivation?.motivation_id),
            other: motivation?.otherMotivation ?? motivation?.other_motivation ?? null,
          }
        : { id: Number(motivation), other: null },
    )
    .filter(motivation => Number.isFinite(motivation.id) && motivation.id > 0);

  const dedupedById = new Map();
  for (const motivation of normalized) {
    const current = dedupedById.get(motivation.id);
    if (!current || motivation.other) {
      dedupedById.set(motivation.id, {
        id: motivation.id,
        other:
          typeof motivation.other === 'string' && motivation.other.trim().length > 0 ? motivation.other.trim() : null,
      });
    }
  }

  return [...dedupedById.values()];
};

const saveDraftEmbargo = async ({ thesisId, embargo, transaction }) => {
  if (embargo === undefined) return;

  await clearDraftEmbargo({ thesisId, transaction });
  if (!embargo) return;

  const duration = embargo.duration || embargo.duration_months || embargo.embargoPeriod;
  if (!duration) return;

  const normalizedMotivations = normalizeDraftEmbargoMotivations(embargo.motivations);
  const motivationIds = normalizedMotivations.map(motivation => motivation.id);

  if (motivationIds.length > 0) {
    const existingMotivations = await EmbargoMotivation.findAll({
      where: { id: { [Op.in]: motivationIds } },
      transaction,
    });
    if (existingMotivations.length !== motivationIds.length) {
      throw httpError(400, 'One or more embargo motivations not found');
    }
  }

  const createdEmbargo = await ThesisEmbargo.create(
    {
      thesis_id: String(thesisId),
      duration,
    },
    { transaction },
  );

  if (!normalizedMotivations.length) return;

  await ThesisEmbargoMotivation.bulkCreate(
    normalizedMotivations.map(motivation => ({
      thesis_embargo_id: createdEmbargo.id,
      motivation_id: motivation.id,
      other_motivation: motivation.other,
    })),
    { transaction },
  );
};

const parseDraftRequestData = (req, files) =>
  thesisConclusionDraftSchema.parse({
    title: req.body.title,
    titleEng: req.body.titleEng,
    abstract: req.body.abstract,
    abstractEng: req.body.abstractEng,
    language: req.body.language,
    coSupervisors: toSnakeCase(parseJsonField(req.body.coSupervisors, undefined)),
    keywords: parseJsonField(req.body.keywords, undefined),
    licenseId: req.body.licenseId,
    sdgs: toSnakeCase(parseJsonField(req.body.sdgs, undefined)),
    embargo: toSnakeCase(parseJsonField(req.body.embargo, undefined)),
    thesisSummary: files.thesisSummary,
    thesisFile: files.thesisFile,
    additionalZip: files.additionalZip,
    removeThesisSummary: req.body.removeThesisSummary,
    removeThesisFile: req.body.removeThesisFile,
    removeAdditionalZip: req.body.removeAdditionalZip,
  });

const getLoggedStudentOrThrow = async () => {
  const logged = await LoggedStudent.findOne();
  if (!logged) throw httpError(401, 'Unauthorized');

  const loggedStudent = await Student.findByPk(logged.student_id);
  if (!loggedStudent) throw httpError(404, 'Student not found');

  return loggedStudent;
};

const saveDraftTransaction = async ({
  loggedStudent,
  draftData,
  files,
  baseUploadDir,
  draftUploadDir,
  transaction,
}) => {
  const thesis = await Thesis.findOne({ where: { student_id: loggedStudent.id }, transaction });
  if (!thesis) throw httpError(404, 'Thesis not found');
  if (thesis.status !== 'ongoing') {
    throw httpError(400, 'No draft can be saved for current thesis status');
  }

  const fieldsToSave = [];
  const setField = (field, value) => {
    if (value === undefined) return;
    thesis[field] = value;
    fieldsToSave.push(field);
  };

  const normalizedTexts = normalizeDraftTextFields(draftData);
  setField('title', normalizedTexts.title);
  setField('title_eng', normalizedTexts.titleEng);
  setField('abstract', normalizedTexts.abstract);
  setField('abstract_eng', normalizedTexts.abstractEng);
  setField('language', draftData.language);
  if (draftData.licenseId !== undefined) setField('license_id', draftData.licenseId);
  if (draftData.embargo !== undefined && draftData.embargo !== null && draftData.licenseId === undefined) {
    setField('license_id', null);
  }
  setField('thesis_draft_date', new Date());

  await saveDraftFiles({
    thesis,
    loggedStudentId: loggedStudent.id,
    baseUploadDir,
    draftUploadDir,
    files,
    removeFlags: {
      removeThesisSummary: draftData.removeThesisSummary,
      removeThesisFile: draftData.removeThesisFile,
      removeAdditionalZip: draftData.removeAdditionalZip,
    },
    setField,
  });

  await thesis.save({ transaction, fields: [...new Set(fieldsToSave)] });

  await saveDraftCoSupervisors({
    thesisId: thesis.id,
    coSupervisors: draftData.coSupervisors,
    transaction,
  });

  await saveDraftSdgs({
    thesisId: thesis.id,
    sdgs: draftData.sdgs,
    transaction,
  });

  await saveDraftKeywords({
    thesisId: thesis.id,
    keywords: draftData.keywords,
    transaction,
  });

  if (draftData.embargo !== undefined) {
    await saveDraftEmbargo({
      thesisId: thesis.id,
      embargo: draftData.embargo,
      transaction,
    });
  } else if (draftData.licenseId !== undefined && draftData.licenseId !== null) {
    await clearDraftEmbargo({
      thesisId: thesis.id,
      transaction,
    });
  }
};

module.exports = {
  parseDraftRequestData,
  getLoggedStudentOrThrow,
  saveDraftTransaction,
};
