const path = require('path');
const { Op } = require('sequelize');

const {
  LoggedStudent,
  Student,
  Thesis,
  Teacher,
  ThesisSupervisorCoSupervisor,
  SustainableDevelopmentGoal,
  ThesisSustainableDevelopmentGoal,
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

  if (removeFlags.removeThesisResume && !files.thesisResume) await removeStoredDraftFile('thesis_resume_path');
  if (removeFlags.removeThesisFile && !files.thesisFile) await removeStoredDraftFile('thesis_file_path');
  if (removeFlags.removeAdditionalZip && !files.additionalZip) await removeStoredDraftFile('additional_zip_path');

  await moveDraftFile(files.thesisResume, 'thesis_resume_path');
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
    thesisResume: files.thesisResume,
    thesisFile: files.thesisFile,
    additionalZip: files.additionalZip,
    removeThesisResume: req.body.removeThesisResume,
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
  setField('thesis_draft_date', new Date());

  await saveDraftFiles({
    thesis,
    loggedStudentId: loggedStudent.id,
    baseUploadDir,
    draftUploadDir,
    files,
    removeFlags: {
      removeThesisResume: draftData.removeThesisResume,
      removeThesisFile: draftData.removeThesisFile,
      removeAdditionalZip: draftData.removeAdditionalZip,
    },
    setField,
  });

  if (fieldsToSave.length) {
    await thesis.save({ transaction, fields: [...new Set(fieldsToSave)] });
  }

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
};

module.exports = {
  parseDraftRequestData,
  getLoggedStudentOrThrow,
  saveDraftTransaction,
};
