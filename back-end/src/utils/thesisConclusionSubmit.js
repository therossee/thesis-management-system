const path = require('node:path');
const { Op } = require('sequelize');

const {
  LoggedStudent,
  Student,
  Thesis,
  ThesisKeyword,
  ThesisSupervisorCoSupervisor,
  ThesisSustainableDevelopmentGoal,
  ThesisEmbargo,
  ThesisEmbargoMotivation,
  Keyword,
  Teacher,
  EmbargoMotivation,
  SustainableDevelopmentGoal,
  ThesisApplicationStatusHistory,
} = require('../models');

const { httpError } = require('./httpError');
const toSnakeCase = require('./snakeCase');
const { parseJsonField } = require('./parseJson');
const { ensureDirExists, moveFile, safeUnlink } = require('./uploads');
const { writeValidatedPdf } = require('./pdfa');
const { isResumeRequiredForStudent } = require('./requiredResume');
const thesisConclusionRequestSchema = require('../schemas/ThesisConclusionRequest');
const thesisConclusionResponseSchema = require('../schemas/ThesisConclusionResponse');

const parseConclusionRequestData = (req, files) =>
  thesisConclusionRequestSchema.parse({
    title: req.body.title,
    titleEng: req.body.titleEng || null,
    abstract: req.body.abstract,
    abstractEng: req.body.abstractEng || null,
    language: req.body.language || 'it',
    coSupervisors: toSnakeCase(parseJsonField(req.body.coSupervisors, null)),
    keywords: parseJsonField(req.body.keywords, null),
    licenseId: req.body.licenseId || null,
    sdgs: toSnakeCase(parseJsonField(req.body.sdgs, null)),
    embargo: toSnakeCase(parseJsonField(req.body.embargo, null)),
    thesisResume: files.thesisResume,
    thesisFile: files.thesisFile,
    additionalZip: files.additionalZip,
  });

const saveLiveCoSupervisors = async ({ thesisId, coSupervisors, transaction }) => {
  if (!coSupervisors) return;

  await ThesisSupervisorCoSupervisor.destroy({
    where: { thesis_id: thesisId, is_supervisor: false, scope: 'live' },
    transaction,
  });

  const teacherIds = coSupervisors
    .map(coSup => (typeof coSup === 'object' ? coSup.id : coSup))
    .filter(id => id !== null && id !== undefined);

  if (!teacherIds.length) return;

  const teachers = await Teacher.findAll({ where: { id: { [Op.in]: teacherIds } }, transaction });
  if (teachers.length !== teacherIds.length) {
    throw httpError(400, 'One or more co-supervisors not found');
  }

  await ThesisSupervisorCoSupervisor.bulkCreate(
    teacherIds.map(id => ({
      thesis_id: thesisId,
      teacher_id: id,
      is_supervisor: false,
      scope: 'live',
    })),
    { transaction },
  );
};

const saveSdgs = async ({ thesisId, sdgs, transaction }) => {
  if (!sdgs) return;

  const normalizedSdgs = sdgs
    .map(goal => ({
      id: typeof goal === 'object' ? (goal.goalId ?? goal.id) : goal,
      level: typeof goal === 'object' ? goal.level : null,
    }))
    .filter(goal => Number.isFinite(Number(goal.id)));

  const goalIds = [...new Set(normalizedSdgs.map(g => Number(g.id)))];
  if (goalIds.length) {
    const existingGoals = await SustainableDevelopmentGoal.findAll({
      where: { id: { [Op.in]: goalIds } },
      transaction,
    });
    if (existingGoals.length !== goalIds.length) {
      throw httpError(400, 'One or more sustainable development goals not found');
    }
  }

  await ThesisSustainableDevelopmentGoal.destroy({ where: { thesis_id: thesisId }, transaction });

  const deduped = new Map();
  for (const goal of normalizedSdgs) {
    const id = Number(goal.id);
    const previous = deduped.get(id);
    if (!previous || goal.level === 'primary') deduped.set(id, { id, level: goal.level });
  }

  if (!deduped.size) return;
  await ThesisSustainableDevelopmentGoal.bulkCreate(
    [...deduped.values()].map(goal => ({
      thesis_id: thesisId,
      goal_id: goal.id,
      sdg_level: goal.level,
    })),
    { transaction },
  );
};

const saveKeywords = async ({ thesisId, keywords, transaction }) => {
  if (!keywords) return;

  await ThesisKeyword.destroy({ where: { thesis_id: thesisId }, transaction });

  const keywordIds = keywords
    .map(keyword => (typeof keyword === 'object' ? keyword.id : keyword))
    .filter(id => id !== -1 && id !== undefined && id !== null);
  const keywordNames = keywords.filter(k => typeof k === 'string' && k.trim().length > 0).map(k => k.trim());

  if (keywordIds.length) {
    const currentKeywords = await Keyword.findAll({ where: { id: { [Op.in]: keywordIds } }, transaction });
    await ThesisKeyword.bulkCreate(
      currentKeywords.map(keyword => ({ thesis_id: thesisId, keyword_id: keyword.id })),
      { transaction },
    );
  }

  if (keywordNames.length) {
    await ThesisKeyword.bulkCreate(
      keywordNames.map(name => ({ thesis_id: thesisId, keyword_other: name })),
      { transaction },
    );
  }
};

const saveEmbargo = async ({ thesisId, embargo, transaction }) => {
  if (!embargo) return;

  const duration = embargo.duration || embargo.duration_months || embargo.embargoPeriod;
  const motivations = embargo.motivations || [];
  if (!duration && motivations.length === 0) throw httpError(400, 'Embargo data is incomplete');
  if (!duration) throw httpError(400, 'Embargo duration is required');

  const existingEmbargo = await ThesisEmbargo.findOne({ where: { thesis_id: String(thesisId) }, transaction });
  if (existingEmbargo) {
    await ThesisEmbargoMotivation.destroy({
      where: { thesis_embargo_id: existingEmbargo.id },
      transaction,
    });
    await ThesisEmbargo.destroy({ where: { id: existingEmbargo.id }, transaction });
  }

  const createdEmbargo = await ThesisEmbargo.create({ thesis_id: String(thesisId), duration }, { transaction });

  const normalizedMotivations = motivations.map(motivation =>
    typeof motivation === 'object'
      ? { id: motivation.motivationId, other: motivation.otherMotivation ?? motivation.other }
      : { id: motivation, other: null },
  );

  const motivationIds = normalizedMotivations.map(m => Number(m?.id)).filter(Number.isFinite);
  if (motivationIds.length) {
    const existingMotivations = await EmbargoMotivation.findAll({
      where: { id: { [Op.in]: motivationIds } },
      transaction,
    });
    if (existingMotivations.length !== motivationIds.length) {
      throw httpError(400, 'One or more embargo motivations not found');
    }
  }

  await ThesisEmbargoMotivation.bulkCreate(
    normalizedMotivations
      .filter(motivation => motivation?.id)
      .map(motivation => ({
        thesis_embargo_id: createdEmbargo.id,
        motivation_id: motivation.id,
        other_motivation: motivation.other || null,
      })),
    { transaction },
  );
};

const executeConclusionRequestTransaction = async ({ requestData, files, transaction, baseUploadDir }) => {
  const logged = await LoggedStudent.findOne({ transaction });
  if (!logged) throw httpError(401, 'Unauthorized');

  const loggedStudent = await Student.findByPk(logged.student_id, { transaction });
  if (!loggedStudent) throw httpError(404, 'Student not found');

  const thesis = await Thesis.findOne({ where: { student_id: loggedStudent.id }, transaction });
  if (!thesis) throw httpError(404, 'Thesis not found');
  if (thesis.status !== 'ongoing') throw httpError(400, 'Thesis is not in a valid state for conclusion request');

  const { title, abstract, language, coSupervisors, sdgs, keywords, licenseId, embargo } = requestData;
  if (!title || !abstract) throw httpError(400, 'Missing thesis title or abstract');

  const requiredResume = await isResumeRequiredForStudent(loggedStudent);
  if (!files.thesisFile) throw httpError(400, 'Missing thesis file');
  if (requiredResume && !files.thesisResume) throw httpError(400, 'Missing thesis resume');

  const titleEng = language === 'en' ? title : requestData.titleEng;
  const abstractEng = language === 'en' ? abstract : requestData.abstractEng;

  thesis.title = title;
  thesis.abstract = abstract;
  thesis.title_eng = titleEng;
  thesis.abstract_eng = abstractEng;
  thesis.language = language;
  await thesis.save({ transaction, fields: ['title', 'abstract', 'title_eng', 'abstract_eng', 'language'] });

  const uploadBaseDir = path.join(baseUploadDir, 'uploads', 'thesis_conclusion_request', String(loggedStudent.id));
  await ensureDirExists(uploadBaseDir);

  const thesisPdfPath = path.join(uploadBaseDir, `thesis_${loggedStudent.id}.pdf`);
  await writeValidatedPdf({ file: files.thesisFile, destinationPath: thesisPdfPath, safeUnlink });
  thesis.thesis_file = null;
  thesis.thesis_file_path = path.relative(baseUploadDir, thesisPdfPath);

  if (files.thesisResume) {
    const resumePath = path.join(uploadBaseDir, `resume_${loggedStudent.id}.pdf`);
    await moveFile(files.thesisResume.path, resumePath);
    thesis.thesis_resume = null;
    thesis.thesis_resume_path = path.relative(baseUploadDir, resumePath);
  } else {
    thesis.thesis_resume = null;
    thesis.thesis_resume_path = null;
  }

  if (files.additionalZip) {
    const zipPath = path.join(uploadBaseDir, `additional_${loggedStudent.id}.zip`);
    await moveFile(files.additionalZip.path, zipPath);
    thesis.additional_zip = null;
    thesis.additional_zip_path = path.relative(baseUploadDir, zipPath);
  } else {
    thesis.additional_zip = null;
    thesis.additional_zip_path = null;
  }

  thesis.license_id = licenseId > 0 ? licenseId : null;

  await saveLiveCoSupervisors({ thesisId: thesis.id, coSupervisors, transaction });
  await saveSdgs({ thesisId: thesis.id, sdgs, transaction });
  await saveKeywords({ thesisId: thesis.id, keywords, transaction });
  await saveEmbargo({ thesisId: thesis.id, embargo, transaction });

  await ThesisApplicationStatusHistory.create(
    {
      thesis_application_id: thesis.thesis_application_id,
      old_status: thesis.status,
      new_status: 'conclusion_requested',
    },
    { transaction },
  );

  await ThesisSupervisorCoSupervisor.destroy({
    where: { thesis_id: thesis.id, is_supervisor: false, scope: 'draft' },
    transaction,
  });

  thesis.thesis_draft_date = null;
  thesis.thesis_conclusion_request_date = new Date();
  thesis.status = 'conclusion_requested';
  await thesis.save({ transaction });

  return thesis.id;
};

const buildConclusionResponse = async updatedThesisId => {
  const updatedThesis = await Thesis.findByPk(updatedThesisId);
  if (!updatedThesis) throw httpError(404, 'Thesis not found after update');

  const [thesisSupervisors, thesisSdgs, thesisKeywords, thesisEmbargo] = await Promise.all([
    ThesisSupervisorCoSupervisor.findAll({
      where: { thesis_id: updatedThesis.id, scope: 'live' },
      attributes: ['teacher_id', 'is_supervisor'],
    }),
    ThesisSustainableDevelopmentGoal.findAll({
      where: { thesis_id: updatedThesis.id },
      attributes: ['goal_id', 'sdg_level'],
    }),
    ThesisKeyword.findAll({
      where: { thesis_id: updatedThesis.id },
      attributes: ['keyword_id', 'keyword_other'],
    }),
    ThesisEmbargo.findOne({
      where: { thesis_id: String(updatedThesis.id) },
      attributes: ['id', 'duration'],
    }),
  ]);

  const thesisEmbargoMotivations = thesisEmbargo
    ? await ThesisEmbargoMotivation.findAll({
        where: { thesis_embargo_id: thesisEmbargo.id },
        attributes: ['motivation_id', 'other_motivation'],
      })
    : [];

  return thesisConclusionResponseSchema.parse({
    id: updatedThesis.id,
    topic: updatedThesis.topic,
    title: updatedThesis.title,
    title_eng: updatedThesis.title_eng,
    language: updatedThesis.language,
    abstract: updatedThesis.abstract,
    abstract_eng: updatedThesis.abstract_eng,
    thesis_file_path: updatedThesis.thesis_file_path,
    thesis_resume_path: updatedThesis.thesis_resume_path,
    additional_zip_path: updatedThesis.additional_zip_path,
    license_id: updatedThesis.license_id,
    company_id: updatedThesis.company_id,
    student_id: updatedThesis.student_id,
    thesis_application_id: updatedThesis.thesis_application_id,
    status: updatedThesis.status,
    thesis_start_date: updatedThesis.thesis_start_date.toISOString(),
    thesis_conclusion_request_date: updatedThesis.thesis_conclusion_request_date
      ? updatedThesis.thesis_conclusion_request_date.toISOString()
      : null,
    thesis_conclusion_confirmation_date: updatedThesis.thesis_conclusion_confirmation_date
      ? updatedThesis.thesis_conclusion_confirmation_date.toISOString()
      : null,
    thesis_supervisor_cosupervisor: thesisSupervisors.map(item => ({
      teacher_id: item.teacher_id,
      is_supervisor: item.is_supervisor,
    })),
    thesis_sustainable_development_goal: thesisSdgs.map(item => ({
      goal_id: item.goal_id,
      sdg_level: item.sdg_level,
    })),
    thesis_keyword: thesisKeywords.map(item => ({
      keyword_id: item.keyword_id,
      keyword_other: item.keyword_other,
    })),
    thesis_embargo: thesisEmbargo
      ? {
          id: thesisEmbargo.id,
          duration: thesisEmbargo.duration,
          thesis_embargo_motivation: thesisEmbargoMotivations.map(item => ({
            motivation_id: item.motivation_id,
            other_motivation: item.other_motivation,
          })),
        }
      : null,
  });
};

module.exports = {
  parseConclusionRequestData,
  executeConclusionRequestTransaction,
  buildConclusionResponse,
};
