const { sequelize, ThesisApplicationSupervisorCoSupervisor } = require('../models');
const {
  ThesisApplication,
  ThesisApplicationStatusHistory,
  Thesis,
  ThesisSupervisorCoSupervisor,
} = require('../models');

const CLOSED_APPLICATION_STATUSES = new Set(['cancelled', 'rejected', 'approved']);

const getApplicationStatusValidationError = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) {
    return 'New status must be different from the current status';
  }

  if (CLOSED_APPLICATION_STATUSES.has(currentStatus)) {
    return 'Cannot update a closed application';
  }

  return null;
};

const createThesisFromApprovedApplication = async (application, transaction) => {
  const application_supervisors = await ThesisApplicationSupervisorCoSupervisor.findAll({
    where: { thesis_application_id: application.id },
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
    { transaction },
  );

  await ThesisSupervisorCoSupervisor.create(
    {
      thesis_id: newThesis.id,
      teacher_id: supervisor.teacher_id,
      is_supervisor: true,
    },
    { transaction },
  );

  for (const coSupervisor of co_supervisors) {
    await ThesisSupervisorCoSupervisor.create(
      {
        thesis_id: newThesis.id,
        teacher_id: coSupervisor.teacher_id,
        is_supervisor: false,
      },
      { transaction },
    );
  }

  return newThesis;
};

const rollbackTransactionSafely = async transaction => {
  if (!transaction) {
    return;
  }

  try {
    await transaction.rollback();
  } catch (rollbackError) {
    console.error('Error rolling back thesis application status transaction:', rollbackError);
  }
};

const updateThesisApplicationStatus = async (req, res) => {
  let t;
  try {
    const { id, new_status } = req.body;

    const application = await ThesisApplication.findByPk(id);
    if (!application) {
      return res.status(404).json({ error: 'Thesis application not found' });
    }

    const statusValidationError = getApplicationStatusValidationError(application.status, new_status);
    if (statusValidationError) {
      return res.status(400).json({ error: statusValidationError });
    }

    t = await sequelize.transaction();
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

    const payload = new_status === 'approved' ? await createThesisFromApprovedApplication(application, t) : application;

    await t.commit();
    return res.status(200).json(payload);
  } catch (error) {
    await rollbackTransactionSafely(t);
    console.error('Error updating thesis application status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const updateThesisConclusionStatus = async (req, res) => {
  try {
    const { thesisId, conclusionStatus } = req.body;

    const result = await sequelize.transaction(async t => {
      const thesis = await Thesis.findByPk(thesisId, { transaction: t });
      if (!thesis) {
        return { status: 404, payload: { error: 'Thesis not found' } };
      }

      if (thesis.status === conclusionStatus) {
        return { status: 400, payload: { error: 'New status must be different from the current status' } };
      }

      let isValidTransition = false;
      if (thesis.status === 'conclusion_requested') {
        isValidTransition = conclusionStatus === 'conclusion_approved' || conclusionStatus === 'ongoing';
      } else if (thesis.status === 'conclusion_approved') {
        isValidTransition = conclusionStatus === 'almalaurea';
      } else if (thesis.status === 'almalaurea') {
        isValidTransition = conclusionStatus === 'compiled_questionnaire';
      } else if (thesis.status === 'compiled_questionnaire') {
        isValidTransition = conclusionStatus === 'final_exam';
      } else if (thesis.status === 'final_exam') {
        isValidTransition = conclusionStatus === 'final_thesis';
      } else if (thesis.status === 'final_thesis') {
        isValidTransition = conclusionStatus === 'done' || conclusionStatus === 'ongoing';
      } else if (thesis.status === 'cancel_requested') {
        isValidTransition = conclusionStatus === 'cancel_approved' || conclusionStatus === 'ongoing';
      } else if (thesis.status === 'ongoing') {
        isValidTransition = conclusionStatus === 'cancel_requested' || conclusionStatus === 'conclusion_requested';
      } else {
        return { status: 400, payload: { error: 'Invalid current thesis status for conclusion update' } };
      }

      if (!isValidTransition) {
        return { status: 400, payload: { error: 'Invalid conclusion status transition' } };
      }

      await ThesisApplicationStatusHistory.create(
        {
          thesis_application_id: thesis.thesis_application_id,
          old_status: thesis.status,
          new_status: conclusionStatus,
        },
        { transaction: t },
      );

      thesis.status = conclusionStatus;
      if (conclusionStatus === 'conclusion_approved') {
        thesis.thesis_conclusion_confirmation_date = new Date();
      }
      await thesis.save({ transaction: t });

      return { status: 200, payload: thesis };
    });

    return res.status(result.status).json(result.payload);
  } catch (error) {
    console.error('Error updating thesis conclusion status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  updateThesisApplicationStatus,
  updateThesisConclusionStatus,
};
