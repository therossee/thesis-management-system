const { Op } = require('sequelize');
const {
    Thesis,
    Keyword,
    Teacher,
    Student,
    Embargo,
    License,
    sequelize,
    LoggedStudent,
    SustainableDevelopmentGoal,
    ThesisSupervisorCoSupervisor
} = require('../models');

const selectLicenseAttributes = require('../utils/selectLicenseAttributes');
const embargoMotivation = require('../models/embargo-motivation');
const { get } = require('lodash');

const sendThesisConclusionRequest = async (req, res) => {
  try {
    const logged = await LoggedStudent.findOne();
    if (!logged) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const loggedStudent = await Student.findByPk(logged.studentId);
    if (!loggedStudent) {
        return res.status(404).json({ error: 'Student not found' });
    }
    const thesis = await Thesis.findOne({
        where: { student_id: loggedStudent.id },
    });
    if (!thesis) {
        return res.status(404).json({ error: 'Thesis not found' });
    }
    if (thesis.status !== 'ongoing' && thesis.status !== 'conclusion_rejected') {
        return res.status(400).json({ error: 'Thesis is not in a state that allows conclusion request' });
    }
    
    // Here you would handle the uploaded files and other data from req.body
    // For simplicity, we will just update the thesis status
    thesis.status = 'conclusion_requested';
    if (req.body.coSupervisors) {
        const co_supervisors = await Teacher.findAll({
            where: {
                id: {
                    [Op.in]: req.body.coSupervisors.map(coSup => coSup.id),
                },
            },
        });
        if (co_supervisors.length !== req.body.coSupervisors.length) {
            return res.status(400).json({ error: 'One or more co-supervisors not found' });
        }
        for (const coSup of co_supervisors) {
            await ThesisSupervisorCoSupervisor.create({
                thesis_id: thesis.id,
                teacher_id: coSup.id,
                is_supervisor: false,
            });
        }
    }
    await thesis.save();

    res.json({ message: 'Thesis conclusion request submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
        // Assuming deadlines are stored in a Deadlines model
        const motivations = await embargoMotivation.findAll({
            attributes: selectMotivationAttributes(req.query.lang || 'it'),
        });
        res.status(200).json(motivations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
 

module.exports = {
    sendThesisConclusionRequest,
    getSustainableDevelopmentGoals,
    getAvailableLicenses,
    getEmbargoMotivations,
};