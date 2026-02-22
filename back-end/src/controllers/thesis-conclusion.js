const { Op } = require('sequelize');
const { ZodError } = require('zod');
const path = require('node:path');

const {
  Thesis,
  ThesisSupervisorCoSupervisor,
  ThesisSustainableDevelopmentGoal,
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

const teacherOverviewSchema = require('../schemas/TeacherOverview');

const {
  ensureDirExists,
  moveFile,
  cleanupUploads,
  resolveValidDraftFilePath,
  safeUnlink,
} = require('../utils/uploads');
const { writeValidatedPdf } = require('../utils/pdfa');
const { isResumeRequiredForStudent } = require('../utils/requiredResume');
const {
  parseDraftRequestData,
  getLoggedStudentOrThrow,
  saveDraftTransaction,
} = require('../utils/thesisConclusionDraft');
const {
  parseConclusionRequestData,
  executeConclusionRequestTransaction,
  buildConclusionResponse,
} = require('../utils/thesisConclusionSubmit');

const sendThesisConclusionRequest = async (req, res) => {
  try {
    const files = {
      thesisResume: req.files?.thesisResume?.[0] || null,
      thesisFile: req.files?.thesisFile?.[0] || null,
      additionalZip: req.files?.additionalZip?.[0] || null,
    };
    const requestData = parseConclusionRequestData(req, files);

    const updatedThesisId = await sequelize.transaction(transaction =>
      executeConclusionRequestTransaction({
        requestData,
        files,
        transaction,
        baseUploadDir: path.join(__dirname, '..', '..'),
      }),
    );
    const validatedThesis = await buildConclusionResponse(updatedThesisId);

    return res.status(200).json(validatedThesis);
  } catch (error) {
    await cleanupUploads(
      req.files?.thesisFile?.[0] || null,
      req.files?.thesisResume?.[0] || null,
      req.files?.additionalZip?.[0] || null,
    );
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
