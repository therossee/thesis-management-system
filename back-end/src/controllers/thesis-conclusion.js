const { Op, QueryTypes } = require('sequelize');
const { ZodError } = require('zod');
const fs = require('fs/promises');
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

const parseJsonField = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (err) {
      console.warn('Failed to parse JSON field, error:', err);
      return fallback;
    }
  }
  return value;
};

const ensureDir = async dirPath => {
  await fs.mkdir(dirPath, { recursive: true });
};

const normalizePathSeparators = filePath => String(filePath || '').replace(/\\/g, '/');

const resolveValidDraftFilePath = async (filePath, studentId) => {
  if (!filePath) return null;
  const normalized = normalizePathSeparators(filePath);
  const expectedPrefix = `uploads/thesis_conclusion_draft/${studentId}/`;
  if (!normalized.startsWith(expectedPrefix)) return null;

  const absolutePath = path.join(__dirname, '..', '..', normalized);
  try {
    await fs.access(absolutePath);
    return normalized;
  } catch {
    return null;
  }
};

const moveFile = async (fromPath, toPath) => {
  try {
    await fs.rename(fromPath, toPath);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    await fs.copyFile(fromPath, toPath);
    await fs.unlink(fromPath);
  }
};

const isPdfAByMetadata = pdfBuffer => {
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length < 5) return false;
  if (pdfBuffer.subarray(0, 5).toString('latin1') !== '%PDF-') return false;

  const content = pdfBuffer.toString('latin1');
  const hasPdfAIdentification = /pdfaid:part\s*>\s*[123]\s*</i.test(content);
  const hasConformance = /pdfaid:conformance\s*>\s*[ABU]\s*</i.test(content);

  return hasPdfAIdentification && hasConformance;
};

const readAndValidatePdfA = async file => {
  if (!file?.path) return null;
  const fileBuffer = await fs.readFile(file.path);
  if (!isPdfAByMetadata(fileBuffer)) {
    const err = new Error('Thesis file must be a valid PDF/A');
    err.status = 400;
    throw err;
  }
  return fileBuffer;
};

const sendThesisConclusionRequest = async (req, res) => {
  const throwHttp = (status, message) => {
    const err = new Error(message);
    err.status = status;
    throw err;
  };
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

    const coSupervisors = requestData.coSupervisors;
    const sdgs = requestData.sdgs;
    const keywords = requestData.keywords;
    const licenseId = requestData.licenseId;
    const embargo = requestData.embargo;
    const lang = requestData.language;
    const title = requestData.title;
    const abstract = requestData.abstract;
    let titleEng = requestData.titleEng;
    let abstractEng = requestData.abstractEng;

    await sequelize.transaction(async transaction => {
      const logged = await LoggedStudent.findOne({ transaction });
      if (!logged) {
        throwHttp(401, 'Unauthorized');
      }
      const loggedStudent = await Student.findByPk(logged.student_id, { transaction });
      if (!loggedStudent) {
        throwHttp(404, 'Student not found');
      }
      const thesis = await Thesis.findOne({
        where: { student_id: loggedStudent.id },
        transaction,
      });
      if (!thesis) {
        throwHttp(404, 'Thesis not found');
      }
      if (!['ongoing', 'conclusion_rejected'].includes(thesis.status)) {
        throwHttp(400, 'Thesis is not in a valid state for conclusion request');
      }

      if (!title || !abstract) {
        throwHttp(400, 'Missing thesis title or abstract');
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
        throwHttp(400, 'Missing thesisFile');
      }
      if (requiredResume && !thesisResume) {
        throwHttp(400, 'Missing thesisResume');
      }

      const uploadBaseDir = path.join(
        __dirname,
        '..',
        '..',
        'uploads',
        'thesis_conclusion_request',
        String(loggedStudent.id),
      );
      await ensureDir(uploadBaseDir);

      const thesisPdfName = `thesis_${loggedStudent.id}.pdf`;
      const thesisPdfPath = path.join(uploadBaseDir, thesisPdfName);
      try {
        const thesisBuffer = await readAndValidatePdfA(thesisFile);
        await fs.writeFile(thesisPdfPath, thesisBuffer);
      } finally {
        await fs.unlink(thesisFile.path).catch(() => {});
      }
      if (coSupervisors) {
        const currentCoSupervisors = await ThesisSupervisorCoSupervisor.findAll({
          where: {
            thesis_id: thesis.id,
            is_supervisor: false,
            scope: 'live',
          },
          transaction,
        });
        const currentIds = currentCoSupervisors.map(cs => cs.teacher_id).sort();
        const newIds = coSupervisors
          .map(coSup => (typeof coSup === 'object' ? coSup.id : coSup))
          .filter(id => id !== null && id !== undefined)
          .sort();

        const arraysAreEqual = currentIds.length === newIds.length && currentIds.every((id, idx) => id === newIds[idx]);

        if (!arraysAreEqual) {
          await ThesisSupervisorCoSupervisor.destroy({
            where: {
              thesis_id: thesis.id,
              is_supervisor: false,
              scope: 'live',
            },
            transaction,
          });
          const co_supervisors = await Teacher.findAll({
            where: {
              id: {
                [Op.in]: newIds,
              },
            },
            transaction,
          });
          if (co_supervisors.length !== newIds.length) {
            throwHttp(400, 'One or more co-supervisors not found');
          }
          for (const coSup of co_supervisors) {
            await ThesisSupervisorCoSupervisor.create(
              {
                thesis_id: thesis.id,
                teacher_id: coSup.id,
                is_supervisor: false,
                scope: 'live',
              },
              { transaction },
            );
          }
        }
      }

      if (sdgs) {
        const normalizedSdgs = sdgs
          .map(goal => ({
            id: typeof goal === 'object' ? (goal.goalId ?? goal.id) : goal,
            level: typeof goal === 'object' ? goal.level : null,
          }))
          .filter(goal => Number.isFinite(Number(goal.id)));
        const goalIds = normalizedSdgs.map(goal => Number(goal.id));
        const uniqueGoalIds = [...new Set(goalIds)];
        const currentGoals = await SustainableDevelopmentGoal.findAll({
          where: {
            id: {
              [Op.in]: uniqueGoalIds,
            },
          },
          transaction,
        });
        if (uniqueGoalIds.length && currentGoals.length !== uniqueGoalIds.length) {
          throwHttp(400, 'One or more sustainable development goals not found');
        }

        // The schema allows one row per SDG per thesis (PK thesis_id + goal_id).
        // If the same SDG is selected multiple times (e.g. NOT APPLICABLE), keep only one row.
        // Prefer "primary" when present.
        const dedupedByGoalId = new Map();
        for (const goal of normalizedSdgs) {
          const id = Number(goal.id);
          const previous = dedupedByGoalId.get(id);
          if (!previous || goal.level === 'primary') {
            dedupedByGoalId.set(id, { id, level: goal.level });
          }
        }

        for (const goal of dedupedByGoalId.values()) {
          await ThesisSustainableDevelopmentGoal.create(
            {
              thesis_id: thesis.id,
              goal_id: goal.id,
              sdg_level: goal.level,
            },
            { transaction },
          );
        }
      }

      if (keywords) {
        const keywordIds = keywords
          .map(k => (typeof k === 'object' ? k.id : k))
          .filter(id => id !== -1 && id !== undefined && id !== null);
        const keywordNames = keywords.filter(k => typeof k === 'string' && k.trim().length > 0).map(k => k.trim());
        const currentKeywords = keywordIds.length
          ? await Keyword.findAll({
              where: {
                id: {
                  [Op.in]: keywordIds,
                },
              },
              transaction,
            })
          : [];
        for (const keyword of currentKeywords) {
          await ThesisKeyword.create(
            {
              thesis_id: thesis.id,
              keyword_id: keyword.id,
            },
            { transaction },
          );
        }
        for (const newKeyword of keywordNames) {
          await ThesisKeyword.create(
            {
              thesis_id: thesis.id,
              keyword_other: newKeyword,
            },
            { transaction },
          );
        }
      }

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
      thesis.license_id = Number.isFinite(licenseId) && licenseId > 0 ? licenseId : null;
      if (embargo) {
        const duration = embargo.duration || embargo.duration_months || embargo.embargoPeriod;
        const motivationsRaw = Array.isArray(embargo.motivations)
          ? embargo.motivations
          : Array.isArray(embargo.motivation)
            ? embargo.motivation
            : [];

        if (!duration && motivationsRaw.length === 0) {
          throwHttp(400, 'Embargo data is incomplete');
        }

        if (!duration) {
          throwHttp(400, 'Embargo duration is required');
        }

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

        const normalizedMotivations = motivationsRaw.map(m =>
          typeof m === 'object'
            ? { id: m.motivationId ?? m.id, other: m.otherMotivation ?? m.other }
            : { id: m, other: null },
        );
        const motivationIds = normalizedMotivations.map(m => Number(m?.id)).filter(id => Number.isFinite(id));
        const existingMotivations = motivationIds.length
          ? await EmbargoMotivation.findAll({
              where: { id: { [Op.in]: motivationIds } },
              transaction,
            })
          : [];
        if (motivationIds.length && existingMotivations.length !== motivationIds.length) {
          throwHttp(400, 'One or more embargo motivations not found');
        }

        for (const motivation of normalizedMotivations) {
          const motivationId = Number(motivation?.id);
          if (!Number.isFinite(motivationId)) continue;
          await ThesisEmbargoMotivation.create(
            {
              thesis_embargo_id: createdEmbargo.id,
              motivation_id: motivationId,
              other_motivation: motivation?.other || null,
            },
            { transaction },
          );
        }
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

    const updatedThesis = await Thesis.findByPk(updatedThesisId);
    if (!updatedThesis) {
      throwHttp(404, 'Thesis not found after update');
    }

    const thesisSupervisors = await ThesisSupervisorCoSupervisor.findAll({
      where: { thesis_id: updatedThesis.id, scope: 'live' },
      attributes: ['teacher_id', 'is_supervisor'],
    });
    const thesisSdgs = await ThesisSustainableDevelopmentGoal.findAll({
      where: { thesis_id: updatedThesis.id },
      attributes: ['goal_id', 'sdg_level'],
    });
    const thesisKeywords = await ThesisKeyword.findAll({
      where: { thesis_id: updatedThesis.id },
      attributes: ['keyword_id', 'keyword_other'],
    });
    const thesisEmbargo = await ThesisEmbargo.findOne({
      where: { thesis_id: String(updatedThesis.id) },
      attributes: ['id', 'duration'],
    });

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
    res.status(error.status || 500).json({ error: error.message });
  }
};

const REQUIRED_RESUME_COLLEGIO_IDS = new Set(['CL003']);

const isResumeRequiredForStudent = async student => {
  const degreeProgramme = await sequelize.query(
    `
      SELECT d.id_collegio AS collegioId
      FROM degree_programme d
      WHERE d.id = :degreeId
      `,
    { replacements: { degreeId: student.degree_id }, type: QueryTypes.SELECT },
  );
  const collegioId = degreeProgramme?.[0]?.collegioId;
  return REQUIRED_RESUME_COLLEGIO_IDS.has(collegioId);
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

// Restituisce tutte le deadline della sessione di laurea più vicina in base al flag

const getSessionDeadlines = async (req, res) => {
  const requestedType = req.query.type;
  const now = new Date();

  const logged = await LoggedStudent.findOne();
  if (!logged) {
    return res.status(401).json({ error: 'No logged-in student found' });
  }

  const thesis = await Thesis.findOne({
    where: { student_id: logged.student_id },
  });

  const activeApplication = await ThesisApplication.findOne({
    where: {
      student_id: logged.student_id,
      status: { [Op.in]: ['pending', 'approved'] },
    },
    order: [['submission_date', 'DESC']],
  });

  let effectiveType = requestedType;
  if (thesis) effectiveType = 'thesis';
  else if (activeApplication) effectiveType = 'application';
  else effectiveType = 'no_application';

  let deadlineType;
  if (effectiveType === 'no_application') deadlineType = 'thesis_request';
  else if (effectiveType === 'application') deadlineType = 'conclusion_request';
  else if (effectiveType === 'thesis') deadlineType = 'final_exam_registration';
  else return res.status(400).json({ error: 'Invalid flag' });

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

  const query = {
    where: {
      deadline_type: deadlineType,
      deadline_date: { [Op.gte]: now },
    },
    order: [['deadline_date', 'ASC']],
    include: [
      {
        model: GraduationSession,
        as: 'graduation_session',
      },
    ],
  };

  const upcomingDeadlines = await Deadline.findAll(query);
  if (!upcomingDeadlines.length) {
    return res.status(404).json({ error: 'No upcoming deadline found for this flag' });
  }

  let refDeadline = upcomingDeadlines[0];
  if (shouldForceNextSession) {
    const firstSessionId =
      upcomingDeadlines[0].graduation_session_id ||
      (upcomingDeadlines[0].graduation_session && upcomingDeadlines[0].graduation_session.id);
    const nextSessionDeadline = upcomingDeadlines.find(
      d => (d.graduation_session_id || d.graduation_session?.id) !== firstSessionId,
    );
    if (nextSessionDeadline) {
      refDeadline = nextSessionDeadline;
    }
  }

  const sessionId =
    refDeadline.graduation_session_id || (refDeadline.graduation_session && refDeadline.graduation_session.id);
  if (!sessionId) {
    return res.status(500).json({ error: 'Graduation session not found for deadline' });
  }
  const sessionDeadlines = await Deadline.findAll({
    where: {
      graduation_session_id: sessionId,
    },
    include: [
      {
        model: GraduationSession,
        as: 'graduation_session',
      },
    ],
    order: [['deadline_date', 'ASC']],
  });
  return res.status(200).json({
    graduationSession: refDeadline.graduation_session,
    deadlines: sessionDeadlines,
  });
};

const uploadFinalThesis = async (req, res) => {
  try {
    const thesisFile = req.files?.thesisFile?.[0] || null;
    const thesisResume = req.files?.thesisResume?.[0] || null;
    const additionalZip = req.files?.additionalZip?.[0] || null;
    if (!thesisFile) {
      return res.status(400).json({ error: 'Missing thesis file' });
    }

    const logged = await LoggedStudent.findOne();
    if (!logged) {
      await fs.unlink(thesisFile.path).catch(() => {});
      if (thesisResume?.path) await fs.unlink(thesisResume.path).catch(() => {});
      if (additionalZip?.path) await fs.unlink(additionalZip.path).catch(() => {});
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const loggedStudent = await Student.findByPk(logged.student_id);
    if (!loggedStudent) {
      await fs.unlink(thesisFile.path).catch(() => {});
      if (thesisResume?.path) await fs.unlink(thesisResume.path).catch(() => {});
      if (additionalZip?.path) await fs.unlink(additionalZip.path).catch(() => {});
      return res.status(404).json({ error: 'Student not found' });
    }
    const requiredResume = await isResumeRequiredForStudent(loggedStudent);
    if (requiredResume && !thesisResume) {
      await fs.unlink(thesisFile.path).catch(() => {});
      if (additionalZip?.path) await fs.unlink(additionalZip.path).catch(() => {});
      return res.status(400).json({ error: 'Missing thesis resume file' });
    }

    const uploadBaseDir = path.join(__dirname, '..', '..', 'uploads', 'final_thesis', String(loggedStudent.id));
    await ensureDir(uploadBaseDir);
    const thesisPdfName = `final_thesis_${loggedStudent.id}.pdf`;
    const thesisPdfPath = path.join(uploadBaseDir, thesisPdfName);

    let thesisBuffer;
    try {
      thesisBuffer = await readAndValidatePdfA(thesisFile);
    } catch (error) {
      await fs.unlink(thesisFile.path).catch(() => {});
      if (thesisResume?.path) await fs.unlink(thesisResume.path).catch(() => {});
      if (additionalZip?.path) await fs.unlink(additionalZip.path).catch(() => {});
      return res.status(error.status || 500).json({ error: error.message });
    }
    await fs.writeFile(thesisPdfPath, thesisBuffer);
    await fs.unlink(thesisFile.path).catch(() => {});
    if (thesisResume?.path) {
      const resumePdfName = `final_resume_${loggedStudent.id}.pdf`;
      const resumePdfPath = path.join(uploadBaseDir, resumePdfName);
      let resumeBuffer;
      try {
        resumeBuffer = await readAndValidatePdfA(thesisResume);
      } catch (error) {
        await fs.unlink(thesisResume.path).catch(() => {});
        if (additionalZip?.path) await fs.unlink(additionalZip.path).catch(() => {});
        return res.status(error.status || 500).json({ error: error.message });
      }
      await fs.writeFile(resumePdfPath, resumeBuffer);
      await fs.unlink(thesisResume.path).catch(() => {});
    }
    if (additionalZip?.path) {
      const additionalZipName = `final_additional_${loggedStudent.id}.zip`;
      const additionalZipPath = path.join(uploadBaseDir, additionalZipName);
      await moveFile(additionalZip.path, additionalZipPath);
    }

    const result = await sequelize.transaction(async transaction => {
      const thesis = await Thesis.findOne({
        where: { student_id: loggedStudent.id },
        transaction,
      });
      if (!thesis) {
        return { status: 404, payload: { error: 'Thesis not found' } };
      }
      if (thesis.status !== 'final_exam') {
        return { status: 400, payload: { error: 'Thesis is not in a final exam state' } };
      }

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
        const resumePdfName = `final_resume_${loggedStudent.id}.pdf`;
        const resumePdfPath = path.join(uploadBaseDir, resumePdfName);
        thesis.thesis_resume = null;
        thesis.thesis_resume_path = path.relative(path.join(__dirname, '..', '..'), resumePdfPath);
      }
      if (additionalZip?.path) {
        const additionalZipName = `final_additional_${loggedStudent.id}.zip`;
        const additionalZipPath = path.join(uploadBaseDir, additionalZipName);
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
  try {
    const draftData = thesisConclusionDraftSchema.parse({
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
      thesisResume,
      thesisFile,
      additionalZip,
      removeThesisResume: req.body.removeThesisResume,
      removeThesisFile: req.body.removeThesisFile,
      removeAdditionalZip: req.body.removeAdditionalZip,
    });

    const logged = await LoggedStudent.findOne();
    if (!logged) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const loggedStudent = await Student.findByPk(logged.student_id);
    if (!loggedStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const baseUploadDir = path.join(__dirname, '..', '..');
    const draftUploadDir = path.join(baseUploadDir, 'uploads', 'thesis_conclusion_draft', String(loggedStudent.id));

    await sequelize.transaction(async transaction => {
      const thesis = await Thesis.findOne({
        where: { student_id: loggedStudent.id },
        transaction,
      });
      if (!thesis) {
        const err = new Error('Thesis not found');
        err.status = 404;
        throw err;
      }
      if (!['ongoing', 'conclusion_rejected'].includes(thesis.status)) {
        const err = new Error('No draft can be saved for current thesis status');
        err.status = 400;
        throw err;
      }

      const fieldsToSave = [];
      const setField = (field, value) => {
        if (value === undefined) return;
        thesis[field] = value;
        fieldsToSave.push(field);
      };

      const alignIfEnglish = value => (value === undefined ? undefined : (value ?? null));
      const normalizedTitle =
        draftData.language === 'en'
          ? alignIfEnglish(draftData.title ?? draftData.titleEng)
          : alignIfEnglish(draftData.title);
      const normalizedTitleEng =
        draftData.language === 'en'
          ? alignIfEnglish(draftData.title ?? draftData.titleEng)
          : alignIfEnglish(draftData.titleEng);
      const normalizedAbstract =
        draftData.language === 'en'
          ? alignIfEnglish(draftData.abstract ?? draftData.abstractEng)
          : alignIfEnglish(draftData.abstract);
      const normalizedAbstractEng =
        draftData.language === 'en'
          ? alignIfEnglish(draftData.abstract ?? draftData.abstractEng)
          : alignIfEnglish(draftData.abstractEng);

      setField('title', normalizedTitle);
      setField('title_eng', normalizedTitleEng);
      setField('abstract', normalizedAbstract);
      setField('abstract_eng', normalizedAbstractEng);
      setField('language', draftData.language);
      if (draftData.licenseId !== undefined) {
        setField('license_id', draftData.licenseId);
      }
      setField('thesis_draft_date', new Date());

      const removeStoredDraftFile = async thesisPathField => {
        if (!thesis[thesisPathField]) return;
        const storedRelativePath = await resolveValidDraftFilePath(thesis[thesisPathField], loggedStudent.id);
        if (!storedRelativePath) return;
        const storedAbsolutePath = path.join(baseUploadDir, storedRelativePath);
        await fs.unlink(storedAbsolutePath).catch(() => {});
        setField(thesisPathField, null);
      };

      const moveDraftFile = async (file, thesisPathField) => {
        if (!file?.path) return;
        await ensureDir(draftUploadDir);
        const safeName = path.basename(file.originalname || file.path);
        const destination = path.join(draftUploadDir, safeName);
        const storedRelativePath = await resolveValidDraftFilePath(thesis[thesisPathField], loggedStudent.id);
        if (storedRelativePath) {
          const storedAbsolutePath = path.join(baseUploadDir, storedRelativePath);
          if (path.resolve(storedAbsolutePath) !== path.resolve(destination)) {
            await fs.unlink(storedAbsolutePath).catch(() => {});
          }
        }
        await moveFile(file.path, destination);
        setField(thesisPathField, path.relative(baseUploadDir, destination));
      };

      if (draftData.removeThesisResume && !thesisResume) {
        await removeStoredDraftFile('thesis_resume_path');
      }
      if (draftData.removeThesisFile && !thesisFile) {
        await removeStoredDraftFile('thesis_file_path');
      }
      if (draftData.removeAdditionalZip && !additionalZip) {
        await removeStoredDraftFile('additional_zip_path');
      }

      await moveDraftFile(thesisResume, 'thesis_resume_path');
      await moveDraftFile(thesisFile, 'thesis_file_path');
      await moveDraftFile(additionalZip, 'additional_zip_path');

      if (fieldsToSave.length > 0) {
        await thesis.save({ transaction, fields: [...new Set(fieldsToSave)] });
      }

      if (draftData.coSupervisors !== undefined) {
        await ThesisSupervisorCoSupervisor.destroy({
          where: {
            thesis_id: thesis.id,
            is_supervisor: false,
            scope: 'draft',
          },
          transaction,
        });

        const draftCoSupervisorIds = (draftData.coSupervisors || [])
          .map(coSup => (typeof coSup === 'object' ? coSup.id : coSup))
          .filter(id => id !== null && id !== undefined);

        if (draftCoSupervisorIds.length > 0) {
          const teachers = await Teacher.findAll({
            where: { id: { [Op.in]: draftCoSupervisorIds } },
            transaction,
          });
          if (teachers.length !== draftCoSupervisorIds.length) {
            const err = new Error('One or more co-supervisors not found');
            err.status = 400;
            throw err;
          }
          await ThesisSupervisorCoSupervisor.bulkCreate(
            draftCoSupervisorIds.map(teacherId => ({
              thesis_id: thesis.id,
              teacher_id: teacherId,
              scope: 'draft',
              is_supervisor: false,
            })),
            { transaction },
          );
        }
      }

      if (draftData.sdgs !== undefined) {
        const normalizedSdgs = (draftData.sdgs || [])
          .map(goal => ({
            id: typeof goal === 'object' ? (goal.goalId ?? goal.id) : goal,
            level: typeof goal === 'object' ? goal.level : null,
          }))
          .filter(goal => Number.isFinite(Number(goal.id)));

        const uniqueGoalIds = [...new Set(normalizedSdgs.map(goal => Number(goal.id)))];
        if (uniqueGoalIds.length > 0) {
          const existingGoals = await SustainableDevelopmentGoal.findAll({
            where: { id: { [Op.in]: uniqueGoalIds } },
            transaction,
          });
          if (existingGoals.length !== uniqueGoalIds.length) {
            const err = new Error('One or more sustainable development goals not found');
            err.status = 400;
            throw err;
          }
        }

        await ThesisSustainableDevelopmentGoal.destroy({
          where: { thesis_id: thesis.id },
          transaction,
        });

        const dedupedByGoalId = new Map();
        for (const goal of normalizedSdgs) {
          const id = Number(goal.id);
          const previous = dedupedByGoalId.get(id);
          if (!previous || goal.level === 'primary') {
            dedupedByGoalId.set(id, {
              id,
              level: goal.level || 'secondary',
            });
          }
        }

        if (dedupedByGoalId.size > 0) {
          await ThesisSustainableDevelopmentGoal.bulkCreate(
            [...dedupedByGoalId.values()].map(goal => ({
              thesis_id: thesis.id,
              goal_id: goal.id,
              sdg_level: goal.level,
            })),
            { transaction },
          );
        }
      }
    });

    return res.status(200).json({ message: 'Draft saved successfully' });
  } catch (error) {
    if (thesisResume?.path) await fs.unlink(thesisResume.path).catch(() => {});
    if (thesisFile?.path) await fs.unlink(thesisFile.path).catch(() => {});
    if (additionalZip?.path) await fs.unlink(additionalZip.path).catch(() => {});
    if (error instanceof ZodError) {
      return res.status(400).json({ error: error.issues.map(issue => issue.message).join(', ') });
    }
    return res.status(error.status || 500).json({ error: error.message });
  }
};

const getThesisConclusionRequestDraft = async (req, res) => {
  try {
    const logged = await LoggedStudent.findOne();
    if (!logged) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const loggedStudent = await Student.findByPk(logged.student_id);
    if (!loggedStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const thesis = await Thesis.findOne({
      where: { student_id: loggedStudent.id },
    });
    if (!thesis) {
      return res.status(404).json({ error: 'Thesis not found' });
    }

    const draftCoSupervisors = await ThesisSupervisorCoSupervisor.findAll({
      where: {
        thesis_id: thesis.id,
        is_supervisor: false,
        scope: 'draft',
      },
      attributes: ['teacher_id'],
    });

    const draftCoSupervisorIds = draftCoSupervisors.map(item => item.teacher_id);
    const draftCoSupervisorTeachers =
      draftCoSupervisorIds.length > 0
        ? await Teacher.findAll({
            where: {
              id: {
                [Op.in]: draftCoSupervisorIds,
              },
            },
            attributes: selectTeacherAttributes(),
          })
        : [];

    const teacherById = new Map(draftCoSupervisorTeachers.map(teacher => [teacher.id, teacher]));
    const draftCoSupervisorsOverview = draftCoSupervisorIds
      .map(teacherId => teacherById.get(teacherId))
      .filter(Boolean)
      .map(teacher => teacherOverviewSchema.parse(teacher));

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
      coSupervisors: draftCoSupervisorsOverview,
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
