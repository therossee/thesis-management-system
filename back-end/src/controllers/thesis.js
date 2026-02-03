const {
  sequelize,
  Thesis,
  ThesisSupervisorCoSupervisor,
  Teacher,
  Student,
  LoggedStudent,
  ThesisApplicationStatusHistory,
  Company,
} = require('../models');
const thesisSchema = require('../schemas/Thesis');
const toSnakeCase = require('../utils/snakeCase');

// ==========================================
// CONTROLLERS
// ==========================================
const getLoggedStudentThesis = async (req, res) => {
  try {
    const logged = await LoggedStudent.findOne();
    if (!logged) {
      return res.status(401).json({ error: 'No logged-in student found' });
    }
    const loggedStudent = await Student.findByPk(logged.student_id);

    const thesisData = await Thesis.findOne({
      where: {
        student_id: loggedStudent.id,
      },
    });

    if (!thesisData) {
      return res.status(404).json({ message: 'Thesis not found for the logged-in student.' });
    }

    // Fetch supervisor and co-supervisors
    const supervisorLinks = await ThesisSupervisorCoSupervisor.findAll({
      where: { thesis_id: thesisData.id },
    });

    const selectTeacherAttributes = require('../utils/selectTeacherAttributes');

    let supervisorData = null;
    const coSupervisorsData = [];

    for (const link of supervisorLinks) {
      const teacher = await Teacher.findByPk(link.teacher_id, {
        attributes: selectTeacherAttributes(true),
      });
      if (teacher) {
        if (link.is_supervisor) {
          supervisorData = teacher.toJSON();
        } else {
          coSupervisorsData.push(teacher.toJSON());
        }
      }
    }

    // Fetch student
    const studentData = await Student.findByPk(thesisData.student_id);

    // Fetch company if exists
    let companyData = null;
    if (thesisData.company_id) {
      companyData = await Company.findByPk(thesisData.company_id);
    }

    const statusHistoryRecords = await ThesisApplicationStatusHistory.findAll({
      where: { thesis_application_id: thesisData.thesis_application_id },
    });
    const statusHistoryData = statusHistoryRecords.map(r => r.toJSON());

    const responsePayload = toSnakeCase({
      id: thesisData.id,
      topic: thesisData.topic,
      student: studentData ? studentData.toJSON() : null,
      title: thesisData.title,
      title_eng: thesisData.title_eng,
      abstract: thesisData.abstract,
      abstract_eng: thesisData.abstract_eng,
      supervisor: supervisorData,
      co_supervisors: coSupervisorsData,
      company: companyData ? companyData.toJSON() : null,
      application_status_history: statusHistoryData,
      thesis_status: thesisData.thesis_status,
      thesis_start_date: thesisData.thesis_start_date.toISOString(),
      thesis_conclusion_request_date: thesisData.thesis_conclusion_request_date
        ? thesisData.thesis_conclusion_request_date.toISOString()
        : null,
      thesis_conclusion_confirmation_date: thesisData.thesis_conclusion_confirmation_date
        ? thesisData.thesis_conclusion_confirmation_date.toISOString()
        : null,
    });

    const thesisResponse = thesisSchema.parse(responsePayload);
    return res.status(200).json(thesisResponse);
  } catch (error) {
    console.error('Error fetching student thesis:', error);
    console.error(error?.stack);
    return res.status(500).json({ error: 'An error occurred while fetching the thesis.' });
  }
};

const createStudentThesis = async (req, res) => {
  try {
    const logged = await LoggedStudent.findOne();
    if (!logged) {
      return res.status(401).json({ error: 'No logged-in student found' });
    }
    const loggedStudent = await Student.findByPk(logged.student_id);

    const thesis_data = toSnakeCase(req.body);
    console.log('Creating thesis with data: ' + JSON.stringify(thesis_data, null, 2));

    const t = await sequelize.transaction();

    const newThesis = await Thesis.create(
      {
        student_id: loggedStudent.id,
        company_id: thesis_data.company ? thesis_data.company.id : null,
        topic: thesis_data.topic,
        thesis_application_id: thesis_data.thesis_application_id,
      },
      { transaction: t },
    );

    const supervisorEntry = {
      thesis_id: newThesis.id,
      teacher_id: thesis_data.supervisor.id,
      is_supervisor: true,
    };
    await ThesisSupervisorCoSupervisor.create(supervisorEntry, { transaction: t });

    if (thesis_data.co_supervisors && thesis_data.co_supervisors.length > 0) {
      for (const coSupervisor of thesis_data.co_supervisors) {
        const coSupervisorEntry = {
          thesis_id: newThesis.id,
          teacher_id: coSupervisor.id,
          is_supervisor: false,
        };
        await ThesisSupervisorCoSupervisor.create(coSupervisorEntry, { transaction: t });
      }
    }

    await t.commit();

    // Fetch complete thesis data with all relations
    const completeThesis = await Thesis.findByPk(newThesis.id);

    // Fetch supervisor and co-supervisors
    const supervisorLinks = await ThesisSupervisorCoSupervisor.findAll({
      where: { thesis_id: newThesis.id },
    });

    const selectTeacherAttributes = require('../utils/selectTeacherAttributes');

    let supervisorData = null;
    const coSupervisorsData = [];

    for (const link of supervisorLinks) {
      const teacher = await Teacher.findByPk(link.teacher_id, {
        attributes: selectTeacherAttributes(true),
      });
      if (teacher) {
        if (link.is_supervisor) {
          supervisorData = teacher.toJSON();
        } else {
          coSupervisorsData.push(teacher.toJSON());
        }
      }
    }

    // Fetch student
    const studentData = await Student.findByPk(completeThesis.student_id);

    const responsePayload = {
      id: completeThesis.id,
      topic: completeThesis.topic,
      student: studentData ? studentData.toJSON() : null,
      supervisor: supervisorData,
      co_supervisors: coSupervisorsData,
      company: thesis_data.company ? thesis_data.company.toJSON() : null,
      thesis_start_date: completeThesis.thesis_start_date.toISOString(),
      thesis_conclusion_request_date: completeThesis.thesis_conclusion_request_date,
      thesis_conclusion_confirmation_date: completeThesis.thesis_conclusion_confirmation_date,
    };

    const thesisResponse = thesisSchema.parse(responsePayload);
    return res.status(201).json(thesisResponse);
  } catch (error) {
    console.error('Error creating student thesis:', error);
    console.error(error?.stack);
    return res.status(500).json({ error: 'An error occurred while creating the thesis.' });
  }
};

//debugging purpose
const getAllTheses = async (req, res) => {
  try {
    const theses = await Thesis.findAll();
    return res.status(200).json(theses);
  } catch (error) {
    console.error('Error fetching all theses:', error);
    return res.status(500).json({ error: 'An error occurred while fetching all theses.' });
  }
};

module.exports = {
  getLoggedStudentThesis,
  createStudentThesis,
  getAllTheses,
};
