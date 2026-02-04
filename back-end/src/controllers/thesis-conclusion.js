const { Op } = require('sequelize');
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
  SustainableDevelopmentGoal,
  GraduationSession,
  Deadline,
  sequelize,
} = require('../models');

const selectLicenseAttributes = require('../utils/selectLicenseAttributes');
const selectMotivationAttributes = require('../utils/selectMotivationAttributes');
const { convertToPdfA } = require('../utils/pdfconverter');

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

const moveFile = async (fromPath, toPath) => {
  try {
    await fs.rename(fromPath, toPath);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    await fs.copyFile(fromPath, toPath);
    await fs.unlink(fromPath);
  }
};

const sendThesisConclusionRequest = async (req, res) => {
  const coSupervisors = parseJsonField(req.body.coSupervisors, null);
  const sdgs = parseJsonField(req.body.sdgs, null);
  const keywords = parseJsonField(req.body.keywords, null);
  const licenseId = req.body.licenseId ? Number(req.body.licenseId) : null;
  const embargo = parseJsonField(req.body.embargo, null);
  const thesisResume = req.files?.thesisResume?.[0] || null;
  const thesisFile = req.files?.thesisFile?.[0] || null;
  const additionalZip = req.files?.additionalZip?.[0] || null;
  const lang = req.body.language || 'it';
  const title = req.body.title || null;
  const abstract = req.body.abstract || null;
  let titleEng = req.body.titleEng || null;
  let abstractEng = req.body.abstractEng || null;
  const throwHttp = (status, message) => {
    const err = new Error(message);
    err.status = status;
    throw err;
  };
  try {
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
      if (thesis.thesis_status !== 'ongoing') {
        throwHttp(400, 'Thesis is not in an ongoing state');
      }

      if (!title || !abstract) {
        throwHttp(400, 'Missing thesis title or abstract');
      }

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

      if (!thesisResume || !thesisFile) {
        throwHttp(400, 'Missing files (thesisResume, thesisFile)');
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
      const thesisBuffer = await fs.readFile(thesisFile.path);
      const convertedPdfA = await convertToPdfA({
        buffer: thesisBuffer,
        filename: thesisFile.originalname || 'document.pdf',
      });
      await fs.writeFile(thesisPdfPath, convertedPdfA);
      await fs.unlink(thesisFile.path);
      if (coSupervisors) {
        const currentCoSupervisors = await ThesisSupervisorCoSupervisor.findAll({
          where: {
            thesis_id: thesis.id,
            is_supervisor: false,
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
              },
              { transaction },
            );
          }
        }
      }

      if (sdgs) {
        const normalizedSdgs = sdgs
          .map(goal => ({
            id: typeof goal === 'object' ? goal.id : goal,
            level: typeof goal === 'object' ? goal.level : null,
          }))
          .filter(goal => Number.isFinite(Number(goal.id)));
        const goalIds = normalizedSdgs.map(goal => Number(goal.id));
        const currentGoals = await SustainableDevelopmentGoal.findAll({
          where: {
            id: {
              [Op.in]: goalIds,
            },
          },
          transaction,
        });
        if (goalIds.length && currentGoals.length !== goalIds.length) {
          throwHttp(400, 'One or more sustainable development goals not found');
        }
        for (const goal of normalizedSdgs) {
          await ThesisSustainableDevelopmentGoal.create(
            {
              thesis_id: thesis.id,
              goal_id: Number(goal.id),
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
          const nk = await Keyword.create({ keyword: newKeyword, keyword_en: newKeyword }, { transaction });
          await ThesisKeyword.create(
            {
              thesis_id: thesis.id,
              keyword_id: nk.id,
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
          typeof m === 'object' ? { id: m.id, other: m.other } : { id: m, other: null },
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
      thesis.thesis_conclusion_request_date = new Date();
      thesis.thesis_status = 'conclusion_requested';
      await thesis.save({ transaction });
    });

    res.json({ message: 'Thesis conclusion request submitted successfully' });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
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

// Restituisce tutte le deadline della sessione di laurea più vicina in base al flag

const getSessionDeadlines = async (req, res) => {
  const type = req.query.type;
  const now = new Date();
  let deadlineType;
  if (type === 'no_application') deadlineType = 'thesis_request';
  else if (type === 'application') deadlineType = 'conclusion_request';
  else if (type === 'thesis') deadlineType = 'final_exam_registration';
  else return res.status(400).json({ error: 'Invalid flag' });

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

  const refDeadline = await Deadline.findOne(query);
  if (!refDeadline) {
    return res.status(404).json({ error: 'No upcoming deadline found for this flag' });
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
  if (thesis.thesis_status !== 'final_thesis') {
    return res.status(400).json({ error: 'Thesis is not in a final thesis state' });
  }

  const uploadBaseDir = path.join(__dirname, '..', '..', 'uploads', 'final_thesis', String(loggedStudent.id));
  await ensureDir(uploadBaseDir);
  const thesisFile = req.file || null;
  if (!thesisFile) {
    return res.status(400).json({ error: 'Missing thesis file' });
  }
  const thesisPdfName = `final_thesis_${loggedStudent.id}.pdf`;
  const thesisPdfPath = path.join(uploadBaseDir, thesisPdfName);
  const thesisBuffer = await fs.readFile(thesisFile.path);
  const convertedPdfA = await convertToPdfA({
    buffer: thesisBuffer,
    filename: thesisFile.originalname || 'document.pdf',
  });
  await fs.writeFile(thesisPdfPath, convertedPdfA);
  await fs.unlink(thesisFile.path);
  thesis.thesis_file = null;
  thesis.thesis_file_path = path.relative(path.join(__dirname, '..', '..'), thesisPdfPath);
  thesis.thesis_status = 'done';
  await thesis.save();
  res.status(200).json({ message: 'Final thesis uploaded successfully' });
};

module.exports = {
  sendThesisConclusionRequest,
  getSustainableDevelopmentGoals,
  getAvailableLicenses,
  getEmbargoMotivations,
  getSessionDeadlines,
  uploadFinalThesis,
};
