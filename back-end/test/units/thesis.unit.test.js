require('jest');

const {
  getLoggedStudentThesis,
  createStudentThesis,
  getAllTheses,
  getThesisFile,
  sendThesisCancelRequest,
} = require('../../src/controllers/thesis');

const {
  sequelize,
  Thesis,
  ThesisSupervisorCoSupervisor,
  Teacher,
  Student,
  LoggedStudent,
  ThesisApplicationStatusHistory,
  Company,
} = require('../../src/models');

jest.mock('../../src/models', () => ({
  sequelize: { transaction: jest.fn() },
  Thesis: { findOne: jest.fn(), findByPk: jest.fn(), findAll: jest.fn(), create: jest.fn() },
  ThesisSupervisorCoSupervisor: { findAll: jest.fn(), create: jest.fn() },
  Teacher: { findByPk: jest.fn() },
  Student: { findByPk: jest.fn() },
  LoggedStudent: { findOne: jest.fn() },
  ThesisApplicationStatusHistory: { findAll: jest.fn(), create: jest.fn() },
  Company: { findByPk: jest.fn() },
}));

jest.mock('../../src/utils/snakeCase', () => jest.fn(x => x));
jest.mock('../../src/utils/selectTeacherAttributes', () => jest.fn(() => ['id', 'first_name', 'last_name']));

const createTeacherRow = id => ({
  id,
  first_name: id === 100 ? 'Paolo' : 'Sara',
  last_name: id === 100 ? 'Rossi' : 'Bianchi',
  role: 'Professor',
  email: `teacher${id}@polito.it`,
  profile_url: null,
  profile_picture_url: null,
  facility_short_name: 'DAUIN',
});

const createTeacherModel = id => {
  const row = createTeacherRow(id);
  return {
    ...row,
    toJSON: jest.fn(() => row),
  };
};

const createStudentRow = id => {
  const row = {
    id: String(id),
    first_name: 'Test',
    last_name: 'Student',
    profile_picture_url: null,
    degree_id: 'LM-18',
  };

  return {
    ...row,
    toJSON: jest.fn(() => row),
  };
};

const createCompanyRow = id => ({
  id,
  corporate_name: 'Test Company',
});

describe('Student Thesis Controllers', () => {
  let req;
  let res;
  let t;

  beforeEach(() => {
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    req = { body: {} };
    t = { commit: jest.fn(), rollback: jest.fn() };
    sequelize.transaction.mockImplementation(async callback => {
      if (typeof callback === 'function') return callback(t);
      return t;
    });
    jest.clearAllMocks();

    Teacher.findByPk.mockImplementation(id => createTeacherModel(id));
    Student.findByPk.mockResolvedValue(createStudentRow(1));
    Company.findByPk.mockResolvedValue(createCompanyRow(1));
  });

  describe('getLoggedStudentThesis', () => {
    test('should return 401 if no logged student', async () => {
      LoggedStudent.findOne.mockResolvedValue(null);

      await getLoggedStudentThesis(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No logged-in student found' });
    });

    test('should return 404 if thesis not found', async () => {
      LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
      Student.findByPk.mockResolvedValue({ id: 1 });
      Thesis.findOne.mockResolvedValue(null);

      await getLoggedStudentThesis(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Thesis not found for the logged-in student.' });
    });

    test('should return 200 with complete thesis data', async () => {
      const mockDate = new Date();
      const requestDate = new Date('2025-01-02T10:00:00.000Z');
      const confirmationDate = new Date('2025-01-05T12:00:00.000Z');

      LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
      Student.findByPk.mockResolvedValue(createStudentRow(1));

      Thesis.findOne.mockResolvedValue({
        id: 10,
        student_id: 1,
        topic: 'AI Thesis',
        status: 'ongoing',
        thesis_start_date: mockDate,
        thesis_conclusion_request_date: requestDate,
        thesis_conclusion_confirmation_date: confirmationDate,
        thesis_application_id: 5,
        company_id: 1,
        toJSON() {
          return this;
        },
      });

      ThesisSupervisorCoSupervisor.findAll.mockResolvedValue([
        { teacher_id: 100, is_supervisor: true },
        { teacher_id: 101, is_supervisor: false },
      ]);

      Teacher.findByPk.mockImplementation(id => ({
        toJSON: () => createTeacherRow(id),
      }));

      Company.findByPk.mockResolvedValue(createCompanyRow(1));

      ThesisApplicationStatusHistory.findAll.mockResolvedValue([]);

      await getLoggedStudentThesis(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload.student).toEqual({
        id: '1',
        firstName: 'Test',
        lastName: 'Student',
        profilePictureUrl: null,
        degreeId: 'LM-18',
        isLogged: undefined,
      });
      expect(payload.supervisor).toEqual({
        id: 100,
        firstName: 'Paolo',
        lastName: 'Rossi',
        role: 'Professor',
        email: 'teacher100@polito.it',
        profileUrl: null,
        profilePictureUrl: null,
        facilityShortName: 'DAUIN',
        isSupervisor: null,
      });
      expect(payload.coSupervisors).toEqual([
        {
          id: 101,
          firstName: 'Sara',
          lastName: 'Bianchi',
          role: 'Professor',
          email: 'teacher101@polito.it',
          profileUrl: null,
          profilePictureUrl: null,
          facilityShortName: 'DAUIN',
          isSupervisor: null,
        },
      ]);
      expect(payload.company).toEqual({ id: 1, corporateName: 'Test Company' });
      expect(payload.thesisConclusionRequestDate).toBe(requestDate.toISOString());
      expect(payload.thesisConclusionConfirmationDate).toBe(confirmationDate.toISOString());
    });

    test('should return 200 with null company and skip missing co-supervisors', async () => {
      const mockDate = new Date();

      LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
      Student.findByPk.mockResolvedValue(createStudentRow(1));

      Thesis.findOne.mockResolvedValue({
        id: 11,
        student_id: 1,
        topic: 'AI Thesis',
        status: 'ongoing',
        thesis_start_date: mockDate,
        thesis_conclusion_request_date: null,
        thesis_conclusion_confirmation_date: null,
        thesis_application_id: 6,
        company_id: null,
        toJSON() {
          return this;
        },
      });

      ThesisSupervisorCoSupervisor.findAll.mockResolvedValue([
        { teacher_id: 100, is_supervisor: true },
        { teacher_id: 101, is_supervisor: false },
      ]);

      Teacher.findByPk.mockResolvedValueOnce(createTeacherModel(100)).mockResolvedValueOnce(null);
      Company.findByPk.mockResolvedValue(null);
      ThesisApplicationStatusHistory.findAll.mockResolvedValue([]);

      await getLoggedStudentThesis(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = res.json.mock.calls[0][0];
      expect(payload.student).toEqual({
        id: '1',
        firstName: 'Test',
        lastName: 'Student',
        profilePictureUrl: null,
        degreeId: 'LM-18',
        isLogged: undefined,
      });
      expect(payload.supervisor).toEqual({
        id: 100,
        firstName: 'Paolo',
        lastName: 'Rossi',
        role: 'Professor',
        email: 'teacher100@polito.it',
        profileUrl: null,
        profilePictureUrl: null,
        facilityShortName: 'DAUIN',
        isSupervisor: null,
      });
      expect(payload.coSupervisors).toEqual([]);
      expect(payload.company).toBeNull();
    });

    test('should return 500 on unexpected error', async () => {
      const error = new Error('DB failure');
      LoggedStudent.findOne.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await getLoggedStudentThesis(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'An error occurred while fetching the thesis.' });
      consoleSpy.mockRestore();
    });
  });

  describe('createStudentThesis', () => {
    test('should return 401 if no logged student', async () => {
      LoggedStudent.findOne.mockResolvedValue(null);

      await createStudentThesis(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No logged-in student found' });
    });

    test('should create thesis and return 201', async () => {
      const mockDate = new Date();

      LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
      Student.findByPk.mockResolvedValue(createStudentRow(1));

      req.body = {
        topic: 'AI Thesis',
        thesis_application_id: 5,
        supervisor: { id: 100 },
        co_supervisors: [{ id: 101 }],
        company: {
          id: 1,
          corporate_name: 'Test Company',
          toJSON: () => createCompanyRow(1),
        },
      };

      Thesis.create.mockResolvedValue({
        id: 10,
        student_id: 1,
        topic: 'AI Thesis',
        status: 'ongoing',
        thesis_start_date: mockDate,
        thesis_conclusion_request_date: null,
        thesis_conclusion_confirmation_date: null,
        toJSON() {
          return this;
        },
      });

      ThesisSupervisorCoSupervisor.create.mockResolvedValue({});
      ThesisSupervisorCoSupervisor.findAll.mockResolvedValue([
        { teacher_id: 100, is_supervisor: true },
        { teacher_id: 101, is_supervisor: false },
      ]);
      Thesis.findByPk.mockResolvedValue({
        id: 10,
        student_id: 1,
        topic: 'AI Thesis',
        status: 'ongoing',
        thesis_start_date: mockDate,
        thesis_conclusion_request_date: null,
        thesis_conclusion_confirmation_date: null,
        toJSON() {
          return this;
        },
      });

      Teacher.findByPk.mockImplementation(id => ({
        toJSON: () => createTeacherRow(id),
      }));

      await createStudentThesis(req, res);

      expect(Thesis.create).toHaveBeenCalled();
      expect(ThesisSupervisorCoSupervisor.create).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(201);
      const payload = res.json.mock.calls[0][0];
      expect(payload.topic).toBe('AI Thesis');
      expect(payload.student).toEqual({
        id: '1',
        firstName: 'Test',
        lastName: 'Student',
        profilePictureUrl: null,
        degreeId: 'LM-18',
        isLogged: undefined,
      });
      expect(payload.supervisor).toEqual({
        id: 100,
        firstName: 'Paolo',
        lastName: 'Rossi',
        role: 'Professor',
        email: 'teacher100@polito.it',
        profileUrl: null,
        profilePictureUrl: null,
        facilityShortName: 'DAUIN',
        isSupervisor: null,
      });
      expect(payload.coSupervisors).toEqual([
        {
          id: 101,
          firstName: 'Sara',
          lastName: 'Bianchi',
          role: 'Professor',
          email: 'teacher101@polito.it',
          profileUrl: null,
          profilePictureUrl: null,
          facilityShortName: 'DAUIN',
          isSupervisor: null,
        },
      ]);
      expect(payload.company).toEqual({ id: 1, corporateName: 'Test Company' });
    });

    test('should create thesis without co-supervisors and company', async () => {
      const mockDate = new Date();

      LoggedStudent.findOne.mockResolvedValue({ student_id: 1 });
      Student.findByPk.mockResolvedValue(createStudentRow(1));

      req.body = {
        topic: 'Solo Supervisor',
        thesis_application_id: 7,
        supervisor: { id: 100 },
        co_supervisors: [],
      };

      Thesis.create.mockResolvedValue({
        id: 20,
        student_id: 1,
        topic: 'Solo Supervisor',
        status: 'ongoing',
        thesis_start_date: mockDate,
        thesis_conclusion_request_date: null,
        thesis_conclusion_confirmation_date: null,
        toJSON() {
          return this;
        },
      });

      ThesisSupervisorCoSupervisor.create.mockResolvedValue({});
      Thesis.findByPk.mockResolvedValue({
        id: 20,
        student_id: 1,
        topic: 'Solo Supervisor',
        status: 'ongoing',
        thesis_start_date: mockDate,
        thesis_conclusion_request_date: null,
        thesis_conclusion_confirmation_date: null,
        toJSON() {
          return this;
        },
      });

      ThesisSupervisorCoSupervisor.findAll.mockResolvedValue([{ teacher_id: 100, is_supervisor: true }]);
      Teacher.findByPk.mockResolvedValue(createTeacherModel(100));

      await createStudentThesis(req, res);

      expect(Thesis.create).toHaveBeenCalledWith(
        expect.objectContaining({ company_id: null, topic: 'Solo Supervisor', thesis_application_id: 7 }),
        { transaction: t },
      );
      expect(ThesisSupervisorCoSupervisor.create).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
      const payload = res.json.mock.calls[0][0];
      expect(payload.student).toEqual({
        id: '1',
        firstName: 'Test',
        lastName: 'Student',
        profilePictureUrl: null,
        degreeId: 'LM-18',
        isLogged: undefined,
      });
      expect(payload.supervisor).toEqual({
        id: 100,
        firstName: 'Paolo',
        lastName: 'Rossi',
        role: 'Professor',
        email: 'teacher100@polito.it',
        profileUrl: null,
        profilePictureUrl: null,
        facilityShortName: 'DAUIN',
        isSupervisor: null,
      });
      expect(payload.coSupervisors).toEqual([]);
      expect(payload.company).toBeNull();
    });

    test('should return 500 on unexpected error', async () => {
      const error = new Error('DB failure');
      LoggedStudent.findOne.mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await createStudentThesis(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'An error occurred while creating the thesis.' });
      consoleSpy.mockRestore();
    });
  });

  describe('getThesisFile', () => {
    test('should return 404 if thesis is not found', async () => {
      req = { params: { id: 123, fileType: 'thesis' } };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn(), download: jest.fn() };
      Thesis.findByPk.mockResolvedValue(null);

      await getThesisFile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Thesis not found' });
    });

    test('should return 400 for invalid file type', async () => {
      req = { params: { id: 123, fileType: 'unsupported' } };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn(), download: jest.fn() };
      Thesis.findByPk.mockResolvedValue({ id: 123 });

      await getThesisFile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid file type requested' });
    });

    test('should return 404 if requested file path is missing', async () => {
      req = { params: { id: 123, fileType: 'summary' } };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn(), download: jest.fn() };
      Thesis.findByPk.mockResolvedValue({ id: 123, thesis_summary_path: null });

      await getThesisFile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Requested file not found for this thesis' });
    });

    test('should download thesis file when requested file exists', async () => {
      req = { params: { id: 123, fileType: 'thesis' } };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn(), download: jest.fn() };
      Thesis.findByPk.mockResolvedValue({ id: 123, thesis_file_path: '/tmp/test-thesis.pdf' });

      await getThesisFile(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.download).toHaveBeenCalledWith('/tmp/test-thesis.pdf');
    });

    test('should return 500 on unexpected error', async () => {
      req = { params: { id: 123, fileType: 'thesis' } };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn(), download: jest.fn() };
      Thesis.findByPk.mockRejectedValue(new Error('DB failure'));

      await getThesisFile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'An error occurred while fetching the thesis file.' });
    });
  });

  describe('getAllTheses', () => {
    test('should return all theses', async () => {
      const theses = [{ id: 1 }, { id: 2 }];
      Thesis.findAll.mockResolvedValue(theses);

      await getAllTheses(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(theses);
    });

    test('should return 500 on unexpected error', async () => {
      Thesis.findAll.mockRejectedValue(new Error('DB failure'));

      await getAllTheses(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'An error occurred while fetching all theses.' });
    });
  });

  describe('sendThesisCancelRequest', () => {
    test('should return 401 if no logged student', async () => {
      LoggedStudent.findOne.mockResolvedValue(null);

      await sendThesisCancelRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No logged-in student found' });
    });

    test('should return 404 if logged student record does not exist', async () => {
      LoggedStudent.findOne.mockResolvedValue({ student_id: '999999' });
      Student.findByPk.mockResolvedValue(null);

      await sendThesisCancelRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Logged-in student not found' });
    });

    test('should return 404 if thesis is not found', async () => {
      LoggedStudent.findOne.mockResolvedValue({ student_id: '1' });
      Student.findByPk.mockResolvedValue({ id: '1' });
      Thesis.findOne.mockResolvedValue(null);

      await sendThesisCancelRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Thesis not found for the logged-in student.' });
    });

    test('should return 400 if thesis status is not ongoing', async () => {
      LoggedStudent.findOne.mockResolvedValue({ student_id: '1' });
      Student.findByPk.mockResolvedValue({ id: '1' });
      Thesis.findOne.mockResolvedValue({ status: 'final_exam' });

      await sendThesisCancelRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Thesis cancellation is not allowed for this thesis status.' });
    });

    test('should set thesis status to cancel_requested and return 200', async () => {
      const thesis = {
        status: 'ongoing',
        thesis_application_id: 99,
        save: jest.fn().mockResolvedValue(undefined),
      };
      LoggedStudent.findOne.mockResolvedValue({ student_id: '1' });
      Student.findByPk.mockResolvedValue({ id: '1' });
      Thesis.findOne.mockResolvedValue(thesis);

      await sendThesisCancelRequest(req, res);

      expect(thesis.status).toBe('cancel_requested');
      expect(thesis.save).toHaveBeenCalledWith({ transaction: t, fields: ['status'] });
      expect(ThesisApplicationStatusHistory.create).toHaveBeenCalledWith(
        {
          thesis_application_id: 99,
          old_status: 'ongoing',
          new_status: 'cancel_requested',
        },
        { transaction: t },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Thesis cancellation requested successfully.' });
    });

    test('should return 500 on unexpected error', async () => {
      LoggedStudent.findOne.mockRejectedValue(new Error('DB failure'));

      await sendThesisCancelRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'An error occurred while sending the thesis cancellation request.',
      });
    });
  });
});
