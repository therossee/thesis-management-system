const { Op } = require('sequelize');
const { ZodError } = require('zod');
const path = require('path');

const {
  Thesis,
  ThesisKeyword,
  ThesisSupervisorCoSupervisor,
  ThesisSustainableDevelopmentGoal,
  ThesisEmbargo,
  ThesisEmbargoMotivation,
  Keyword,
  Teacher,
  Student,
  EmbargoMotivation,
  License,
  LoggedStudent,
  ThesisApplication,
  SustainableDevelopmentGoal,
  GraduationSession,
  Deadline,
  sequelize,
  ThesisApplicationStatusHistory,
} = require('../models');

const selectLicenseAttributes = require('../utils/selectLicenseAttributes');
const selectMotivationAttributes = require('../utils/selectMotivationAttributes');
const selectTeacherAttributes = require('../utils/selectTeacherAttributes');
const toSnakeCase = require('../utils/snakeCase');

const thesisConclusionRequestSchema = require('../schemas/ThesisConclusionRequest');
const thesisConclusionDraftSchema = require('../schemas/ThesisConclusionDraft');
const thesisConclusionResponseSchema = require('../schemas/ThesisConclusionResponse');
const teacherOverviewSchema = require('../schemas/TeacherOverview');

const {
  ensureDirExists,
  moveFile,
  cleanupUploads,
  resolveValidDraftFilePath,
  safeUnlink,
} = require('../utils/uploads');
const { writeValidatedPdf } = require('../utils/pdfa');
const { parseJsonField } = require('../utils/parseJson');
const { isResumeRequiredForStudent } = require('../utils/requiredResume');
const { httpError } = require('../utils/httpError');

const sendThesisConclusionRequest = async (req, res) => {
  try {
    let updatedThesisId = null;

    const thesisResume = req.files?.thesisResume?.[0] || null;
    const thesisFile = req.files?.thesisFile?.[0] || null;
    const additionalZip = req.files?.additionalZip?.[0] || null;

    const requestData = thesisConclusionRequestSchema.parse({
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
      thesisResume,
      thesisFile,
      additionalZip,
    });

    const { coSupervisors, sdgs, keywords, licenseId, embargo, language: lang, title, abstract } = requestData;

    let titleEng = requestData.titleEng;
    let abstractEng = requestData.abstractEng;

    try {
      await sequelize.transaction(async transaction => {
        const logged = await LoggedStudent.findOne({ transaction });
        if (!logged) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const loggedStudent = await Student.findByPk(logged.student_id, { transaction });
        if (!loggedStudent) {
          return res.status(404).json({ error: 'Student not found' });
        }

        const thesis = await Thesis.findOne({
          where: { student_id: loggedStudent.id },
          transaction,
        });
        if (!thesis) {
          return res.status(404).json({ error: 'Thesis not found' });
        }

        if (thesis.status !== 'ongoing') {
          return res.status(400).json({ error: 'Thesis is not in a valid state for conclusion request' });
        }

        if (!title || !abstract) {
          return res.status(400).json({ error: 'Missing thesis title or abstract' });
        }

        const requiredResume = await isResumeRequiredForStudent(loggedStudent);

        if (lang === 'en') {
          titleEng = title;
          abstractEng = abstract;
        }

        thesis.title = title;
        thesis.abstract = abstract;
        thesis.title_eng = titleEng;
        thesis.abstract_eng = abstractEng;
        thesis.language = lang;

        await thesis.save({
          transaction,
          fields: ['title', 'abstract', 'title_eng', 'abstract_eng', 'language'],
        });

        if (!thesisFile) {
          return res.status(400).json({ error: 'Missing thesis file' });
        }
        if (requiredResume && !thesisResume) return res.status(400).json({ error: 'Missing thesis resume' });

        const uploadBaseDir = path.join(
          __dirname,
          '..',
          '..',
          'uploads',
          'thesis_conclusion_request',
          String(loggedStudent.id),
        );
        await ensureDirExists(uploadBaseDir);

        const thesisPdfName = `thesis_${loggedStudent.id}.pdf`;
        const thesisPdfPath = path.join(uploadBaseDir, thesisPdfName);

        // PDF/A check & write, then temp cleanup is handled by pdfa.js helper (or by finally inside it)
        await writeValidatedPdf({ file: thesisFile, destinationPath: thesisPdfPath, safeUnlink });

        // Co-supervisors (replace if provided)
        if (coSupervisors) {
          await ThesisSupervisorCoSupervisor.destroy({
            where: {
              thesis_id: thesis.id,
              is_supervisor: false,
              scope: 'live',
            },
            transaction,
          });

          const newIds = coSupervisors
            .map(coSup => (typeof coSup === 'object' ? coSup.id : coSup))
            .filter(id => id !== null && id !== undefined);

          if (newIds.length) {
            const coTeachers = await Teacher.findAll({
              where: { id: { [Op.in]: newIds } },
              transaction,
            });
            if (coTeachers.length !== newIds.length) {
              return res.status(400).json({ error: 'One or more co-supervisors not found' });
            }

            await ThesisSupervisorCoSupervisor.bulkCreate(
              newIds.map(id => ({
                thesis_id: thesis.id,
                teacher_id: id,
                is_supervisor: false,
                scope: 'live',
              })),
              { transaction },
            );
          }
        }

        // SDGs (replace, consistent with draft)
        if (sdgs) {
          const normalizedSdgs = sdgs
            .map(goal => ({
              id: typeof goal === 'object' ? (goal.goalId ?? goal.id) : goal,
              level: typeof goal === 'object' ? goal.level : null,
            }))
            .filter(goal => Number.isFinite(Number(goal.id)));

          const uniqueGoalIds = [...new Set(normalizedSdgs.map(g => Number(g.id)))];

          if (uniqueGoalIds.length) {
            const existingGoals = await SustainableDevelopmentGoal.findAll({
              where: { id: { [Op.in]: uniqueGoalIds } },
              transaction,
            });
            if (existingGoals.length !== uniqueGoalIds.length) {
              return res.status(400).json({ error: 'One or more sustainable development goals not found' });
            }
          }

          await ThesisSustainableDevelopmentGoal.destroy({ where: { thesis_id: thesis.id }, transaction });

          const dedupedByGoalId = new Map();
          for (const goal of normalizedSdgs) {
            const id = Number(goal.id);
            const prev = dedupedByGoalId.get(id);
            if (!prev || goal.level === 'primary') dedupedByGoalId.set(id, { id, level: goal.level });
          }

          if (dedupedByGoalId.size) {
            await ThesisSustainableDevelopmentGoal.bulkCreate(
              [...dedupedByGoalId.values()].map(g => ({
                thesis_id: thesis.id,
                goal_id: g.id,
                sdg_level: g.level,
              })),
              { transaction },
            );
          }
        }

        // Keywords (replace if provided)
        if (keywords) {
          await ThesisKeyword.destroy({ where: { thesis_id: thesis.id }, transaction });

          const keywordIds = keywords
            .map(k => (typeof k === 'object' ? k.id : k))
            .filter(id => id !== -1 && id !== undefined && id !== null);

          const keywordNames = keywords.filter(k => typeof k === 'string' && k.trim().length > 0).map(k => k.trim());

          if (keywordIds.length) {
            const currentKeywords = await Keyword.findAll({
              where: { id: { [Op.in]: keywordIds } },
              transaction,
            });

            await ThesisKeyword.bulkCreate(
              currentKeywords.map(k => ({ thesis_id: thesis.id, keyword_id: k.id })),
              { transaction },
            );
          }

          if (keywordNames.length) {
            await ThesisKeyword.bulkCreate(
              keywordNames.map(name => ({ thesis_id: thesis.id, keyword_other: name })),
              { transaction },
            );
          }
        }

        // Resume file (same behavior as your original send flow: just move)
        if (thesisResume) {
          const resumeName = `resume_${loggedStudent.id}.pdf`;
          const resumePath = path.join(uploadBaseDir, resumeName);
          await moveFile(thesisResume.path, resumePath);
          thesis.thesis_resume = null;
          thesis.thesis_resume_path = path.relative(path.join(__dirname, '..', '..'), resumePath);
        } else {
          thesis.thesis_resume = null;
          thesis.thesis_resume_path = null;
        }

        thesis.license_id = licenseId > 0 ? licenseId : null;

        // Embargo (replace)
        if (embargo) {
          const duration = embargo.duration || embargo.duration_months || embargo.embargoPeriod;
          const motivations = embargo.motivations || [];

          if (!duration && motivations.length === 0)
            return res.status(400).json({ error: 'Embargo data is incomplete' });
          if (!duration) return res.status(400).json({ error: 'Embargo duration is required' });

          const existingEmbargo = await ThesisEmbargo.findOne({
            where: { thesis_id: String(thesis.id) },
            transaction,
          });

          if (existingEmbargo) {
            await ThesisEmbargoMotivation.destroy({
              where: { thesis_embargo_id: existingEmbargo.id },
              transaction,
            });
            await ThesisEmbargo.destroy({
              where: { id: existingEmbargo.id },
              transaction,
            });
          }

          const createdEmbargo = await ThesisEmbargo.create(
            {
              thesis_id: String(thesis.id),
              duration,
            },
            { transaction },
          );

          const normalizedMotivations = motivations.map(m =>
            typeof m === 'object'
              ? { id: m.motivationId, other: m.otherMotivation ?? m.other }
              : { id: m, other: null },
          );

          const motivationIds = normalizedMotivations.map(m => Number(m?.id)).filter(Number.isFinite);
          if (motivationIds.length) {
            const existingMotivations = await EmbargoMotivation.findAll({
              where: { id: { [Op.in]: motivationIds } },
              transaction,
            });
            if (existingMotivations.length !== motivationIds.length) {
              return res.status(400).json({ error: 'One or more embargo motivations not found' });
            }
          }

          await ThesisEmbargoMotivation.bulkCreate(
            normalizedMotivations
              .filter(m => m?.id)
              .map(m => ({
                thesis_embargo_id: createdEmbargo.id,
                motivation_id: m.id,
                other_motivation: m.other || null,
              })),
            { transaction },
          );
        }

        thesis.thesis_file = null;
        thesis.thesis_file_path = path.relative(path.join(__dirname, '..', '..'), thesisPdfPath);

        if (additionalZip) {
          const zipName = `additional_${loggedStudent.id}.zip`;
          const zipPath = path.join(uploadBaseDir, zipName);
          await moveFile(additionalZip.path, zipPath);
          thesis.additional_zip = null;
          thesis.additional_zip_path = path.relative(path.join(__dirname, '..', '..'), zipPath);
        } else {
          thesis.additional_zip = null;
          thesis.additional_zip_path = null;
        }

        await ThesisApplicationStatusHistory.create(
          {
            thesis_application_id: thesis.thesis_application_id,
            old_status: thesis.status,
            new_status: 'conclusion_requested',
          },
          { transaction },
        );

        await ThesisSupervisorCoSupervisor.destroy({
          where: {
            thesis_id: thesis.id,
            is_supervisor: false,
            scope: 'draft',
          },
          transaction,
        });

        thesis.thesis_draft_date = null;
        thesis.thesis_conclusion_request_date = new Date();
        thesis.status = 'conclusion_requested';
        await thesis.save({ transaction });

        updatedThesisId = thesis.id;
      });
    } catch (err) {
      // on failure ensure temp uploads are cleaned up
      await cleanupUploads(thesisFile, thesisResume, additionalZip);
      throw err;
    }

    const updatedThesis = await Thesis.findByPk(updatedThesisId);
    if (!updatedThesis) return res.status(404).json({ error: 'Thesis not found after update' });

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

    let thesisEmbargoMotivations = [];
    if (thesisEmbargo) {
      thesisEmbargoMotivations = await ThesisEmbargoMotivation.findAll({
        where: { thesis_embargo_id: thesisEmbargo.id },
        attributes: ['motivation_id', 'other_motivation'],
      });
    }

    const validatedThesis = thesisConclusionResponseSchema.parse({
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

    return res.status(200).json({
      message: 'Thesis conclusion request submitted successfully',
      thesis: validatedThesis,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.issues.map(issue => issue.message).join(', ') });
    }
    return res.status(error.status || 500).json({ error: error.message });
  }
};

const getSustainableDevelopmentGoals = async (req, res) => {
  try {
    const goals = await SustainableDevelopmentGoal.findAll();
    res.status(200).json(goals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAvailableLicenses = async (req, res) => {
  try {
    const licenses = await License.findAll({
      attributes: selectLicenseAttributes(req.query.lang || 'it'),
    });
    res.status(200).json(licenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getEmbargoMotivations = async (req, res) => {
  try {
    const motivations = await EmbargoMotivation.findAll({
      attributes: selectMotivationAttributes(req.query.lang || 'it'),
    });
    res.status(200).json(motivations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSessionDeadlines = async (req, res) => {
  const now = new Date();
  const getSessionId = deadline => deadline?.graduation_session_id ?? deadline?.graduation_session?.id;
  const deadlineTypeByEffectiveType = {
    no_application: 'thesis_request',
    application: 'conclusion_request',
    thesis: 'final_exam_registration',
  };

  const logged = await LoggedStudent.findOne();
  if (!logged) return res.status(401).json({ error: 'No logged-in student found' });

  const thesis = await Thesis.findOne({ where: { student_id: logged.student_id } });

  const activeApplication = await ThesisApplication.findOne({
    where: {
      student_id: logged.student_id,
      status: { [Op.in]: ['pending', 'approved'] },
    },
    order: [['submission_date', 'DESC']],
  });

  const effectiveType = thesis ? 'thesis' : activeApplication ? 'application' : 'no_application';
  const deadlineType = deadlineTypeByEffectiveType[effectiveType];
  if (!deadlineType) return res.status(400).json({ error: 'Invalid flag' });

  let shouldForceNextSession = false;
  if (thesis?.thesis_application_id && thesis.status === 'ongoing') {
    const lastFinalUploadRejected = await ThesisApplicationStatusHistory.findOne({
      where: {
        thesis_application_id: thesis.thesis_application_id,
        old_status: 'final_thesis',
        new_status: 'ongoing',
      },
      order: [['change_date', 'DESC']],
    });
    shouldForceNextSession = Boolean(lastFinalUploadRejected);
  }

  const upcomingDeadlines = await Deadline.findAll({
    where: {
      deadline_type: deadlineType,
      deadline_date: { [Op.gte]: now },
    },
    order: [['deadline_date', 'ASC']],
    include: [{ model: GraduationSession, as: 'graduation_session' }],
  });

  if (!upcomingDeadlines.length) {
    return res.status(404).json({ error: 'No upcoming deadline found for this flag' });
  }

  const firstDeadline = upcomingDeadlines[0];
  const firstSessionId = getSessionId(firstDeadline);
  const refDeadline =
    shouldForceNextSession && firstSessionId
      ? upcomingDeadlines.find(deadline => getSessionId(deadline) !== firstSessionId) || firstDeadline
      : firstDeadline;

  const sessionId = getSessionId(refDeadline);
  if (!sessionId) return res.status(500).json({ error: 'Graduation session not found for deadline' });

  const sessionDeadlines = await Deadline.findAll({
    where: { graduation_session_id: sessionId },
    include: [{ model: GraduationSession, as: 'graduation_session' }],
    order: [['deadline_date', 'ASC']],
  });

  return res.status(200).json({
    graduationSession: refDeadline.graduation_session,
    deadlines: sessionDeadlines,
  });
};

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

const uploadFinalThesis = async (req, res) => {
  try {
    const thesisFile = req.files?.thesisFile?.[0] || null;
    const thesisResume = req.files?.thesisResume?.[0] || null;
    const additionalZip = req.files?.additionalZip?.[0] || null;

    if (!thesisFile) return res.status(400).json({ error: 'Missing thesis file' });

    const logged = await LoggedStudent.findOne();
    if (!logged) {
      await cleanupUploads(thesisFile, thesisResume, additionalZip);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const loggedStudent = await Student.findByPk(logged.student_id);
    if (!loggedStudent) {
      await cleanupUploads(thesisFile, thesisResume, additionalZip);
      return res.status(404).json({ error: 'Student not found' });
    }

    const requiredResume = await isResumeRequiredForStudent(loggedStudent);
    if (requiredResume && !thesisResume) {
      await cleanupUploads(thesisFile, additionalZip);
      return res.status(400).json({ error: 'Missing thesis resume file' });
    }

    const uploadBaseDir = path.join(__dirname, '..', '..', 'uploads', 'final_thesis', String(loggedStudent.id));
    await ensureDirExists(uploadBaseDir);

    const thesisPdfPath = path.join(uploadBaseDir, `final_thesis_${loggedStudent.id}.pdf`);

    try {
      await writeValidatedPdf({ file: thesisFile, destinationPath: thesisPdfPath, safeUnlink });
    } catch (error) {
      await cleanupUploads(thesisResume, additionalZip);
      return res.status(error.status || 500).json({ error: error.message });
    }

    if (thesisResume?.path) {
      const resumePdfPath = path.join(uploadBaseDir, `final_resume_${loggedStudent.id}.pdf`);
      try {
        await writeValidatedPdf({ file: thesisResume, destinationPath: resumePdfPath, safeUnlink });
      } catch (error) {
        await cleanupUploads(additionalZip);
        return res.status(error.status || 500).json({ error: error.message });
      }
    }

    if (additionalZip?.path) {
      const additionalZipPath = path.join(uploadBaseDir, `final_additional_${loggedStudent.id}.zip`);
      await moveFile(additionalZip.path, additionalZipPath);
    }

    const result = await sequelize.transaction(async transaction => {
      const thesis = await Thesis.findOne({
        where: { student_id: loggedStudent.id },
        transaction,
      });
      if (!thesis) return { status: 404, payload: { error: 'Thesis not found' } };
      if (thesis.status !== 'final_exam')
        return { status: 400, payload: { error: 'Thesis is not in a final exam state' } };

      await ThesisApplicationStatusHistory.create(
        {
          thesis_application_id: thesis.thesis_application_id,
          old_status: thesis.status,
          new_status: 'final_thesis',
        },
        { transaction },
      );

      thesis.thesis_file = null;
      thesis.thesis_file_path = path.relative(path.join(__dirname, '..', '..'), thesisPdfPath);

      if (thesisResume?.path || requiredResume) {
        const resumePdfPath = path.join(uploadBaseDir, `final_resume_${loggedStudent.id}.pdf`);
        thesis.thesis_resume = null;
        thesis.thesis_resume_path = path.relative(path.join(__dirname, '..', '..'), resumePdfPath);
      }

      if (additionalZip?.path) {
        const additionalZipPath = path.join(uploadBaseDir, `final_additional_${loggedStudent.id}.zip`);
        thesis.additional_zip = null;
        thesis.additional_zip_path = path.relative(path.join(__dirname, '..', '..'), additionalZipPath);
      }

      thesis.status = 'final_thesis';
      await thesis.save({ transaction });

      return { status: 200, payload: { message: 'Final thesis uploaded successfully' } };
    });

    return res.status(result.status).json(result.payload);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
};

const saveThesisConclusionRequestDraft = async (req, res) => {
  const thesisResume = req.files?.thesisResume?.[0] || null;
  const thesisFile = req.files?.thesisFile?.[0] || null;
  const additionalZip = req.files?.additionalZip?.[0] || null;
  const files = { thesisResume, thesisFile, additionalZip };

  try {
    const draftData = parseDraftRequestData(req, files);
    const loggedStudent = await getLoggedStudentOrThrow();
    const baseUploadDir = path.join(__dirname, '..', '..');
    const draftUploadDir = path.join(baseUploadDir, 'uploads', 'thesis_conclusion_draft', String(loggedStudent.id));

    await sequelize.transaction(transaction =>
      saveDraftTransaction({
        loggedStudent,
        draftData,
        files,
        baseUploadDir,
        draftUploadDir,
        transaction,
      }),
    );

    return res.status(200).json({ message: 'Draft saved successfully' });
  } catch (error) {
    await cleanupUploads(thesisResume, thesisFile, additionalZip);
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.issues.map(issue => issue.message).join(', ') });
    }
    return res.status(error.status || 500).json({ error: error.message });
  }
};

const getThesisConclusionRequestDraft = async (req, res) => {
  try {
    const logged = await LoggedStudent.findOne();
    if (!logged) return res.status(401).json({ error: 'Unauthorized' });

    const loggedStudent = await Student.findByPk(logged.student_id);
    if (!loggedStudent) return res.status(404).json({ error: 'Student not found' });

    const thesis = await Thesis.findOne({ where: { student_id: loggedStudent.id } });
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });

    const draftCoSupervisors = await ThesisSupervisorCoSupervisor.findAll({
      where: {
        thesis_id: thesis.id,
        is_supervisor: false,
        scope: 'draft',
      },
      attributes: ['teacher_id'],
    });

    const draftIds = draftCoSupervisors.map(item => item.teacher_id);
    const teachers = draftIds.length
      ? await Teacher.findAll({
          where: { id: { [Op.in]: draftIds } },
          attributes: selectTeacherAttributes(),
        })
      : [];

    const teacherById = new Map(teachers.map(t => [t.id, t]));
    const coSupervisors = draftIds
      .map(id => teacherById.get(id))
      .filter(Boolean)
      .map(t => teacherOverviewSchema.parse(t));

    const [draftThesisFilePath, draftResumePath, draftAdditionalPath] = await Promise.all([
      resolveValidDraftFilePath(thesis.thesis_file_path, loggedStudent.id),
      resolveValidDraftFilePath(thesis.thesis_resume_path, loggedStudent.id),
      resolveValidDraftFilePath(thesis.additional_zip_path, loggedStudent.id),
    ]);

    const draftSdgs = await ThesisSustainableDevelopmentGoal.findAll({
      where: { thesis_id: thesis.id },
      attributes: ['goal_id', 'sdg_level'],
    });

    return res.status(200).json({
      title: thesis.title ?? null,
      titleEng: thesis.title_eng ?? null,
      abstract: thesis.abstract ?? null,
      abstractEng: thesis.abstract_eng ?? null,
      language: thesis.language ?? null,
      licenseId: thesis.license_id ?? null,
      thesisFilePath: draftThesisFilePath,
      thesisResumePath: draftResumePath,
      additionalZipPath: draftAdditionalPath,
      thesisDraftDate: thesis.thesis_draft_date ? thesis.thesis_draft_date.toISOString() : null,
      coSupervisors,
      sdgs: draftSdgs.map(sdg => ({
        goalId: sdg.goal_id,
        level: sdg.sdg_level,
      })),
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
};

module.exports = {
  sendThesisConclusionRequest,
  saveThesisConclusionRequestDraft,
  getThesisConclusionRequestDraft,
  getSustainableDevelopmentGoals,
  getAvailableLicenses,
  getEmbargoMotivations,
  getSessionDeadlines,
  uploadFinalThesis,
};
