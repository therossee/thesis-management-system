require('jest');

const {
  updateThesisApplicationStatus,
  updateThesisConclusionStatus,
} = require('../../src/controllers/test-controller');
const {
  ThesisApplication,
  ThesisApplicationStatusHistory,
  ThesisApplicationSupervisorCoSupervisor,
  Thesis,
  ThesisSupervisorCoSupervisor,
  sequelize,
} = require('../../src/models');

jest.mock('../../src/models', () => ({
  ThesisApplication: { findByPk: jest.fn() },
  ThesisApplicationStatusHistory: { create: jest.fn() },
  ThesisApplicationSupervisorCoSupervisor: { findAll: jest.fn() },
  Thesis: { create: jest.fn(), findByPk: jest.fn() },
  ThesisSupervisorCoSupervisor: { create: jest.fn() },
  sequelize: { transaction: jest.fn() },
}));

describe('updateThesisApplicationStatus', () => {
  let req;
  let res;
  let t;

  beforeEach(() => {
    // Res mock
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    t = { commit: jest.fn(), rollback: jest.fn() };
    sequelize.transaction.mockResolvedValue(t);

    req = { body: {} };

    jest.clearAllMocks();
  });

  describe('Error cases', () => {
    test('should return 404 if application not found', async () => {
      ThesisApplication.findByPk.mockResolvedValue(null);
      req.body = { id: 1, new_status: 'pending' };

      await updateThesisApplicationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Thesis application not found' });
    });

    test('should return 400 if new status is same as current', async () => {
      ThesisApplication.findByPk.mockResolvedValue({ id: 1, status: 'pending' });
      req.body = { id: 1, new_status: 'pending' };

      await updateThesisApplicationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'New status must be different from the current status' });
    });

    test('should return 400 if application is closed', async () => {
      ThesisApplication.findByPk.mockResolvedValue({ id: 1, status: 'cancelled' });
      req.body = { id: 1, new_status: 'pending' };

      await updateThesisApplicationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cannot update a closed application' });
    });
  });

  describe('Success cases', () => {
    test('should update status and create Thesis if new status is approved', async () => {
      const application = { id: 1, status: 'pending', student_id: 10, company_id: 20, topic: 'AI', save: jest.fn() };
      ThesisApplication.findByPk.mockResolvedValue(application);
      req.body = { id: 1, new_status: 'approved' };

      ThesisApplicationSupervisorCoSupervisor.findAll.mockResolvedValue([
        { is_supervisor: true, teacher_id: 1 },
        { is_supervisor: false, teacher_id: 2 },
      ]);

      const newThesis = { id: 100 };
      Thesis.create.mockResolvedValue(newThesis);

      await updateThesisApplicationStatus(req, res);

      expect(ThesisApplicationStatusHistory.create).toHaveBeenCalledWith(
        { thesis_application_id: 1, old_status: 'pending', new_status: 'approved' },
        { transaction: t },
      );
      expect(application.save).toHaveBeenCalledWith({ transaction: t });
      expect(Thesis.create).toHaveBeenCalled();
      expect(ThesisSupervisorCoSupervisor.create).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(newThesis);
      expect(t.commit).toHaveBeenCalled();
    });

    test('should update status and return application if new status is not approved', async () => {
      const application = { id: 1, status: 'pending', save: jest.fn() };
      ThesisApplication.findByPk.mockResolvedValue(application);
      req.body = { id: 1, new_status: 'rejected' };

      await updateThesisApplicationStatus(req, res);

      expect(application.save).toHaveBeenCalledWith({ transaction: t });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(application);
      expect(t.commit).toHaveBeenCalled();
    });
  });

  describe('Unexpected errors', () => {
    test('should return 500 on database error', async () => {
      ThesisApplication.findByPk.mockRejectedValue(new Error('DB Error'));
      req.body = { id: 1, new_status: 'rejected' };

      await updateThesisApplicationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});

describe('updateThesisConclusionStatus', () => {
  let req;
  let res;
  let t;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    req = { body: { thesisId: 10, conclusionStatus: 'conclusion_requested' } };
    t = {};
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(async cb => cb(t));
  });

  const buildThesis = status => ({
    id: 10,
    thesis_application_id: 5,
    status,
    thesis_conclusion_confirmation_date: null,
    save: jest.fn().mockResolvedValue(undefined),
  });

  test('should return 404 if thesis is not found', async () => {
    Thesis.findByPk.mockResolvedValue(null);

    await updateThesisConclusionStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Thesis not found' });
  });

  test('should return 400 if new status matches current status', async () => {
    Thesis.findByPk.mockResolvedValue(buildThesis('ongoing'));
    req.body.conclusionStatus = 'ongoing';

    await updateThesisConclusionStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'New status must be different from the current status' });
  });

  test('should return 400 for invalid current thesis status', async () => {
    Thesis.findByPk.mockResolvedValue(buildThesis('done'));
    req.body.conclusionStatus = 'ongoing';

    await updateThesisConclusionStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid current thesis status for conclusion update' });
  });

  test('should return 400 for invalid status transition', async () => {
    Thesis.findByPk.mockResolvedValue(buildThesis('ongoing'));
    req.body.conclusionStatus = 'final_exam';

    await updateThesisConclusionStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid conclusion status transition' });
  });

  test('should update status for valid transition ongoing -> conclusion_requested', async () => {
    const thesis = buildThesis('ongoing');
    Thesis.findByPk.mockResolvedValue(thesis);
    req.body.conclusionStatus = 'conclusion_requested';

    await updateThesisConclusionStatus(req, res);

    expect(ThesisApplicationStatusHistory.create).toHaveBeenCalledWith(
      {
        thesis_application_id: 5,
        old_status: 'ongoing',
        new_status: 'conclusion_requested',
      },
      { transaction: t },
    );
    expect(thesis.status).toBe('conclusion_requested');
    expect(thesis.save).toHaveBeenCalledWith({ transaction: t });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(thesis);
  });

  test('should set confirmation date for transition to conclusion_approved', async () => {
    const thesis = buildThesis('conclusion_requested');
    Thesis.findByPk.mockResolvedValue(thesis);
    req.body.conclusionStatus = 'conclusion_approved';

    await updateThesisConclusionStatus(req, res);

    expect(thesis.status).toBe('conclusion_approved');
    expect(thesis.thesis_conclusion_confirmation_date).toBeInstanceOf(Date);
    expect(thesis.save).toHaveBeenCalledWith({ transaction: t });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test.each([
    ['conclusion_approved', 'almalaurea'],
    ['almalaurea', 'compiled_questionnaire'],
    ['compiled_questionnaire', 'final_exam'],
    ['final_exam', 'final_thesis'],
    ['final_thesis', 'done'],
    ['final_thesis', 'ongoing'],
    ['cancel_requested', 'cancel_approved'],
    ['cancel_requested', 'ongoing'],
  ])('should allow valid transition %s -> %s', async (currentStatus, nextStatus) => {
    const thesis = buildThesis(currentStatus);
    Thesis.findByPk.mockResolvedValue(thesis);
    req.body.conclusionStatus = nextStatus;

    await updateThesisConclusionStatus(req, res);

    expect(ThesisApplicationStatusHistory.create).toHaveBeenCalledWith(
      {
        thesis_application_id: 5,
        old_status: currentStatus,
        new_status: nextStatus,
      },
      { transaction: t },
    );
    expect(thesis.status).toBe(nextStatus);
    expect(thesis.save).toHaveBeenCalledWith({ transaction: t });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(thesis);
  });

  test('should return 500 on unexpected error', async () => {
    sequelize.transaction.mockRejectedValue(new Error('DB failure'));

    await updateThesisConclusionStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
