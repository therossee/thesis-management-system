require('jest');
const { z } = require('zod');

jest.mock('../../src/schemas/ThesisApplicationRequest', () => ({
  parseAsync: jest.fn(d => Promise.resolve(d)),
}));

jest.mock('../../src/schemas/ThesisApplicationResponse', () => ({
  parseAsync: jest.fn(d => Promise.resolve(d)),
  parse: jest.fn(d => d),
}));

jest.mock('../../src/schemas/ThesisApplicationStatusHistory', () => ({
  parse: jest.fn(d => d),
}));

jest.mock('../../src/schemas/ThesisApplication', () => ({
  parse: jest.fn(d => d),
}));

jest.mock('../../src/utils/snakeCase', () => jest.fn(d => d));
jest.mock('../../src/utils/selectTeacherAttributes', () => jest.fn(() => ['id', 'first_name', 'last_name']));

jest.mock('../../src/models', () => ({
  sequelize: {
    transaction: jest.fn(cb => cb({})),
  },
  Teacher: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
  LoggedStudent: {
    findOne: jest.fn(),
  },
  Student: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
  Company: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
  ThesisProposal: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
  ThesisApplication: {
    create: jest.fn(),
    count: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  Thesis: {
    findOne: jest.fn(),
  },
  ThesisApplicationSupervisorCoSupervisor: {
    bulkCreate: jest.fn(),
    findAll: jest.fn(),
  },
  ThesisApplicationStatusHistory: {
    create: jest.fn(),
    findAll: jest.fn(),
  },
}));

const {
  createThesisApplication,
  checkStudentEligibility,
  getLastStudentApplication,
  getAllThesisApplications,
  getStatusHistoryApplication,
  cancelThesisApplication,
} = require('../../src/controllers/thesis-applications');

const {
  Teacher,
  LoggedStudent,
  Student,
  Company,
  ThesisProposal,
  ThesisApplication,
  Thesis,
  ThesisApplicationSupervisorCoSupervisor,
  ThesisApplicationStatusHistory,
  sequelize,
} = require('../../src/models');

beforeEach(() => {
  jest.clearAllMocks();
  sequelize.transaction.mockImplementation(cb => cb({}));
});

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

const mockTeacher = id => ({
  id,
  first_name: 'Mock',
  last_name: 'Teacher',
  get: jest.fn().mockReturnValue({ id, first_name: 'Mock', last_name: 'Teacher' }),
});

// ======================================================
// CREATE THESIS APPLICATION
// ======================================================
describe('createThesisApplication', () => {
  test('creates full thesis application with proposal, company and co-supervisors', async () => {
    const req = {
      body: {
        topic: 'AI Thesis',
        supervisor: { id: 1 },
        co_supervisors: [{ id: 2 }, { id: 3 }],
        thesis_proposal: { id: 10 },
        company: { id: 99 },
      },
    };
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 100 });
    Student.findByPk.mockResolvedValue({ id: 100 });
    Teacher.findByPk.mockImplementation(id => Promise.resolve(mockTeacher(id)));
    ThesisProposal.findByPk.mockResolvedValue({ id: 10 });
    Company.findByPk.mockResolvedValue({ id: 99 });
    ThesisApplication.findAll.mockResolvedValue([]);
    ThesisApplication.create.mockResolvedValue({
      id: 500,
      topic: 'AI Thesis',
    });

    await createThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(ThesisApplicationSupervisorCoSupervisor.bulkCreate).toHaveBeenCalled();
    expect(ThesisApplicationStatusHistory.create).toHaveBeenCalled();
  });

  test('returns 401 if no logged student', async () => {
    const req = { body: {} };
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue(null);

    await createThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 404 if student not found', async () => {
    const req = { body: {} };
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue(null);

    await createThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('returns 400 on zod validation error', async () => {
    const req = { body: {} };
    const res = mockRes();

    const { parseAsync } = require('../../src/schemas/ThesisApplicationRequest');
    parseAsync.mockRejectedValueOnce(new z.ZodError([]));

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });

    await createThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 if supervisor not found', async () => {
    const req = { body: { topic: 'Test', supervisor: { id: 1 } } };
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    Teacher.findByPk.mockResolvedValue(null);

    await createThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 if co-supervisor not found', async () => {
    const req = { body: { topic: 'Test', supervisor: { id: 1 }, co_supervisors: [{ id: 2 }] } };
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    Teacher.findByPk.mockImplementation(id => Promise.resolve(id === 1 ? mockTeacher(1) : null));

    await createThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 if thesis proposal not found', async () => {
    const req = { body: { topic: 'Test', supervisor: { id: 1 }, thesis_proposal: { id: 10 } } };
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    Teacher.findByPk.mockResolvedValue(mockTeacher(1));
    ThesisProposal.findByPk.mockResolvedValue(null);

    await createThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 if company not found', async () => {
    const req = { body: { topic: 'Test', supervisor: { id: 1 }, company: { id: 5 } } };
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    Teacher.findByPk.mockResolvedValue(mockTeacher(1));
    Company.findByPk.mockResolvedValue(null);

    await createThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 if student already has active application', async () => {
    const req = { body: { topic: 'Test', supervisor: { id: 1 } } };
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    Teacher.findByPk.mockResolvedValue(mockTeacher(1));
    ThesisApplication.findAll.mockResolvedValue([{ id: 1, status: 'pending' }]);

    await createThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 if student has approved application linked to thesis not cancel_approved', async () => {
    const req = { body: { topic: 'Test', supervisor: { id: 1 } } };
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    Teacher.findByPk.mockResolvedValue(mockTeacher(1));
    ThesisApplication.findAll.mockResolvedValue([{ id: 11, status: 'approved' }]);
    Thesis.findOne.mockResolvedValue({ id: 22, status: 'ongoing' });

    await createThesisApplication(req, res);

    expect(Thesis.findOne).toHaveBeenCalledWith({ where: { thesis_application_id: 11 } });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Student already has an active thesis application' });
  });

  test('creates application when approved one is linked to cancel_approved thesis', async () => {
    const req = { body: { topic: 'Test', supervisor: { id: 1 } } };
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    Teacher.findByPk.mockResolvedValue(mockTeacher(1));
    ThesisApplication.findAll.mockResolvedValue([{ id: 11, status: 'approved' }]);
    Thesis.findOne.mockResolvedValue({ id: 22, status: 'cancel_approved' });
    ThesisApplication.create.mockResolvedValue({ id: 500, topic: 'Test' });

    await createThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('returns 500 on unexpected error', async () => {
    const req = { body: { topic: 'Test', supervisor: { id: 1 } } };
    const res = mockRes();

    LoggedStudent.findOne.mockRejectedValue(new Error('DB crash'));

    await createThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('createThesisApplication covers no co-supervisors, no proposal, no company branches', async () => {
    const req = {
      body: {
        topic: 'Minimal thesis',
        supervisor: { id: 1 },
        co_supervisors: undefined,
        thesis_proposal: undefined,
        company: undefined,
      },
    };
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    Teacher.findByPk.mockResolvedValue({ get: () => ({ id: 1 }) });
    ThesisApplication.findAll.mockResolvedValue([]);
    ThesisApplication.create.mockResolvedValue({ id: 10, topic: 'Minimal thesis' });

    await createThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('createThesisApplication returns 400 if thesis proposal does not exist (branch 141)', async () => {
    const req = {
      body: {
        topic: 'Test',
        supervisor: { id: 1 },
        co_supervisors: [],
        thesis_proposal: { id: 99 },
      },
    };
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    Teacher.findByPk.mockResolvedValue({ get: () => ({ id: 1 }) });
    ThesisProposal.findByPk.mockResolvedValue(null);

    await createThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createThesisApplication returns 400 if company does not exist (branch 172)', async () => {
    const req = {
      body: {
        topic: 'Test',
        supervisor: { id: 1 },
        co_supervisors: [],
        company: { id: 99 },
      },
    };
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    Teacher.findByPk.mockResolvedValue({ get: () => ({ id: 1 }) });
    ThesisApplication.findAll.mockResolvedValue([]);

    Company.findByPk.mockResolvedValue(null);

    await createThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ======================================================
// CHECK STUDENT ELIGIBILITY
// ======================================================
describe('checkStudentEligibility', () => {
  test('returns 401 if no logged student', async () => {
    const req = {};
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue(null);

    await checkStudentEligibility(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 404 if student not found', async () => {
    const req = {};
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue(null);

    await checkStudentEligibility(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('eligible true if no applications', async () => {
    const req = {};
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    ThesisApplication.count.mockResolvedValue(0);
    ThesisApplication.findAll.mockResolvedValue([]);

    await checkStudentEligibility(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ studentId: 1, eligible: true });
  });

  test('eligible false if active application exists', async () => {
    const req = {};
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    ThesisApplication.count.mockResolvedValue(1);

    await checkStudentEligibility(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ studentId: 1, eligible: false });
  });

  test('eligible false if approved application has no cancellable thesis', async () => {
    const req = {};
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    ThesisApplication.count.mockResolvedValue(0);
    ThesisApplication.findAll.mockResolvedValue([{ id: 11, status: 'approved' }]);
    Thesis.findOne.mockResolvedValue({ id: 20, status: 'ongoing' });

    await checkStudentEligibility(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ studentId: 1, eligible: false });
  });

  test('returns 500 on unexpected error', async () => {
    const req = {};
    const res = mockRes();

    LoggedStudent.findOne.mockRejectedValue(new Error('Boom'));

    await checkStudentEligibility(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ======================================================
// GET LAST STUDENT APPLICATION
// ======================================================
describe('getLastStudentApplication', () => {
  test('returns 401 if no logged student', async () => {
    const req = {};
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue(null);

    await getLastStudentApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 404 if student has no applications', async () => {
    const req = {};
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    ThesisApplication.findAll.mockResolvedValue([]);

    await getLastStudentApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('handles missing proposal and missing teachers', async () => {
    const req = {};
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    ThesisApplication.findAll.mockResolvedValue([
      {
        id: 1,
        thesis_proposal_id: 99,
        submission_date: new Date(),
        status: 'pending',
      },
    ]);
    ThesisProposal.findByPk.mockResolvedValue(null);
    ThesisApplicationSupervisorCoSupervisor.findAll.mockResolvedValue([{ teacher_id: 1, is_supervisor: true }]);
    Teacher.findByPk.mockResolvedValue(null);

    await getLastStudentApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('builds response with supervisor and co-supervisors', async () => {
    const req = {};
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    ThesisApplication.findAll.mockResolvedValue([
      {
        id: 1,
        thesis_proposal_id: null,
        submission_date: new Date(),
        status: 'pending',
      },
    ]);
    ThesisApplicationSupervisorCoSupervisor.findAll.mockResolvedValue([
      { teacher_id: 1, is_supervisor: true },
      { teacher_id: 2, is_supervisor: false },
    ]);
    Teacher.findByPk.mockImplementation(id => Promise.resolve({ id }));

    await getLastStudentApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 500 if proposal.toJSON throws', async () => {
    const req = {};
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    ThesisApplication.findAll.mockResolvedValue([
      {
        id: 1,
        thesis_proposal_id: 10,
        submission_date: new Date(),
        status: 'pending',
      },
    ]);

    ThesisProposal.findByPk.mockResolvedValue({
      toJSON: () => {
        throw new Error('Serialization failed');
      },
    });

    await getLastStudentApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('returns 500 on unexpected error', async () => {
    const req = {};
    const res = mockRes();

    LoggedStudent.findOne.mockRejectedValue(new Error('DB crash'));

    await getLastStudentApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('returns 404 if student not found', async () => {
    const req = {};
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue(null);

    await getLastStudentApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Student not found' });
  });

  test('getLastStudentApplication covers no proposal branch', async () => {
    const req = {};
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    ThesisApplication.findAll.mockResolvedValue([
      {
        id: 1,
        topic: 'Test',
        thesis_proposal_id: null,
        submission_date: new Date(),
        status: 'pending',
      },
    ]);
    ThesisApplicationSupervisorCoSupervisor.findAll.mockResolvedValue([]);
    Teacher.findByPk.mockResolvedValue(null);

    await getLastStudentApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getLastStudentApplication handles app with no thesis_proposal_id (branch 246)', async () => {
    const req = {};
    const res = mockRes();

    LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
    Student.findByPk.mockResolvedValue({ id: 1 });
    ThesisApplication.findAll.mockResolvedValue([
      {
        id: 1,
        thesis_proposal_id: null,
        submission_date: new Date(),
        status: 'pending',
        topic: 'Test',
        company: null,
      },
    ]);
    ThesisApplicationSupervisorCoSupervisor.findAll.mockResolvedValue([]);
    Teacher.findByPk.mockResolvedValue(null);

    await getLastStudentApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ======================================================
// STATUS HISTORY
// ======================================================
describe('getStatusHistoryApplication', () => {
  test('returns 400 if applicationId missing', async () => {
    const req = { query: {} };
    const res = mockRes();

    await getStatusHistoryApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns status history successfully', async () => {
    const req = { query: { applicationId: 1 } };
    const res = mockRes();

    ThesisApplicationStatusHistory.findAll.mockResolvedValue([{ toJSON: () => ({ id: 1 }) }]);

    await getStatusHistoryApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  test('returns 500 when await inside try throws', async () => {
    const req = { query: { applicationId: 1 } };
    const res = mockRes();

    ThesisApplicationStatusHistory.findAll.mockRejectedValueOnce(new Error('Async DB crash'));

    await getStatusHistoryApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ======================================================
// GET ALL THESIS APPLICATIONS (UPDATED CONTROLLER)
// ======================================================
describe('getAllThesisApplications', () => {
  test('returns full applications list (happy path)', async () => {
    const req = {};
    const res = mockRes();

    Student.findAll.mockResolvedValue([{ id: 1 }]);
    ThesisApplication.findAll.mockResolvedValue([
      {
        id: 1,
        student_id: 1,
        thesis_proposal_id: 10,
        company_id: 99,
        submission_date: new Date(),
        status: 'pending',
      },
    ]);
    ThesisProposal.findAll.mockResolvedValue([{ id: 10, toJSON: () => ({ id: 10 }) }]);
    ThesisApplicationSupervisorCoSupervisor.findAll.mockResolvedValue([
      { thesis_application_id: 1, teacher_id: 1, is_supervisor: true },
      { thesis_application_id: 1, teacher_id: 2, is_supervisor: false },
    ]);
    Teacher.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    Company.findAll.mockResolvedValue([{ id: 99 }]);

    await getAllThesisApplications(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(Array.isArray(res.json.mock.calls[0][0])).toBe(true);
  });

  test('returns 400 if thesis proposal not found (covers 291-295)', async () => {
    const req = {};
    const res = mockRes();

    Student.findAll.mockResolvedValue([{ id: 1 }]);
    ThesisApplication.findAll.mockResolvedValue([
      {
        id: 1,
        student_id: 1,
        thesis_proposal_id: 10,
        submission_date: new Date(),
        status: 'pending',
      },
    ]);
    ThesisProposal.findAll.mockResolvedValue([]);

    await getAllThesisApplications(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Thesis proposal with id 10 not found' });
  });

  test('returns 400 if teacher not found (covers 309-316)', async () => {
    const req = {};
    const res = mockRes();

    Student.findAll.mockResolvedValue([{ id: 1 }]);
    ThesisApplication.findAll.mockResolvedValue([
      {
        id: 1,
        student_id: 1,
        thesis_proposal_id: null,
        submission_date: new Date(),
        status: 'pending',
      },
    ]);
    ThesisApplicationSupervisorCoSupervisor.findAll.mockResolvedValue([
      { thesis_application_id: 1, teacher_id: 99, is_supervisor: true },
    ]);
    Teacher.findAll.mockResolvedValue([]);

    await getAllThesisApplications(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Teacher with id 99 not found' });
  });

  test('returns 400 if company not found (covers 321-323)', async () => {
    const req = {};
    const res = mockRes();

    Student.findAll.mockResolvedValue([{ id: 1 }]);
    ThesisApplication.findAll.mockResolvedValue([
      {
        id: 1,
        student_id: 1,
        thesis_proposal_id: null,
        company_id: 99,
        submission_date: new Date(),
        status: 'pending',
      },
    ]);
    ThesisApplicationSupervisorCoSupervisor.findAll.mockResolvedValue([]);
    Company.findAll.mockResolvedValue([]);

    await getAllThesisApplications(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Company with id 99 not found' });
  });

  test('returns 500 if Student.findAll throws (covers catch)', async () => {
    const req = {};
    const res = mockRes();

    Student.findAll.mockRejectedValueOnce(new Error('Students crash'));

    await getAllThesisApplications(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('returns 500 if Teacher.findAll throws', async () => {
    const req = {};
    const res = mockRes();

    Student.findAll.mockResolvedValue([{ id: 1 }]);
    ThesisApplication.findAll.mockResolvedValue([
      {
        id: 1,
        student_id: 1,
        thesis_proposal_id: null,
        submission_date: new Date(),
        status: 'pending',
      },
    ]);
    ThesisApplicationSupervisorCoSupervisor.findAll.mockResolvedValue([
      { thesis_application_id: 1, teacher_id: 1, is_supervisor: true },
    ]);
    Teacher.findAll.mockRejectedValue(new Error('Teacher crash'));

    await getAllThesisApplications(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getAllThesisApplications covers no proposal branch', async () => {
    const req = {};
    const res = mockRes();

    Student.findAll.mockResolvedValue([{ id: 1 }]);
    ThesisApplication.findAll.mockResolvedValue([
      {
        id: 1,
        student_id: 1,
        thesis_proposal_id: null,
        company_id: null,
        topic: 'Test',
        submission_date: new Date(),
        status: 'pending',
      },
    ]);
    ThesisApplicationSupervisorCoSupervisor.findAll.mockResolvedValue([]);

    await getAllThesisApplications(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getAllThesisApplications covers student not found branch', async () => {
    const req = {};
    const res = mockRes();

    Student.findAll.mockResolvedValue([]); // nessuno studente
    ThesisApplication.findAll.mockResolvedValue([
      {
        id: 1,
        student_id: 999,
        thesis_proposal_id: null,
        company_id: null,
        topic: 'Test',
        submission_date: new Date(),
        status: 'pending',
      },
    ]);
    ThesisApplicationSupervisorCoSupervisor.findAll.mockResolvedValue([]);

    await getAllThesisApplications(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getAllThesisApplications covers status fallback branch', async () => {
    const req = {};
    const res = mockRes();

    Student.findAll.mockResolvedValue([{ id: 1 }]);
    ThesisApplication.findAll.mockResolvedValue([
      {
        id: 1,
        student_id: 1,
        thesis_proposal_id: null,
        company_id: null,
        topic: 'Test',
        submission_date: new Date(),
        status: undefined,
      },
    ]);
    ThesisApplicationSupervisorCoSupervisor.findAll.mockResolvedValue([]);

    await getAllThesisApplications(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ======================================================
// CANCEL THESIS APPLICATION
// ======================================================
describe('cancelThesisApplication', () => {
  test('returns 404 if application not found', async () => {
    const req = { body: { id: 1 } };
    const res = mockRes();

    ThesisApplication.findByPk.mockResolvedValue(null);

    await cancelThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('returns 400 if status not pending', async () => {
    const req = { body: { id: 1 } };
    const res = mockRes();

    ThesisApplication.findByPk.mockResolvedValue({ id: 1, status: 'approved' });

    await cancelThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 200 on successful cancellation', async () => {
    const req = { body: { id: 1 } };
    const res = mockRes();

    const mockApp = {
      id: 1,
      status: 'pending',
      save: jest.fn(),
    };

    ThesisApplication.findByPk
      .mockResolvedValueOnce(mockApp)
      .mockResolvedValueOnce({ ...mockApp, status: 'cancelled' });

    await cancelThesisApplication(req, res);

    expect(ThesisApplicationStatusHistory.create).toHaveBeenCalled();
    expect(mockApp.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 500 if save throws', async () => {
    const req = { body: { id: 1 } };
    const res = mockRes();

    const mockApp = {
      id: 1,
      status: 'pending',
      save: jest.fn().mockRejectedValue(new Error('Write failed')),
    };

    ThesisApplication.findByPk.mockResolvedValue(mockApp);

    await cancelThesisApplication(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
