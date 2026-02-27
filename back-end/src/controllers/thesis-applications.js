const { Op } = require('sequelize');
const { z } = require('zod');
const {
  sequelize,
  Teacher,
  LoggedStudent,
  Student,
  Company,
  ThesisProposal,
  ThesisApplication,
  ThesisApplicationSupervisorCoSupervisor,
  ThesisApplicationStatusHistory,
  Thesis,
} = require('../models');

const thesisApplicationRequestSchema = require('../schemas/ThesisApplicationRequest');
const thesisApplicationResponseSchema = require('../schemas/ThesisApplicationResponse');
const selectTeacherAttributes = require('../utils/selectTeacherAttributes');
const thesisApplicationStatusHistorySchema = require('../schemas/ThesisApplicationStatusHistory');
const thesisApplicationSchema = require('../schemas/ThesisApplication');
const toSnakeCase = require('../utils/snakeCase');

const createThesisApplication = async (req, res) => {
  try {
    await sequelize.transaction(async t => {
      // 0. Get logged student
      const logged = await LoggedStudent.findOne();
      if (!logged?.student_id) {
        return res.status(401).json({ error: 'No logged-in student found' });
      }

      const loggedStudent = await Student.findByPk(logged.student_id);
      if (!loggedStudent) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const application_data = toSnakeCase(req.body);
      const applicationData = await thesisApplicationRequestSchema.parseAsync(application_data);

      // 1. Fetch Supervisor & Co-Supervisors
      const supervisor = await Teacher.findByPk(applicationData.supervisor.id, {
        attributes: selectTeacherAttributes(true),
      });
      if (!supervisor) {
        return res.status(400).json({ error: 'Supervisor not found' });
      }

      const coSupervisorsData = [];
      for (const coSup of applicationData.co_supervisors || []) {
        const coSupervisor = await Teacher.findByPk(coSup.id, {
          attributes: selectTeacherAttributes(true),
        });
        if (!coSupervisor) {
          return res.status(400).json({ error: `Co-Supervisor with id ${coSup.id} not found` });
        }
        coSupervisorsData.push(coSupervisor);
      }

      //Check if thesis proposal exists
      if (applicationData.thesis_proposal) {
        const proposal = await ThesisProposal.findByPk(applicationData.thesis_proposal.id);
        if (!proposal) {
          return res.status(400).json({ error: 'Thesis proposal not found' });
        }
      }

      if (applicationData.company) {
        const company = await Company.findByPk(applicationData.company.id);
        if (!company) {
          return res.status(400).json({ error: 'Company not found' });
        }
      }

      // 2. Check if student is eligible to apply
      const existingApplications = await ThesisApplication.findAll({
        where: {
          student_id: loggedStudent.id,
          status: { [Op.in]: ['pending', 'approved'] },
        },
      });

      const hasPendingApplication = existingApplications.some(app => app.status === 'pending');
      if (hasPendingApplication) {
        return res.status(400).json({ error: 'Student already has an active thesis application' });
      }

      const approvedApplications = existingApplications.filter(app => app.status === 'approved');
      for (const approvedApplication of approvedApplications) {
        const linkedThesis = await Thesis.findOne({
          where: { thesis_application_id: approvedApplication.id },
        });

        if (linkedThesis?.status !== 'cancel_approved') {
          return res.status(400).json({ error: 'Student already has an active thesis application' });
        }
      }

      // 3. Create ThesisApplication
      const submissionDate = new Date();
      const newApplication = await ThesisApplication.create(
        {
          topic: applicationData.topic,
          student_id: loggedStudent.id,
          thesis_proposal_id: applicationData.thesis_proposal?.id || null,
          company_id: applicationData.company?.id || null,
          status: 'pending',
          submission_date: submissionDate,
        },
        { transaction: t },
      );

      // Link Supervisors
      const supervisorLinks = [
        { teacher_id: applicationData.supervisor.id, thesis_application_id: newApplication.id, is_supervisor: true },
        ...(applicationData.co_supervisors || []).map(s => ({
          teacher_id: s.id,
          thesis_application_id: newApplication.id,
          is_supervisor: false,
        })),
      ];
      await ThesisApplicationSupervisorCoSupervisor.bulkCreate(supervisorLinks, { transaction: t });

      // 5. History
      await ThesisApplicationStatusHistory.create(
        {
          thesis_application_id: newApplication.id,
          old_status: null,
          new_status: 'pending',
          change_date: submissionDate,
        },
        { transaction: t },
      );

      // 6. Response
      const responsePayload = toSnakeCase({
        id: newApplication.id,
        topic: newApplication.topic,
        supervisor: supervisor.get({ plain: true }),
        co_supervisors: coSupervisorsData.filter(Boolean).map(s => s.get({ plain: true })),
        company: applicationData.company || null,
        submission_date: submissionDate.toISOString(),
        thesis_proposal: applicationData.thesis_proposal || null,
        status: 'pending',
      });

      const validatedResponse = await thesisApplicationResponseSchema.parseAsync(responsePayload);
      res.status(201).json(validatedResponse);
    });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ error: error.message || error.errors });
  }
};

const checkStudentEligibility = async (req, res) => {
  try {
    const logged = await LoggedStudent.findOne();
    if (!logged?.student_id) {
      return res.status(401).json({ error: 'No logged-in student found' });
    }
    const student = await Student.findByPk(logged.student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const pendingCount = await ThesisApplication.count({
      where: {
        student_id: student.id,
        status: { [Op.in]: ['pending'] },
      },
    });
    if (pendingCount > 0) {
      return res.status(200).json({ studentId: logged.student_id, eligible: false });
    }
    const approvedCount = await ThesisApplication.findAll({
      where: {
        student_id: student.id,
        status: { [Op.in]: ['approved'] },
      },
    });
    for (const app of approvedCount) {
      const thesis = await Thesis.findOne({
        where: {
          thesis_application_id: app.id,
        },
      });
      if (thesis?.status !== 'cancel_approved') {
        return res.status(200).json({ studentId: logged.student_id, eligible: false });
      }
    }

    res.status(200).json({ studentId: logged.student_id, eligible: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getLastStudentApplication = async (req, res) => {
  try {
    const logged = await LoggedStudent.findOne();
    if (!logged) {
      return res.status(401).json({ error: 'No logged-in student found' });
    }
    const loggedStudent = await Student.findByPk(logged.student_id);
    if (!loggedStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const activeApplication = await ThesisApplication.findAll({
      where: {
        student_id: loggedStudent.id,
      },
      order: [['submission_date', 'DESC']],
      limit: 1,
      include: [{ model: Company, as: 'company' }],
    });

    if (activeApplication.length === 0) {
      return res.status(404).json({ error: 'No active application found for the student' });
    }

    const app = activeApplication[0];

    // Fetch proposal if exists
    let proposalData = null;
    if (app.thesis_proposal_id) {
      const proposal = await ThesisProposal.findByPk(app.thesis_proposal_id);
      if (proposal) {
        proposalData = proposal.toJSON();
      }
    }

    // Fetch supervisor and co-supervisors
    const supervisorLinks = await ThesisApplicationSupervisorCoSupervisor.findAll({
      where: { thesis_application_id: app.id },
    });

    let supervisorData = null;
    const coSupervisorsData = [];

    for (const link of supervisorLinks) {
      const teacher = await Teacher.findByPk(link.teacher_id, {
        attributes: selectTeacherAttributes(true),
      });
      if (teacher) {
        if (link.is_supervisor) {
          supervisorData = teacher;
        } else {
          coSupervisorsData.push(teacher);
        }
      }
    }

    const responsePayload = {
      id: app.id,
      topic: app.topic,
      student: loggedStudent,
      supervisor: supervisorData,
      co_supervisors: coSupervisorsData,
      company: app.company,
      thesis_proposal: proposalData,
      submission_date: app.submission_date.toISOString(),
      status: app.status || 'pending',
    };

    const activeAppJson = thesisApplicationResponseSchema.parse(responsePayload);

    res.status(200).json(activeAppJson);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const getStatusHistoryApplication = async (req, res) => {
  try {
    const applicationId = req.query.applicationId;
    if (!applicationId) {
      return res.status(400).json({ error: 'Missing applicationId parameter' });
    }

    const statusHistory = await ThesisApplicationStatusHistory.findAll({
      where: { thesis_application_id: applicationId },
      order: [['change_date', 'ASC']],
    });

    const historyResponse = statusHistory.map(record => {
      return thesisApplicationStatusHistorySchema.parse(record.toJSON());
    });

    res.status(200).json(historyResponse);
  } catch (error) {
    console.error('Error fetching status history of thesis application:', error);
    res.status(500).json({ error: error.message });
  }
};

const getAllThesisApplications = async (req, res) => {
  try {
    const [students, allApplications] = await Promise.all([
      Student.findAll(),
      ThesisApplication.findAll({
        order: [['submission_date', 'DESC']],
      }),
    ]);

    const studentById = new Map(students.map(student => [student.id, student]));
    const applicationIds = allApplications.map(app => app.id);
    const proposalIds = [...new Set(allApplications.map(app => app.thesis_proposal_id).filter(Boolean))];
    const companyIds = [...new Set(allApplications.map(app => app.company_id).filter(Boolean))];

    const [proposals, supervisorLinks, companies] = await Promise.all([
      proposalIds.length
        ? ThesisProposal.findAll({
            where: { id: { [Op.in]: proposalIds } },
          })
        : [],
      applicationIds.length
        ? ThesisApplicationSupervisorCoSupervisor.findAll({
            where: { thesis_application_id: { [Op.in]: applicationIds } },
          })
        : [],
      companyIds.length
        ? Company.findAll({
            where: { id: { [Op.in]: companyIds } },
          })
        : [],
    ]);

    const proposalById = new Map(proposals.map(proposal => [proposal.id, proposal]));
    const companyById = new Map(companies.map(company => [company.id, company]));

    const teacherIds = [...new Set(supervisorLinks.map(link => link.teacher_id))];
    const teachers = teacherIds.length
      ? await Teacher.findAll({
          where: { id: { [Op.in]: teacherIds } },
          attributes: selectTeacherAttributes(true),
        })
      : [];
    const teacherById = new Map(teachers.map(teacher => [teacher.id, teacher]));

    const linksByApplicationId = new Map();
    for (const link of supervisorLinks) {
      if (!linksByApplicationId.has(link.thesis_application_id)) {
        linksByApplicationId.set(link.thesis_application_id, []);
      }
      linksByApplicationId.get(link.thesis_application_id).push(link);
    }

    const applicationsResponse = [];

    for (const app of allApplications) {
      let proposalData = null;
      if (app.thesis_proposal_id) {
        const proposal = proposalById.get(app.thesis_proposal_id);
        if (!proposal) {
          return res.status(400).json({ error: `Thesis proposal with id ${app.thesis_proposal_id} not found` });
        }
        proposalData = proposal.toJSON();
      }

      const company = app.company_id ? companyById.get(app.company_id) : null;
      if (app.company_id && !company) {
        return res.status(400).json({ error: `Company with id ${app.company_id} not found` });
      }

      const links = linksByApplicationId.get(app.id) || [];
      let supervisorData = null;
      const coSupervisorsData = [];

      for (const link of links) {
        const teacher = teacherById.get(link.teacher_id);
        if (!teacher) {
          return res.status(400).json({ error: `Teacher with id ${link.teacher_id} not found` });
        }
        if (link.is_supervisor) supervisorData = teacher;
        else coSupervisorsData.push(teacher);
      }

      const responsePayload = {
        id: app.id,
        topic: app.topic,
        student: studentById.get(app.student_id) || null,
        supervisor: supervisorData,
        co_supervisors: coSupervisorsData,
        company: company || null,
        thesis_proposal: proposalData,
        submission_date: app.submission_date.toISOString(),
        status: app.status || 'pending',
      };

      applicationsResponse.push(thesisApplicationSchema.parse(responsePayload));
    }

    return res.status(200).json(applicationsResponse);
  } catch (error) {
    console.error('Error fetching all thesis applications:', error);
    return res.status(500).json({ error: error.message });
  }
};

const cancelThesisApplication = async (req, res) => {
  try {
    const { id } = req.body;

    const application = await ThesisApplication.findByPk(id);
    if (!application) {
      return res.status(404).json({ error: 'Thesis application not found' });
    }
    if (application.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending applications can be cancelled' });
    }

    await ThesisApplicationStatusHistory.create({
      thesis_application_id: id,
      old_status: application.status,
      new_status: 'cancelled',
    });
    application.status = 'cancelled';
    await application.save();
    const updatedApplication = await ThesisApplication.findByPk(id);

    res.status(200).json(updatedApplication);
  } catch (error) {
    console.error('Error updating thesis application status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createThesisApplication,
  checkStudentEligibility,
  getLastStudentApplication,
  getAllThesisApplications,
  getStatusHistoryApplication,
  cancelThesisApplication,
};
