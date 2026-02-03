const { sequelize, ThesisApplicationSupervisorCoSupervisor } = require('../models');
const {
  ThesisApplication,
  ThesisApplicationStatusHistory,
  Thesis,
  ThesisSupervisorCoSupervisor,
} = require('../models');

const updateThesisApplicationStatus = async (req, res) => {
  try {
    // Example logic to update a thesis application
    const { id, new_status } = req.body;

    const application = await ThesisApplication.findByPk(id);
    if (!application) {
      return res.status(404).json({ error: 'Thesis application not found' });
    }
    if (application.status === new_status) {
      return res.status(400).json({ error: 'New status must be different from the current status' });
    } else if (
      application.status === 'cancelled' ||
      application.status === 'rejected' ||
      application.status === 'approved'
    ) {
      return res.status(400).json({ error: 'Cannot update a closed application' });
    }
    const t = await sequelize.transaction();
    await ThesisApplicationStatusHistory.create(
      {
        thesis_application_id: id,
        old_status: application.status,
        new_status: new_status,
      },
      { transaction: t },
    );
    application.status = new_status;
    await application.save({ transaction: t });
    if (new_status === 'approved') {
      const application_supervisors = await ThesisApplicationSupervisorCoSupervisor.findAll({
        where: { thesis_application_id: id },
      });

      const supervisor = application_supervisors.find(sup => sup.is_supervisor);
      const co_supervisors = application_supervisors.filter(sup => !sup.is_supervisor);
      const newThesis = await Thesis.create(
        {
          student_id: application.student_id,
          company_id: application.company_id,
          topic: application.topic,
          thesis_application_id: application.id,
        },
        { transaction: t },
      );

      const supervisorEntry = {
        thesis_id: newThesis.id,
        teacher_id: supervisor.teacher_id,
        is_supervisor: true,
      };
      await ThesisSupervisorCoSupervisor.create(supervisorEntry, { transaction: t });

      if (co_supervisors && co_supervisors.length > 0) {
        for (const coSupervisor of co_supervisors) {
          const coSupervisorEntry = {
            thesis_id: newThesis.id,
            teacher_id: coSupervisor.teacher_id,
            is_supervisor: false,
          };
          await ThesisSupervisorCoSupervisor.create(coSupervisorEntry, { transaction: t });
        }
      }
      res.status(200).json(newThesis);
    } else {
      res.status(200).json(application);
    }
    await t.commit();
  } catch (error) {
    console.error('Error updating thesis application status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateThesisConclusionStatus = async (req, res) => {
  try {
    const { thesisId, conclusionStatus } = req.body;

    const thesis = await Thesis.findByPk(thesisId);
    if (!thesis) {
      return res.status(404).json({ error: 'Thesis not found' });
    }

    if (thesis.thesis_status === conclusionStatus) {
      return res.status(400).json({ error: 'New status must be different from the current status' });
    }

    // Update thesis status
    if (thesis.thesis_status === 'conclusion_requested') {
      switch (conclusionStatus) {
        case 'conclusion_approved':
        case 'conclusion_rejected':
          thesis.thesis_status = conclusionStatus;
          if (conclusionStatus === 'conclusion_approved') {
            thesis.thesis_conclusion_confirmation_date = new Date();
          }
          await thesis.save();
          return res.status(200).json(thesis);
        default:
          return res.status(400).json({ error: 'Invalid conclusion status transition' });
      }
    } else if (thesis.thesis_status === 'conclusion_approved') {
      switch (conclusionStatus) {
        case 'almalaurea':
          thesis.thesis_status = conclusionStatus;
          await thesis.save();
          return res.status(200).json(thesis);
        default:
          return res.status(400).json({ error: 'Invalid conclusion status transition' });
      }
    } else if (thesis.thesis_status === 'almalaurea') {
      switch (conclusionStatus) {
        case 'final_exam':
          thesis.thesis_status = conclusionStatus;
          await thesis.save();
          return res.status(200).json(thesis);
        default:
          return res.status(400).json({ error: 'Invalid conclusion status transition' });
      }
    } else if (thesis.thesis_status === 'final_exam') {
      switch (conclusionStatus) {
        case 'final_thesis':
          thesis.thesis_status = conclusionStatus;
          await thesis.save();
          return res.status(200).json(thesis);
        default:
          return res.status(400).json({ error: 'Invalid conclusion status transition' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid current thesis status for conclusion update' });
    }
  } catch (error) {
    console.error('Error updating thesis conclusion status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  updateThesisApplicationStatus,
  updateThesisConclusionStatus,
};
