require('jest');

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  sendThesisConclusionRequest,
  saveThesisConclusionRequestDraft,
  getSustainableDevelopmentGoals,
  getAvailableLicenses,
  getEmbargoMotivations,
  getSessionDeadlines,
  uploadFinalThesis,
  getThesisConclusionRequestDraft,
} = require('../../src/controllers/thesis-conclusion');

const {
  SustainableDevelopmentGoal,
  License,
  EmbargoMotivation,
  LoggedStudent,
  Student,
  Thesis,
  ThesisKeyword,
  ThesisApplication,
  Deadline,
  ThesisApplicationStatusHistory,
  ThesisSupervisorCoSupervisor,
  ThesisEmbargo,
  ThesisEmbargoMotivation,
  Keyword,
  Teacher,
  ThesisSustainableDevelopmentGoal,
  sequelize,
} = require('../../src/models');
const selectLicenseAttributes = require('../../src/utils/selectLicenseAttributes');
const selectMotivationAttributes = require('../../src/utils/selectMotivationAttributes');
const selectTeacherAttributes = require('../../src/utils/selectTeacherAttributes');
const { isSummaryRequiredForStudent } = require('../../src/utils/requiredSummary');
const { writeValidatedPdf } = require('../../src/utils/pdfa');
const {
  cleanupUploads,
  ensureDirExists,
  moveFile,
  resolveValidDraftFilePath,
  safeUnlink,
} = require('../../src/utils/uploads');
const {
  executeConclusionRequestTransaction,
  buildConclusionResponse,
} = require('../../src/utils/thesisConclusionSubmit');
const { getLoggedStudentOrThrow, saveDraftTransaction } = require('../../src/utils/thesisConclusionDraft');

jest.mock('../../src/models', () => ({
  Thesis: { findOne: jest.fn(), findByPk: jest.fn() },
  ThesisKeyword: { findAll: jest.fn(), destroy: jest.fn(), bulkCreate: jest.fn() },
  ThesisSupervisorCoSupervisor: { findAll: jest.fn(), destroy: jest.fn(), bulkCreate: jest.fn() },
  ThesisSustainableDevelopmentGoal: { findAll: jest.fn(), destroy: jest.fn(), bulkCreate: jest.fn() },
  ThesisEmbargo: { findOne: jest.fn(), create: jest.fn(), destroy: jest.fn() },
  ThesisEmbargoMotivation: { findAll: jest.fn(), bulkCreate: jest.fn(), destroy: jest.fn() },
  Keyword: { findAll: jest.fn() },
  Teacher: { findAll: jest.fn() },
  Student: { findByPk: jest.fn() },
  EmbargoMotivation: { findAll: jest.fn() },
  License: { findAll: jest.fn() },
  LoggedStudent: { findOne: jest.fn() },
  ThesisApplication: { findOne: jest.fn() },
  SustainableDevelopmentGoal: { findAll: jest.fn() },
  GraduationSession: {},
  Deadline: { findAll: jest.fn() },
  ThesisApplicationStatusHistory: { findOne: jest.fn(), create: jest.fn() },
  sequelize: { transaction: jest.fn() },
}));

jest.mock('../../src/utils/selectLicenseAttributes', () => jest.fn(() => ['id', 'name']));
jest.mock('../../src/utils/selectMotivationAttributes', () => jest.fn(() => ['id', 'motivation']));
jest.mock('../../src/utils/selectTeacherAttributes', () => jest.fn(() => ['id', 'first_name', 'last_name']));
jest.mock('../../src/utils/requiredSummary', () => ({ isSummaryRequiredForStudent: jest.fn() }));
jest.mock('../../src/utils/pdfa', () => ({ writeValidatedPdf: jest.fn() }));
jest.mock('../../src/utils/uploads', () => ({
  ensureDirExists: jest.fn(),
  moveFile: jest.fn(),
  cleanupUploads: jest.fn(),
  resolveValidDraftFilePath: jest.fn(),
  safeUnlink: jest.fn(),
}));

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createUploadedFile = ({
  path = '/tmp/file.pdf',
  mimetype = 'application/pdf',
  originalname = 'file.pdf',
} = {}) => ({
  path,
  mimetype,
  originalname,
});

describe('Thesis Conclusion Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(async callback => callback('tx'));
  });

  describe('getSustainableDevelopmentGoals', () => {
    test('should return 200 and sustainable development goals', async () => {
      const req = {};
      const res = createRes();
      const goals = [{ id: 1, goal: 'Goal 1' }];

      SustainableDevelopmentGoal.findAll.mockResolvedValue(goals);

      await getSustainableDevelopmentGoals(req, res);

      expect(SustainableDevelopmentGoal.findAll).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(goals);
    });

    test('should return 500 when fetching goals fails', async () => {
      const req = {};
      const res = createRes();

      SustainableDevelopmentGoal.findAll.mockRejectedValue(new Error('DB error'));

      await getSustainableDevelopmentGoals(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
    });
  });

  describe('getAvailableLicenses', () => {
    test('should return 200 and use english attributes when lang=en', async () => {
      const req = { query: { lang: 'en' } };
      const res = createRes();
      const licenses = [{ id: 1, name: 'CC BY' }];

      selectLicenseAttributes.mockReturnValue(['id', 'name_en']);
      License.findAll.mockResolvedValue(licenses);

      await getAvailableLicenses(req, res);

      expect(selectLicenseAttributes).toHaveBeenCalledWith('en');
      expect(License.findAll).toHaveBeenCalledWith({ attributes: ['id', 'name_en'] });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(licenses);
    });

    test('should return 500 when fetching licenses fails', async () => {
      const req = { query: {} };
      const res = createRes();

      License.findAll.mockRejectedValue(new Error('License fetch failed'));

      await getAvailableLicenses(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'License fetch failed' });
    });
  });

  describe('getEmbargoMotivations', () => {
    test('should return 200 and use default italian attributes', async () => {
      const req = { query: {} };
      const res = createRes();
      const motivations = [{ id: 1, motivation: 'Reason' }];

      selectMotivationAttributes.mockReturnValue(['id', 'motivation']);
      EmbargoMotivation.findAll.mockResolvedValue(motivations);

      await getEmbargoMotivations(req, res);

      expect(selectMotivationAttributes).toHaveBeenCalledWith('it');
      expect(EmbargoMotivation.findAll).toHaveBeenCalledWith({
        attributes: ['id', 'motivation'],
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(motivations);
    });

    test('should return 500 when fetching motivations fails', async () => {
      const req = { query: { lang: 'en' } };
      const res = createRes();

      EmbargoMotivation.findAll.mockRejectedValue(new Error('Motivation fetch failed'));

      await getEmbargoMotivations(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Motivation fetch failed' });
    });
  });

  describe('sendThesisConclusionRequest', () => {
    const createConclusionReq = () => ({
      body: {
        title: 'My thesis',
        titleEng: 'My thesis EN',
        abstract: 'Abstract IT',
        abstractEng: 'Abstract EN',
        language: 'it',
        coSupervisors: JSON.stringify([{ id: 38485, firstName: 'Riccardo', lastName: 'Coppola' }]),
        keywords: JSON.stringify([{ id: 8, keyword: 'AI' }, 'free-keyword']),
        licenseId: '1',
        sdgs: JSON.stringify([{ goalId: 5, level: 'primary' }]),
        embargo: JSON.stringify({
          duration: '12_months',
          motivations: [{ motivationId: 1, otherMotivation: null }],
        }),
      },
      files: {
        thesisFile: [{ path: '/tmp/thesis.pdf', mimetype: 'application/pdf', originalname: 'thesis.pdf' }],
        thesisSummary: [{ path: '/tmp/summary.pdf', mimetype: 'application/pdf', originalname: 'summary.pdf' }],
        additionalZip: [{ path: '/tmp/additional.zip', mimetype: 'application/zip', originalname: 'a.zip' }],
      },
    });

    const createOngoingThesis = () => ({
      id: 1,
      topic: 'AI Thesis',
      title: null,
      title_eng: null,
      language: null,
      abstract: null,
      abstract_eng: null,
      thesis_file_path: null,
      thesis_summary_path: null,
      additional_zip_path: null,
      license_id: null,
      company_id: null,
      student_id: '320213',
      thesis_application_id: 100,
      status: 'ongoing',
      thesis_start_date: new Date('2025-01-01T00:00:00.000Z'),
      thesis_conclusion_request_date: null,
      thesis_conclusion_confirmation_date: null,
      thesis_draft_date: null,
      save: jest.fn().mockResolvedValue(undefined),
    });

    test('should return 200 when conclusion request is processed successfully with real submit utils', async () => {
      const req = createConclusionReq();
      const res = createRes();
      const thesisRecord = createOngoingThesis();

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
      Thesis.findOne.mockResolvedValue(thesisRecord);
      isSummaryRequiredForStudent.mockResolvedValue(false);
      ensureDirExists.mockResolvedValue(undefined);
      writeValidatedPdf.mockResolvedValue(undefined);
      moveFile.mockResolvedValue(undefined);
      Teacher.findAll.mockResolvedValue([{ id: 38485 }]);
      SustainableDevelopmentGoal.findAll.mockResolvedValue([{ id: 5 }]);
      Keyword.findAll.mockResolvedValue([{ id: 8 }]);
      ThesisEmbargo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 7, duration: '12_months' });
      ThesisEmbargo.create.mockResolvedValue({ id: 7, duration: '12_months' });
      EmbargoMotivation.findAll.mockResolvedValue([{ id: 1 }]);
      Thesis.findByPk.mockResolvedValue({
        id: 1,
        topic: 'AI Thesis',
        title: 'My thesis',
        title_eng: 'My thesis EN',
        language: 'it',
        abstract: 'Abstract IT',
        abstract_eng: 'Abstract EN',
        thesis_file_path: 'uploads/thesis_conclusion_request/320213/thesis_320213.pdf',
        thesis_summary_path: 'uploads/thesis_conclusion_request/320213/summary_320213.pdf',
        additional_zip_path: 'uploads/thesis_conclusion_request/320213/additional_320213.zip',
        license_id: 1,
        company_id: null,
        student_id: '320213',
        thesis_application_id: 100,
        status: 'conclusion_requested',
        thesis_start_date: new Date('2025-01-01T00:00:00.000Z'),
        thesis_conclusion_request_date: new Date('2025-01-02T00:00:00.000Z'),
        thesis_conclusion_confirmation_date: null,
      });
      ThesisSupervisorCoSupervisor.findAll.mockResolvedValue([
        { teacher_id: 3019, is_supervisor: true },
        { teacher_id: 38485, is_supervisor: false },
      ]);
      ThesisSustainableDevelopmentGoal.findAll.mockResolvedValue([{ goal_id: 5, sdg_level: 'primary' }]);
      ThesisKeyword.findAll.mockResolvedValue([
        { keyword_id: 8, keyword_other: null },
        { keyword_id: null, keyword_other: 'free-keyword' },
      ]);
      ThesisEmbargoMotivation.findAll.mockResolvedValue([{ motivation_id: 1, other_motivation: null }]);

      await sendThesisConclusionRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          title: 'My thesis',
          titleEng: 'My thesis EN',
          status: 'conclusion_requested',
          thesisApplicationId: 100,
          studentId: '320213',
        }),
      );
      expect(Teacher.findAll).toHaveBeenCalled();
      expect(SustainableDevelopmentGoal.findAll).toHaveBeenCalled();
      expect(Keyword.findAll).toHaveBeenCalled();
      expect(ThesisApplicationStatusHistory.create).toHaveBeenCalledWith(
        {
          thesis_application_id: 100,
          old_status: 'ongoing',
          new_status: 'conclusion_requested',
        },
        { transaction: 'tx' },
      );
      expect(ThesisSupervisorCoSupervisor.destroy).toHaveBeenCalledTimes(2);
      expect(ThesisSupervisorCoSupervisor.bulkCreate).toHaveBeenCalled();
      expect(ThesisKeyword.bulkCreate).toHaveBeenCalledTimes(2);
      expect(ThesisEmbargo.create).toHaveBeenCalledWith(
        { thesis_id: '1', duration: '12_months' },
        { transaction: 'tx' },
      );
    });

    test('should return 400 on zod validation errors and cleanup uploads', async () => {
      const req = {
        body: {},
        files: {
          thesisFile: [{ path: '/tmp/thesis.pdf', mimetype: 'application/pdf', originalname: 'thesis.pdf' }],
          thesisSummary: [{ path: '/tmp/summary.pdf', mimetype: 'application/pdf', originalname: 'summary.pdf' }],
          additionalZip: [{ path: '/tmp/additional.zip', mimetype: 'application/zip', originalname: 'a.zip' }],
        },
      };
      const res = createRes();

      await sendThesisConclusionRequest(req, res);

      expect(cleanupUploads).toHaveBeenCalledWith(
        req.files.thesisFile[0],
        req.files.thesisSummary[0],
        req.files.additionalZip[0],
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0]).toEqual({
        error: expect.any(String),
      });
    });

    test('should cleanup with null uploads when files object is missing and zod validation fails', async () => {
      const req = { body: {} };
      const res = createRes();

      await sendThesisConclusionRequest(req, res);

      expect(cleanupUploads).toHaveBeenCalledWith(null, null, null);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0]).toEqual({ error: expect.any(String) });
    });

    test('should return the error status when submit transaction fails and cleanup uploads', async () => {
      const req = createConclusionReq();
      const res = createRes();
      const error = new Error('Conflict while saving');
      error.status = 409;

      LoggedStudent.findOne.mockRejectedValue(error);

      await sendThesisConclusionRequest(req, res);

      expect(cleanupUploads).toHaveBeenCalledWith(
        req.files.thesisFile[0],
        req.files.thesisSummary[0],
        req.files.additionalZip[0],
      );
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'Conflict while saving' });
    });

    test('should return 500 when submit transaction fails without status and cleanup uploads', async () => {
      const req = createConclusionReq();
      const res = createRes();

      LoggedStudent.findOne.mockRejectedValue(new Error('Unexpected submit failure'));

      await sendThesisConclusionRequest(req, res);

      expect(cleanupUploads).toHaveBeenCalledWith(
        req.files.thesisFile[0],
        req.files.thesisSummary[0],
        req.files.additionalZip[0],
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unexpected submit failure' });
    });

    test('should handle invalid JSON fallback and object payloads while submitting without summary/additional files', async () => {
      const req = createConclusionReq();
      const res = createRes();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const thesisRecord = {
        ...createOngoingThesis(),
        thesis_summary_path: 'legacy/summary.pdf',
        additional_zip_path: 'legacy/additional.zip',
      };

      req.files = {
        thesisFile: [createUploadedFile({ path: '/tmp/thesis.pdf' })],
      };
      req.body.coSupervisors = [{ id: 38485, firstName: 'Riccardo', lastName: 'Coppola' }];
      req.body.sdgs = [{ goalId: 5, level: 'primary' }];
      req.body.embargo = { duration: '12_months', motivations: [{ motivationId: 1, otherMotivation: null }] };
      req.body.keywords = '{invalid-json';
      req.body.licenseId = '';

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
      Thesis.findOne.mockResolvedValue(thesisRecord);
      isSummaryRequiredForStudent.mockResolvedValue(false);
      ensureDirExists.mockResolvedValue(undefined);
      writeValidatedPdf.mockResolvedValue(undefined);
      moveFile.mockResolvedValue(undefined);
      Teacher.findAll.mockResolvedValue([{ id: 38485 }]);
      SustainableDevelopmentGoal.findAll.mockResolvedValue([{ id: 5 }]);
      ThesisEmbargo.findOne
        .mockResolvedValueOnce({ id: 9, thesis_id: '1', duration: '18_months' })
        .mockResolvedValueOnce({ id: 10, duration: '12_months' });
      ThesisEmbargo.create.mockResolvedValue({ id: 10, duration: '12_months' });
      EmbargoMotivation.findAll.mockResolvedValue([{ id: 1 }]);
      Thesis.findByPk.mockResolvedValue({
        ...thesisRecord,
        language: 'it',
        title: 'My thesis',
        abstract: 'Abstract IT',
        title_eng: null,
        abstract_eng: null,
        thesis_file_path: 'uploads/thesis_conclusion_request/320213/thesis_320213.pdf',
        thesis_summary_path: null,
        additional_zip_path: null,
        license_id: null,
        status: 'conclusion_requested',
        thesis_conclusion_request_date: new Date('2025-01-02T00:00:00.000Z'),
      });
      ThesisSupervisorCoSupervisor.findAll.mockResolvedValue([{ teacher_id: 3019, is_supervisor: true }]);
      ThesisSustainableDevelopmentGoal.findAll.mockResolvedValue([{ goal_id: 5, sdg_level: 'primary' }]);
      ThesisKeyword.findAll.mockResolvedValue([]);
      ThesisEmbargoMotivation.findAll.mockResolvedValue([{ motivation_id: 1, other_motivation: null }]);

      await sendThesisConclusionRequest(req, res);

      expect(warnSpy).toHaveBeenCalled();
      expect(Keyword.findAll).not.toHaveBeenCalled();
      expect(moveFile).not.toHaveBeenCalled();
      expect(ThesisEmbargoMotivation.destroy).toHaveBeenCalledWith({
        where: { thesis_embargo_id: 9 },
        transaction: 'tx',
      });
      expect(ThesisEmbargo.destroy).toHaveBeenCalledWith({ where: { id: 9 }, transaction: 'tx' });
      expect(thesisRecord.thesis_summary_path).toBeNull();
      expect(thesisRecord.additional_zip_path).toBeNull();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          thesisSummaryPath: null,
          additionalZipPath: null,
        }),
      );

      warnSpy.mockRestore();
    });

    test('should return 400 when one or more live co-supervisors are not found', async () => {
      const req = createConclusionReq();
      const res = createRes();
      const thesisRecord = createOngoingThesis();

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
      Thesis.findOne.mockResolvedValue(thesisRecord);
      isSummaryRequiredForStudent.mockResolvedValue(false);
      ensureDirExists.mockResolvedValue(undefined);
      writeValidatedPdf.mockResolvedValue(undefined);
      moveFile.mockResolvedValue(undefined);
      Teacher.findAll.mockResolvedValue([]);

      await sendThesisConclusionRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'One or more co-supervisors not found' });
    });

    test('should return 400 when one or more SDGs are not found in submit flow', async () => {
      const req = createConclusionReq();
      const res = createRes();
      const thesisRecord = createOngoingThesis();

      req.body.coSupervisors = null;
      req.body.sdgs = JSON.stringify([{ goalId: 5, level: 'primary' }]);
      req.body.keywords = null;
      req.body.embargo = null;

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
      Thesis.findOne.mockResolvedValue(thesisRecord);
      isSummaryRequiredForStudent.mockResolvedValue(false);
      ensureDirExists.mockResolvedValue(undefined);
      writeValidatedPdf.mockResolvedValue(undefined);
      moveFile.mockResolvedValue(undefined);
      SustainableDevelopmentGoal.findAll.mockResolvedValue([]);

      await sendThesisConclusionRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'One or more sustainable development goals not found' });
    });

    test('should return 400 when embargo motivations are missing in submit flow', async () => {
      const req = createConclusionReq();
      const res = createRes();
      const thesisRecord = createOngoingThesis();

      req.body.coSupervisors = null;
      req.body.sdgs = null;
      req.body.keywords = null;
      req.body.embargo = JSON.stringify({
        duration: '12_months',
        motivations: [{ motivationId: 88, otherMotivation: null }],
      });

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
      Thesis.findOne.mockResolvedValue(thesisRecord);
      isSummaryRequiredForStudent.mockResolvedValue(false);
      ensureDirExists.mockResolvedValue(undefined);
      writeValidatedPdf.mockResolvedValue(undefined);
      moveFile.mockResolvedValue(undefined);
      ThesisEmbargo.findOne.mockResolvedValue(null);
      ThesisEmbargo.create.mockResolvedValue({ id: 11, duration: '12_months' });
      EmbargoMotivation.findAll.mockResolvedValue([]);

      await sendThesisConclusionRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'One or more embargo motivations not found' });
    });
  });

  describe('saveThesisConclusionRequestDraft', () => {
    const createDraftReq = () => ({
      body: {
        title: 'Draft title',
        titleEng: 'Draft title EN',
        abstract: 'Draft abstract',
        abstractEng: 'Draft abstract EN',
        language: 'it',
        coSupervisors: JSON.stringify([{ id: 38485, firstName: 'Riccardo', lastName: 'Coppola' }]),
        sdgs: JSON.stringify([{ goalId: 5, level: 'primary' }]),
        licenseId: '',
        removeThesisSummary: 'false',
        removeThesisFile: 'false',
        removeAdditionalZip: 'false',
      },
      files: {
        thesisSummary: [{ path: '/tmp/summary.pdf', mimetype: 'application/pdf', originalname: 'summary.pdf' }],
        thesisFile: [{ path: '/tmp/thesis.pdf', mimetype: 'application/pdf', originalname: 'thesis.pdf' }],
        additionalZip: [{ path: '/tmp/additional.zip', mimetype: 'application/zip', originalname: 'a.zip' }],
      },
    });

    test('should return 200 when draft is saved successfully with real draft utils', async () => {
      const req = createDraftReq();
      const res = createRes();
      const thesisRecord = {
        id: 10,
        student_id: '320213',
        status: 'ongoing',
        title: null,
        title_eng: null,
        abstract: null,
        abstract_eng: null,
        language: null,
        license_id: null,
        thesis_file_path: null,
        thesis_summary_path: null,
        additional_zip_path: null,
        save: jest.fn().mockResolvedValue(undefined),
      };

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213' });
      Thesis.findOne.mockResolvedValue(thesisRecord);
      resolveValidDraftFilePath.mockResolvedValue(null);
      ensureDirExists.mockResolvedValue(undefined);
      moveFile.mockResolvedValue(undefined);
      Teacher.findAll.mockResolvedValue([{ id: 38485 }]);
      SustainableDevelopmentGoal.findAll.mockResolvedValue([{ id: 5 }]);

      await saveThesisConclusionRequestDraft(req, res);

      expect(Thesis.findOne).toHaveBeenCalledWith({
        where: { student_id: '320213' },
        transaction: 'tx',
      });
      expect(ensureDirExists).toHaveBeenCalled();
      expect(moveFile).toHaveBeenCalledWith(
        '/tmp/thesis.pdf',
        expect.stringContaining('/uploads/thesis_conclusion_draft/320213/'),
      );
      expect(ThesisSupervisorCoSupervisor.destroy).toHaveBeenCalledWith({
        where: { thesis_id: 10, is_supervisor: false, scope: 'draft' },
        transaction: 'tx',
      });
      expect(ThesisSustainableDevelopmentGoal.bulkCreate).toHaveBeenCalledWith(
        [{ thesis_id: 10, goal_id: 5, sdg_level: 'primary' }],
        { transaction: 'tx' },
      );
      expect(thesisRecord.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Draft saved successfully' });
    });

    test('should return 400 on zod validation errors and cleanup uploads', async () => {
      const req = {
        body: {},
        files: {
          thesisFile: [{ path: '/tmp/thesis.txt', mimetype: 'text/plain', originalname: 'thesis.txt' }],
        },
      };
      const res = createRes();

      await saveThesisConclusionRequestDraft(req, res);

      expect(cleanupUploads).toHaveBeenCalledWith(null, req.files.thesisFile[0], null);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0]).toEqual({ error: expect.any(String) });
    });

    test('should return 401 when no logged student is found using real getLoggedStudentOrThrow', async () => {
      const req = createDraftReq();
      const res = createRes();
      LoggedStudent.findOne.mockResolvedValue(null);

      await saveThesisConclusionRequestDraft(req, res);

      expect(cleanupUploads).toHaveBeenCalledWith(
        req.files.thesisSummary[0],
        req.files.thesisFile[0],
        req.files.additionalZip[0],
      );
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    test('should return 500 when draft save flow throws an unexpected error without status', async () => {
      const req = createDraftReq();
      const res = createRes();

      LoggedStudent.findOne.mockRejectedValue(new Error('Draft save failed unexpectedly'));

      await saveThesisConclusionRequestDraft(req, res);

      expect(cleanupUploads).toHaveBeenCalledWith(
        req.files.thesisSummary[0],
        req.files.thesisFile[0],
        req.files.additionalZip[0],
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Draft save failed unexpectedly' });
    });

    test('should parse nullable text and boolean remove flags when provided as native values', async () => {
      const req = createDraftReq();
      const res = createRes();
      req.body.title = null;
      req.body.removeThesisSummary = true;
      req.body.removeThesisFile = false;
      req.body.removeAdditionalZip = true;
      LoggedStudent.findOne.mockResolvedValue(null);

      await saveThesisConclusionRequestDraft(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    test('should map non-empty licenseId and non-string title to schema validation error', async () => {
      const req = createDraftReq();
      const res = createRes();
      req.body.licenseId = '2';
      req.body.title = { invalid: true };

      await saveThesisConclusionRequestDraft(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0]).toEqual({ error: expect.any(String) });
    });

    test('should reject invalid optional boolean values in draft payload', async () => {
      const req = createDraftReq();
      const res = createRes();
      req.body.removeThesisSummary = 'maybe';

      await saveThesisConclusionRequestDraft(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0]).toEqual({ error: expect.any(String) });
    });

    test('should remove stored draft file when removal flag is true and file is missing in request', async () => {
      const req = createDraftReq();
      const res = createRes();
      const thesisRecord = {
        id: 10,
        student_id: '320213',
        status: 'ongoing',
        thesis_file_path: 'uploads/thesis_conclusion_draft/320213/old-thesis.pdf',
        save: jest.fn().mockResolvedValue(undefined),
      };

      req.files = {};
      req.body = {
        removeThesisFile: 'true',
      };

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213' });
      Thesis.findOne.mockResolvedValue(thesisRecord);
      resolveValidDraftFilePath.mockResolvedValue('uploads/thesis_conclusion_draft/320213/old-thesis.pdf');

      await saveThesisConclusionRequestDraft(req, res);

      expect(safeUnlink).toHaveBeenCalledWith(
        expect.stringContaining('uploads/thesis_conclusion_draft/320213/old-thesis.pdf'),
      );
      expect(thesisRecord.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should unlink old stored draft file when replacing with a new file name', async () => {
      const req = createDraftReq();
      const res = createRes();
      const thesisRecord = {
        id: 10,
        student_id: '320213',
        status: 'ongoing',
        thesis_file_path: 'uploads/thesis_conclusion_draft/320213/old-thesis.pdf',
        save: jest.fn().mockResolvedValue(undefined),
      };

      req.files = {
        thesisFile: [{ path: '/tmp/new-thesis.pdf', mimetype: 'application/pdf', originalname: 'new-thesis.pdf' }],
      };
      req.body = {};

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213' });
      Thesis.findOne.mockResolvedValue(thesisRecord);
      resolveValidDraftFilePath.mockResolvedValue('uploads/thesis_conclusion_draft/320213/old-thesis.pdf');
      moveFile.mockResolvedValue(undefined);
      ensureDirExists.mockResolvedValue(undefined);

      await saveThesisConclusionRequestDraft(req, res);

      expect(safeUnlink).toHaveBeenCalledWith(
        expect.stringContaining('uploads/thesis_conclusion_draft/320213/old-thesis.pdf'),
      );
      expect(moveFile).toHaveBeenCalledWith(
        '/tmp/new-thesis.pdf',
        expect.stringContaining('/uploads/thesis_conclusion_draft/320213/new-thesis.pdf'),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should return 400 when draft co-supervisor ids do not match teachers', async () => {
      const req = createDraftReq();
      const res = createRes();
      const thesisRecord = {
        id: 10,
        student_id: '320213',
        status: 'ongoing',
        save: jest.fn().mockResolvedValue(undefined),
      };

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213' });
      Thesis.findOne.mockResolvedValue(thesisRecord);
      Teacher.findAll.mockResolvedValue([]);

      await saveThesisConclusionRequestDraft(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'One or more co-supervisors not found' });
    });

    test('should return 400 when draft sdg ids do not match existing goals', async () => {
      const req = createDraftReq();
      const res = createRes();
      const thesisRecord = {
        id: 10,
        student_id: '320213',
        status: 'ongoing',
        save: jest.fn().mockResolvedValue(undefined),
      };

      req.body.coSupervisors = undefined;
      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213' });
      Thesis.findOne.mockResolvedValue(thesisRecord);
      SustainableDevelopmentGoal.findAll.mockResolvedValue([]);

      await saveThesisConclusionRequestDraft(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'One or more sustainable development goals not found' });
    });

    test('should return 400 when thesis status is not ongoing in draft save flow', async () => {
      const req = createDraftReq();
      const res = createRes();
      const thesisRecord = {
        id: 10,
        student_id: '320213',
        status: 'final_exam',
        save: jest.fn().mockResolvedValue(undefined),
      };

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213' });
      Thesis.findOne.mockResolvedValue(thesisRecord);

      await saveThesisConclusionRequestDraft(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No draft can be saved for current thesis status' });
    });
  });

  describe('getSessionDeadlines', () => {
    test('should return 401 when no logged student is found', async () => {
      const req = {};
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue(null);

      await getSessionDeadlines(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No logged-in student found' });
    });

    test('should use thesis_request deadline type for students without application and thesis', async () => {
      const req = {};
      const res = createRes();
      const upcoming = [
        {
          id: 1,
          deadline_type: 'thesis_request',
          graduation_session_id: 10,
          graduation_session: { id: 10, session_name: 'March' },
        },
      ];
      const sessionDeadlines = [{ id: 2, graduation_session_id: 10, deadline_type: 'exams' }];

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Thesis.findOne.mockResolvedValue(null);
      ThesisApplication.findOne.mockResolvedValue(null);
      Deadline.findAll.mockResolvedValueOnce(upcoming).mockResolvedValueOnce(sessionDeadlines);

      await getSessionDeadlines(req, res);

      expect(Deadline.findAll).toHaveBeenCalledTimes(2);
      expect(Deadline.findAll.mock.calls[0][0].where.deadline_type).toBe('thesis_request');
      expect(Deadline.findAll.mock.calls[1][0].where.graduation_session_id).toBe(10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        graduationSession: upcoming[0].graduation_session,
        deadlines: sessionDeadlines,
      });
    });

    test('should use conclusion_request deadline type for students with active application', async () => {
      const req = {};
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Thesis.findOne.mockResolvedValue(null);
      ThesisApplication.findOne.mockResolvedValue({ id: 1, status: 'pending' });
      Deadline.findAll.mockResolvedValueOnce([
        {
          id: 5,
          deadline_type: 'conclusion_request',
          graduation_session_id: 20,
          graduation_session: { id: 20, session_name: 'July' },
        },
      ]);
      Deadline.findAll.mockResolvedValueOnce([]);

      await getSessionDeadlines(req, res);

      expect(Deadline.findAll.mock.calls[0][0].where.deadline_type).toBe('conclusion_request');
    });

    test('should use final_exam_registration deadline type when thesis exists', async () => {
      const req = {};
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Thesis.findOne.mockResolvedValue({ id: 1, status: 'final_exam' });
      ThesisApplication.findOne.mockResolvedValue(null);
      Deadline.findAll.mockResolvedValueOnce([
        {
          id: 6,
          deadline_type: 'final_exam_registration',
          graduation_session_id: 30,
          graduation_session: { id: 30, session_name: 'September' },
        },
      ]);
      Deadline.findAll.mockResolvedValueOnce([]);

      await getSessionDeadlines(req, res);

      expect(Deadline.findAll.mock.calls[0][0].where.deadline_type).toBe('final_exam_registration');
    });

    test('should force next session when final upload was rejected', async () => {
      const req = {};
      const res = createRes();
      const firstDeadline = {
        id: 11,
        deadline_type: 'final_exam_registration',
        graduation_session_id: 100,
        graduation_session: { id: 100, session_name: 'June' },
      };
      const secondDeadline = {
        id: 12,
        deadline_type: 'final_exam_registration',
        graduation_session_id: 101,
        graduation_session: { id: 101, session_name: 'July' },
      };

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Thesis.findOne.mockResolvedValue({
        id: 1,
        status: 'ongoing',
        thesis_application_id: 555,
      });
      ThesisApplication.findOne.mockResolvedValue(null);
      ThesisApplicationStatusHistory.findOne.mockResolvedValue({ id: 1 });
      Deadline.findAll
        .mockResolvedValueOnce([firstDeadline, secondDeadline])
        .mockResolvedValueOnce([{ id: 99, graduation_session_id: 101 }]);

      await getSessionDeadlines(req, res);

      expect(ThesisApplicationStatusHistory.findOne).toHaveBeenCalledWith({
        where: {
          thesis_application_id: 555,
          old_status: 'final_thesis',
          new_status: 'ongoing',
        },
        order: [['change_date', 'DESC']],
      });
      expect(Deadline.findAll.mock.calls[1][0].where.graduation_session_id).toBe(101);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].graduationSession).toEqual(secondDeadline.graduation_session);
    });

    test('should keep first session when forced-next lookup has no different upcoming session', async () => {
      const req = {};
      const res = createRes();
      const firstDeadline = {
        id: 21,
        deadline_type: 'final_exam_registration',
        graduation_session_id: 200,
        graduation_session: { id: 200, session_name: 'October' },
      };

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Thesis.findOne.mockResolvedValue({
        id: 1,
        status: 'ongoing',
        thesis_application_id: 777,
      });
      ThesisApplication.findOne.mockResolvedValue(null);
      ThesisApplicationStatusHistory.findOne.mockResolvedValue({ id: 2 });
      Deadline.findAll
        .mockResolvedValueOnce([firstDeadline])
        .mockResolvedValueOnce([{ id: 201, graduation_session_id: 200 }]);

      await getSessionDeadlines(req, res);

      expect(Deadline.findAll.mock.calls[1][0].where.graduation_session_id).toBe(200);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].graduationSession).toEqual(firstDeadline.graduation_session);
    });

    test('should return 404 when no upcoming deadline is found', async () => {
      const req = {};
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Thesis.findOne.mockResolvedValue(null);
      ThesisApplication.findOne.mockResolvedValue(null);
      Deadline.findAll.mockResolvedValueOnce([]);

      await getSessionDeadlines(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'No upcoming deadline found for this flag' });
    });

    test('should return 500 when selected deadline has no graduation session id', async () => {
      const req = {};
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Thesis.findOne.mockResolvedValue(null);
      ThesisApplication.findOne.mockResolvedValue(null);
      Deadline.findAll.mockResolvedValueOnce([{ id: 20, graduation_session: {} }]);

      await getSessionDeadlines(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Graduation session not found for deadline' });
    });
  });

  describe('uploadFinalThesis', () => {
    test('should return 400 when thesis file is missing', async () => {
      const req = { files: {} };
      const res = createRes();

      await uploadFinalThesis(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing thesis file' });
    });

    test('should return 401 and cleanup uploads when no logged student is found', async () => {
      const req = {
        files: {
          thesisFile: [createUploadedFile({ path: '/tmp/thesis.pdf' })],
          thesisSummary: [createUploadedFile({ path: '/tmp/summary.pdf' })],
          additionalZip: [createUploadedFile({ path: '/tmp/additional.zip', mimetype: 'application/zip' })],
        },
      };
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue(null);

      await uploadFinalThesis(req, res);

      expect(cleanupUploads).toHaveBeenCalledWith(
        req.files.thesisFile[0],
        req.files.thesisSummary[0],
        req.files.additionalZip[0],
      );
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    test('should return 404 and cleanup uploads when logged student does not exist', async () => {
      const req = {
        files: {
          thesisFile: [createUploadedFile({ path: '/tmp/thesis.pdf' })],
          thesisSummary: [createUploadedFile({ path: '/tmp/summary.pdf' })],
          additionalZip: [createUploadedFile({ path: '/tmp/additional.zip', mimetype: 'application/zip' })],
        },
      };
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue(null);

      await uploadFinalThesis(req, res);

      expect(cleanupUploads).toHaveBeenCalledWith(
        req.files.thesisFile[0],
        req.files.thesisSummary[0],
        req.files.additionalZip[0],
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student not found' });
    });

    test('should return 400 and cleanup uploads when summary is required but missing', async () => {
      const req = {
        files: {
          thesisFile: [createUploadedFile({ path: '/tmp/thesis.pdf' })],
          additionalZip: [createUploadedFile({ path: '/tmp/additional.zip', mimetype: 'application/zip' })],
        },
      };
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
      isSummaryRequiredForStudent.mockResolvedValue(true);

      await uploadFinalThesis(req, res);

      expect(cleanupUploads).toHaveBeenCalledWith(req.files.thesisFile[0], req.files.additionalZip[0]);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing thesis summary file' });
    });

    test('should return validation error when thesis PDF validation fails', async () => {
      const req = {
        files: {
          thesisFile: [createUploadedFile({ path: '/tmp/thesis.pdf' })],
          thesisSummary: [createUploadedFile({ path: '/tmp/summary.pdf' })],
          additionalZip: [createUploadedFile({ path: '/tmp/additional.zip', mimetype: 'application/zip' })],
        },
      };
      const res = createRes();
      const validationError = new Error('Invalid PDF/A');
      validationError.status = 422;

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
      isSummaryRequiredForStudent.mockResolvedValue(false);
      writeValidatedPdf.mockRejectedValueOnce(validationError);

      await uploadFinalThesis(req, res);

      expect(ensureDirExists).toHaveBeenCalledTimes(1);
      expect(cleanupUploads).toHaveBeenCalledWith(req.files.thesisSummary[0], req.files.additionalZip[0]);
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid PDF/A' });
    });

    test('should return 500 when thesis PDF validation fails without status', async () => {
      const req = {
        files: {
          thesisFile: [createUploadedFile({ path: '/tmp/thesis.pdf' })],
          thesisSummary: [createUploadedFile({ path: '/tmp/summary.pdf' })],
          additionalZip: [createUploadedFile({ path: '/tmp/additional.zip', mimetype: 'application/zip' })],
        },
      };
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
      isSummaryRequiredForStudent.mockResolvedValue(false);
      writeValidatedPdf.mockRejectedValueOnce(new Error('Invalid PDF/A without status'));

      await uploadFinalThesis(req, res);

      expect(cleanupUploads).toHaveBeenCalledWith(req.files.thesisSummary[0], req.files.additionalZip[0]);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid PDF/A without status' });
    });

    test('should return validation error when summary PDF validation fails', async () => {
      const req = {
        files: {
          thesisFile: [createUploadedFile({ path: '/tmp/thesis.pdf' })],
          thesisSummary: [createUploadedFile({ path: '/tmp/summary.pdf' })],
          additionalZip: [createUploadedFile({ path: '/tmp/additional.zip', mimetype: 'application/zip' })],
        },
      };
      const res = createRes();
      const validationError = new Error('Invalid summary PDF/A');
      validationError.status = 415;

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
      isSummaryRequiredForStudent.mockResolvedValue(true);
      writeValidatedPdf.mockResolvedValueOnce(undefined).mockRejectedValueOnce(validationError);

      await uploadFinalThesis(req, res);

      expect(cleanupUploads).toHaveBeenCalledWith(req.files.additionalZip[0]);
      expect(res.status).toHaveBeenCalledWith(415);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid summary PDF/A' });
    });

    test('should return 500 when summary PDF validation fails without status', async () => {
      const req = {
        files: {
          thesisFile: [createUploadedFile({ path: '/tmp/thesis.pdf' })],
          thesisSummary: [createUploadedFile({ path: '/tmp/summary.pdf' })],
          additionalZip: [createUploadedFile({ path: '/tmp/additional.zip', mimetype: 'application/zip' })],
        },
      };
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
      isSummaryRequiredForStudent.mockResolvedValue(true);
      writeValidatedPdf
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Invalid summary PDF/A without status'));

      await uploadFinalThesis(req, res);

      expect(cleanupUploads).toHaveBeenCalledWith(req.files.additionalZip[0]);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid summary PDF/A without status' });
    });

    test('should return transaction 404 payload when thesis is not found', async () => {
      const req = {
        files: {
          thesisFile: [createUploadedFile({ path: '/tmp/thesis.pdf' })],
        },
      };
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
      isSummaryRequiredForStudent.mockResolvedValue(false);
      writeValidatedPdf.mockResolvedValueOnce(undefined);
      Thesis.findOne.mockResolvedValue(null);

      await uploadFinalThesis(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Thesis not found' });
    });

    test('should return transaction 400 payload when thesis is not in final_exam state', async () => {
      const req = {
        files: {
          thesisFile: [createUploadedFile({ path: '/tmp/thesis.pdf' })],
        },
      };
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
      isSummaryRequiredForStudent.mockResolvedValue(false);
      writeValidatedPdf.mockResolvedValueOnce(undefined);
      Thesis.findOne.mockResolvedValue({
        id: 1,
        status: 'ongoing',
        thesis_application_id: 100,
        save: jest.fn(),
      });

      await uploadFinalThesis(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Thesis is not in a final exam state' });
    });

    test('should upload files and set status to final_thesis on success', async () => {
      const req = {
        files: {
          thesisFile: [createUploadedFile({ path: '/tmp/thesis.pdf' })],
          thesisSummary: [createUploadedFile({ path: '/tmp/summary.pdf' })],
          additionalZip: [createUploadedFile({ path: '/tmp/additional.zip', mimetype: 'application/zip' })],
        },
      };
      const res = createRes();
      const thesisRecord = {
        id: 1,
        status: 'final_exam',
        thesis_application_id: 100,
        thesis_file: 'legacy',
        thesis_file_path: null,
        thesis_summary: 'legacy',
        thesis_summary_path: null,
        additional_zip: 'legacy',
        additional_zip_path: null,
        save: jest.fn().mockResolvedValue(undefined),
      };

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
      isSummaryRequiredForStudent.mockResolvedValue(true);
      writeValidatedPdf.mockResolvedValue(undefined);
      Thesis.findOne.mockResolvedValue(thesisRecord);
      ThesisApplicationStatusHistory.create.mockResolvedValue(undefined);
      moveFile.mockResolvedValue(undefined);

      await uploadFinalThesis(req, res);

      expect(writeValidatedPdf).toHaveBeenCalledTimes(2);
      expect(moveFile).toHaveBeenCalledWith(
        '/tmp/additional.zip',
        expect.stringContaining('final_additional_320213.zip'),
      );
      expect(ThesisApplicationStatusHistory.create).toHaveBeenCalledWith(
        {
          thesis_application_id: 100,
          old_status: 'final_exam',
          new_status: 'final_thesis',
        },
        { transaction: 'tx' },
      );
      expect(thesisRecord.status).toBe('final_thesis');
      expect(thesisRecord.thesis_file_path).toContain('uploads/final_thesis/320213/final_thesis_320213.pdf');
      expect(thesisRecord.thesis_summary_path).toContain('uploads/final_thesis/320213/final_summary_320213.pdf');
      expect(thesisRecord.additional_zip_path).toContain('uploads/final_thesis/320213/final_additional_320213.zip');
      expect(thesisRecord.save).toHaveBeenCalledWith({ transaction: 'tx' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Final thesis uploaded successfully' });
    });

    test('should upload only thesis when summary is not required and additional zip is missing', async () => {
      const req = {
        files: {
          thesisFile: [createUploadedFile({ path: '/tmp/thesis.pdf' })],
        },
      };
      const res = createRes();
      const thesisRecord = {
        id: 2,
        status: 'final_exam',
        thesis_application_id: 101,
        thesis_file: 'legacy',
        thesis_file_path: null,
        thesis_summary: 'legacy',
        thesis_summary_path: 'uploads/final_thesis/320213/legacy_summary.pdf',
        additional_zip: 'legacy',
        additional_zip_path: 'uploads/final_thesis/320213/legacy_additional.zip',
        save: jest.fn().mockResolvedValue(undefined),
      };

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
      isSummaryRequiredForStudent.mockResolvedValue(false);
      writeValidatedPdf.mockResolvedValue(undefined);
      Thesis.findOne.mockResolvedValue(thesisRecord);
      ThesisApplicationStatusHistory.create.mockResolvedValue(undefined);

      await uploadFinalThesis(req, res);

      expect(writeValidatedPdf).toHaveBeenCalledTimes(1);
      expect(moveFile).not.toHaveBeenCalled();
      expect(thesisRecord.thesis_file_path).toContain('uploads/final_thesis/320213/final_thesis_320213.pdf');
      expect(thesisRecord.thesis_summary_path).toBe('uploads/final_thesis/320213/legacy_summary.pdf');
      expect(thesisRecord.additional_zip_path).toBe('uploads/final_thesis/320213/legacy_additional.zip');
      expect(thesisRecord.save).toHaveBeenCalledWith({ transaction: 'tx' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Final thesis uploaded successfully' });
    });

    test('should return 500 from outer catch when an unexpected error occurs', async () => {
      const req = {
        files: {
          thesisFile: [createUploadedFile({ path: '/tmp/thesis.pdf' })],
        },
      };
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
      isSummaryRequiredForStudent.mockResolvedValue(false);
      ensureDirExists.mockRejectedValue(new Error('Disk unavailable'));

      await uploadFinalThesis(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Disk unavailable' });
    });
  });

  describe('getThesisConclusionRequestDraft', () => {
    test('should return 401 when no logged student is found', async () => {
      const req = {};
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue(null);

      await getThesisConclusionRequestDraft(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    test('should return 404 when logged student row cannot be resolved', async () => {
      const req = {};
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue(null);

      await getThesisConclusionRequestDraft(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student not found' });
    });

    test('should return 404 when thesis is not found for student', async () => {
      const req = {};
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213' });
      Thesis.findOne.mockResolvedValue(null);

      await getThesisConclusionRequestDraft(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Thesis not found' });
    });

    test('should return draft payload with filtered co-supervisors and sdgs', async () => {
      const req = {};
      const res = createRes();
      const thesisDraftDate = new Date('2025-01-15T10:00:00.000Z');

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213' });
      Thesis.findOne.mockResolvedValue({
        id: 1,
        title: 'Titolo',
        title_eng: 'Title',
        abstract: 'Abstract IT',
        abstract_eng: 'Abstract EN',
        language: 'it',
        license_id: 2,
        thesis_file_path: 'uploads/thesis_conclusion_draft/320213/thesis.pdf',
        thesis_summary_path: 'uploads/thesis_conclusion_draft/320213/summary.pdf',
        additional_zip_path: 'uploads/thesis_conclusion_draft/320213/additional.zip',
        thesis_draft_date: thesisDraftDate,
      });
      ThesisSupervisorCoSupervisor.findAll.mockResolvedValue([{ teacher_id: 3019 }, { teacher_id: 99999 }]);
      selectTeacherAttributes.mockReturnValue(['id', 'first_name', 'last_name']);
      Teacher.findAll.mockResolvedValue([{ id: 3019, first_name: 'Marco', last_name: 'Torchiano' }]);
      resolveValidDraftFilePath
        .mockResolvedValueOnce('uploads/thesis_conclusion_draft/320213/thesis.pdf')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('uploads/thesis_conclusion_draft/320213/additional.zip');
      ThesisSustainableDevelopmentGoal.findAll.mockResolvedValue([{ goal_id: 5, sdg_level: 'primary' }]);
      ThesisEmbargo.findOne.mockResolvedValue({ id: 19, duration: '18_months' });
      ThesisEmbargoMotivation.findAll.mockResolvedValue([
        { motivation_id: 2, other_motivation: null },
        { motivation_id: 7, other_motivation: 'Accordo aziendale' },
      ]);

      await getThesisConclusionRequestDraft(req, res);

      const teacherFindArgs = Teacher.findAll.mock.calls[0][0];
      expect(teacherFindArgs.attributes).toEqual(['id', 'first_name', 'last_name']);
      const idFilterValues = Reflect.ownKeys(teacherFindArgs.where.id).map(key => teacherFindArgs.where.id[key]);
      expect(idFilterValues).toContainEqual([3019, 99999]);
      expect(resolveValidDraftFilePath).toHaveBeenNthCalledWith(
        1,
        'uploads/thesis_conclusion_draft/320213/thesis.pdf',
        '320213',
        expect.any(String),
      );
      expect(resolveValidDraftFilePath).toHaveBeenNthCalledWith(
        2,
        'uploads/thesis_conclusion_draft/320213/summary.pdf',
        '320213',
        expect.any(String),
      );
      expect(resolveValidDraftFilePath).toHaveBeenNthCalledWith(
        3,
        'uploads/thesis_conclusion_draft/320213/additional.zip',
        '320213',
        expect.any(String),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Titolo',
          titleEng: 'Title',
          abstract: 'Abstract IT',
          abstractEng: 'Abstract EN',
          language: 'it',
          licenseId: 2,
          thesisFilePath: 'uploads/thesis_conclusion_draft/320213/thesis.pdf',
          thesisSummaryPath: null,
          additionalZipPath: 'uploads/thesis_conclusion_draft/320213/additional.zip',
          thesisDraftDate: thesisDraftDate.toISOString(),
          coSupervisors: [expect.objectContaining({ id: 3019, firstName: 'Marco', lastName: 'Torchiano' })],
          embargo: {
            duration: '18_months',
            motivations: [
              { motivationId: 2, otherMotivation: null },
              { motivationId: 7, otherMotivation: 'Accordo aziendale' },
            ],
          },
          sdgs: [{ goalId: 5, level: 'primary' }],
        }),
      );
    });

    test('should map nullable draft fields to nulls when thesis payload is sparse', async () => {
      const req = {};
      const res = createRes();

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213' });
      Thesis.findOne.mockResolvedValue({
        id: 2,
        title: null,
        title_eng: null,
        abstract: null,
        abstract_eng: null,
        language: null,
        license_id: null,
        thesis_file_path: null,
        thesis_summary_path: null,
        additional_zip_path: null,
        thesis_draft_date: null,
      });
      ThesisSupervisorCoSupervisor.findAll.mockResolvedValue([]);
      resolveValidDraftFilePath.mockResolvedValue(null);
      ThesisSustainableDevelopmentGoal.findAll.mockResolvedValue([]);
      ThesisEmbargo.findOne.mockResolvedValue(null);

      await getThesisConclusionRequestDraft(req, res);

      expect(Teacher.findAll).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        title: null,
        titleEng: null,
        abstract: null,
        abstractEng: null,
        language: null,
        licenseId: null,
        thesisFilePath: null,
        thesisSummaryPath: null,
        additionalZipPath: null,
        thesisDraftDate: null,
        coSupervisors: [],
        embargo: null,
        sdgs: [],
        keywords: [],
      });
    });

    test('should return 500 when draft retrieval fails with an unexpected error without status', async () => {
      const req = {};
      const res = createRes();

      LoggedStudent.findOne.mockRejectedValue(new Error('Draft retrieval failed'));

      await getThesisConclusionRequestDraft(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Draft retrieval failed' });
    });

    test('should return custom status when an internal error has a status code', async () => {
      const req = {};
      const res = createRes();
      const err = new Error('Storage unavailable');
      err.status = 503;

      LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
      Student.findByPk.mockResolvedValue({ id: '320213' });
      Thesis.findOne.mockResolvedValue({
        id: 1,
        thesis_file_path: 'uploads/thesis_conclusion_draft/320213/thesis.pdf',
        thesis_summary_path: null,
        additional_zip_path: null,
      });
      ThesisSupervisorCoSupervisor.findAll.mockResolvedValue([]);
      resolveValidDraftFilePath.mockRejectedValue(err);

      await getThesisConclusionRequestDraft(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({ error: 'Storage unavailable' });
    });
  });
});

describe('Real thesis conclusion utils edge branches', () => {
  const baseSubmitRequestData = {
    title: 'Title',
    titleEng: 'Title EN',
    abstract: 'Abstract',
    abstractEng: 'Abstract EN',
    language: 'it',
    coSupervisors: null,
    sdgs: null,
    keywords: null,
    licenseId: 1,
    embargo: null,
  };

  const baseSubmitFiles = {
    thesisFile: { path: '/tmp/thesis.pdf', mimetype: 'application/pdf', originalname: 'thesis.pdf' },
    thesisSummary: null,
    additionalZip: null,
  };

  const baseThesisRecord = () => ({
    id: 1,
    student_id: '320213',
    thesis_application_id: 100,
    status: 'ongoing',
    title: null,
    title_eng: null,
    abstract: null,
    abstract_eng: null,
    language: null,
    thesis_file_path: null,
    thesis_summary_path: null,
    additional_zip_path: null,
    save: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getLoggedStudentOrThrow should throw 404 when student cannot be loaded', async () => {
    LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
    Student.findByPk.mockResolvedValue(null);

    await expect(getLoggedStudentOrThrow()).rejects.toMatchObject({
      status: 404,
      message: 'Student not found',
    });
  });

  test('saveDraftTransaction should throw 404 when thesis does not exist', async () => {
    Thesis.findOne.mockResolvedValue(null);

    await expect(
      saveDraftTransaction({
        loggedStudent: { id: '320213' },
        draftData: {},
        files: {},
        baseUploadDir: '/tmp/base',
        draftUploadDir: '/tmp/base/draft',
        transaction: 'tx',
      }),
    ).rejects.toMatchObject({
      status: 404,
      message: 'Thesis not found',
    });
  });

  test('saveDraftTransaction should skip stored file removal when path is missing or unresolved', async () => {
    const thesisRecord = {
      id: 10,
      student_id: '320213',
      status: 'ongoing',
      thesis_summary_path: null,
      additional_zip_path: 'uploads/thesis_conclusion_draft/320213/missing.zip',
      save: jest.fn().mockResolvedValue(undefined),
    };
    Thesis.findOne.mockResolvedValue(thesisRecord);
    resolveValidDraftFilePath.mockResolvedValue(null);

    await saveDraftTransaction({
      loggedStudent: { id: '320213' },
      draftData: {
        removeThesisSummary: true,
        removeAdditionalZip: true,
      },
      files: {},
      baseUploadDir: '/tmp/base',
      draftUploadDir: '/tmp/base/draft',
      transaction: 'tx',
    });

    expect(resolveValidDraftFilePath).toHaveBeenCalledTimes(1);
    expect(safeUnlink).not.toHaveBeenCalled();
  });

  test('saveDraftTransaction should return early when coSupervisors list is empty', async () => {
    const thesisRecord = {
      id: 10,
      student_id: '320213',
      status: 'ongoing',
      save: jest.fn().mockResolvedValue(undefined),
    };
    Thesis.findOne.mockResolvedValue(thesisRecord);

    await saveDraftTransaction({
      loggedStudent: { id: '320213' },
      draftData: {
        coSupervisors: [],
      },
      files: {},
      baseUploadDir: '/tmp/base',
      draftUploadDir: '/tmp/base/draft',
      transaction: 'tx',
    });

    expect(Teacher.findAll).not.toHaveBeenCalled();
    expect(ThesisSupervisorCoSupervisor.bulkCreate).not.toHaveBeenCalled();
  });

  test('saveDraftTransaction should return early when sdg list has no numeric ids', async () => {
    const thesisRecord = {
      id: 10,
      student_id: '320213',
      status: 'ongoing',
      save: jest.fn().mockResolvedValue(undefined),
    };
    Thesis.findOne.mockResolvedValue(thesisRecord);

    await saveDraftTransaction({
      loggedStudent: { id: '320213' },
      draftData: {
        sdgs: [{ goalId: 'not-a-number', level: 'primary' }],
      },
      files: {},
      baseUploadDir: '/tmp/base',
      draftUploadDir: '/tmp/base/draft',
      transaction: 'tx',
    });

    expect(SustainableDevelopmentGoal.findAll).not.toHaveBeenCalled();
    expect(ThesisSustainableDevelopmentGoal.destroy).toHaveBeenCalledWith({
      where: { thesis_id: 10 },
      transaction: 'tx',
    });
    expect(ThesisSustainableDevelopmentGoal.bulkCreate).not.toHaveBeenCalled();
  });

  test('saveDraftTransaction should normalize EN text, move file without originalname and persist mixed co-supervisors/sdgs', async () => {
    const thesisRecord = {
      id: 10,
      student_id: '320213',
      status: 'ongoing',
      thesis_file_path: 'uploads/thesis_conclusion_draft/320213/old-thesis.pdf',
      save: jest.fn().mockResolvedValue(undefined),
    };
    Thesis.findOne.mockResolvedValue(thesisRecord);
    resolveValidDraftFilePath.mockResolvedValueOnce('uploads/thesis_conclusion_draft/320213/old-thesis.pdf');
    Teacher.findAll.mockResolvedValue([{ id: 3019 }, { id: 38485 }]);
    SustainableDevelopmentGoal.findAll.mockResolvedValue([{ id: 5 }, { id: 7 }]);
    moveFile.mockResolvedValue(undefined);
    ensureDirExists.mockResolvedValue(undefined);

    await saveDraftTransaction({
      loggedStudent: { id: '320213' },
      draftData: {
        title: undefined,
        titleEng: 'English title',
        abstract: undefined,
        abstractEng: 'English abstract',
        language: 'en',
        licenseId: 2,
        coSupervisors: [3019, { id: 38485 }],
        sdgs: [7, { goalId: 5, level: 'secondary' }, { goalId: 5, level: 'primary' }],
      },
      files: {
        thesisFile: { path: '/tmp/incoming/new-thesis.pdf', mimetype: 'application/pdf' },
      },
      baseUploadDir: '/tmp/base',
      draftUploadDir: '/tmp/base/uploads/thesis_conclusion_draft/320213',
      transaction: 'tx',
    });

    expect(ensureDirExists).toHaveBeenCalledWith('/tmp/base/uploads/thesis_conclusion_draft/320213');
    expect(moveFile).toHaveBeenCalledWith(
      '/tmp/incoming/new-thesis.pdf',
      '/tmp/base/uploads/thesis_conclusion_draft/320213/new-thesis.pdf',
    );
    expect(safeUnlink).toHaveBeenCalledWith('/tmp/base/uploads/thesis_conclusion_draft/320213/old-thesis.pdf');
    expect(thesisRecord.title).toBe('English title');
    expect(thesisRecord.title_eng).toBe('English title');
    expect(thesisRecord.abstract).toBe('English abstract');
    expect(thesisRecord.abstract_eng).toBe('English abstract');
    expect(thesisRecord.license_id).toBe(2);
    expect(ThesisSupervisorCoSupervisor.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ teacher_id: 3019, scope: 'draft', is_supervisor: false }),
        expect.objectContaining({ teacher_id: 38485, scope: 'draft', is_supervisor: false }),
      ]),
      { transaction: 'tx' },
    );
    expect(ThesisSustainableDevelopmentGoal.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        { thesis_id: 10, goal_id: 5, sdg_level: 'primary' },
        { thesis_id: 10, goal_id: 7, sdg_level: 'secondary' },
      ]),
      { transaction: 'tx' },
    );
    expect(thesisRecord.save).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction: 'tx',
        fields: expect.arrayContaining([
          'title',
          'title_eng',
          'abstract',
          'abstract_eng',
          'language',
          'license_id',
          'thesis_draft_date',
          'thesis_file_path',
        ]),
      }),
    );
  });

  test('saveDraftTransaction should keep stored file when destination is unchanged and handle null co-supervisors/sdgs', async () => {
    const thesisRecord = {
      id: 11,
      student_id: '320213',
      status: 'ongoing',
      thesis_file_path: 'uploads/thesis_conclusion_draft/320213/same-file.pdf',
      save: jest.fn().mockResolvedValue(undefined),
    };
    Thesis.findOne.mockResolvedValue(thesisRecord);
    resolveValidDraftFilePath.mockResolvedValueOnce('uploads/thesis_conclusion_draft/320213/same-file.pdf');
    moveFile.mockResolvedValue(undefined);
    ensureDirExists.mockResolvedValue(undefined);

    await saveDraftTransaction({
      loggedStudent: { id: '320213' },
      draftData: {
        title: null,
        titleEng: null,
        abstract: null,
        abstractEng: null,
        language: 'en',
        coSupervisors: null,
        sdgs: null,
      },
      files: {
        thesisFile: { path: '/tmp/incoming/same-file.pdf', mimetype: 'application/pdf', originalname: 'same-file.pdf' },
      },
      baseUploadDir: '/tmp/base',
      draftUploadDir: '/tmp/base/uploads/thesis_conclusion_draft/320213',
      transaction: 'tx',
    });

    expect(safeUnlink).not.toHaveBeenCalled();
    expect(Teacher.findAll).not.toHaveBeenCalled();
    expect(SustainableDevelopmentGoal.findAll).not.toHaveBeenCalled();
    expect(thesisRecord.title).toBeNull();
    expect(thesisRecord.title_eng).toBeNull();
  });

  test('saveDraftTransaction should keep primary sdg when duplicate goal id later has secondary level', async () => {
    const thesisRecord = {
      id: 12,
      student_id: '320213',
      status: 'ongoing',
      save: jest.fn().mockResolvedValue(undefined),
    };
    Thesis.findOne.mockResolvedValue(thesisRecord);
    SustainableDevelopmentGoal.findAll.mockResolvedValue([{ id: 5 }]);

    await saveDraftTransaction({
      loggedStudent: { id: '320213' },
      draftData: {
        sdgs: [
          { goalId: 5, level: 'primary' },
          { id: 5, level: 'secondary' },
        ],
      },
      files: {},
      baseUploadDir: '/tmp/base',
      draftUploadDir: '/tmp/base/uploads/thesis_conclusion_draft/320213',
      transaction: 'tx',
    });

    expect(ThesisSustainableDevelopmentGoal.bulkCreate).toHaveBeenCalledWith(
      [{ thesis_id: 12, goal_id: 5, sdg_level: 'primary' }],
      { transaction: 'tx' },
    );
  });

  test('saveDraftTransaction should persist embargo data and clear draft license when deny is selected', async () => {
    const thesisRecord = {
      id: 13,
      student_id: '320213',
      status: 'ongoing',
      license_id: 2,
      save: jest.fn().mockResolvedValue(undefined),
    };
    Thesis.findOne.mockResolvedValue(thesisRecord);
    ThesisEmbargo.findOne.mockResolvedValue({ id: 44 });
    EmbargoMotivation.findAll.mockResolvedValue([{ id: 2 }, { id: 7 }]);
    ThesisEmbargo.create.mockResolvedValue({ id: 55 });

    await saveDraftTransaction({
      loggedStudent: { id: '320213' },
      draftData: {
        embargo: {
          duration: '36_months',
          motivations: [
            { motivationId: 2, otherMotivation: null },
            { motivationId: 7, otherMotivation: 'Richiesta aziendale' },
          ],
        },
      },
      files: {},
      baseUploadDir: '/tmp/base',
      draftUploadDir: '/tmp/base/uploads/thesis_conclusion_draft/320213',
      transaction: 'tx',
    });

    expect(thesisRecord.license_id).toBeNull();
    expect(ThesisEmbargo.findOne).toHaveBeenCalledWith({
      where: { thesis_id: '13' },
      transaction: 'tx',
    });
    expect(ThesisEmbargoMotivation.destroy).toHaveBeenCalledWith({
      where: { thesis_embargo_id: 44 },
      transaction: 'tx',
    });
    expect(ThesisEmbargo.destroy).toHaveBeenCalledWith({
      where: { id: 44 },
      transaction: 'tx',
    });
    expect(ThesisEmbargo.create).toHaveBeenCalledWith(
      {
        thesis_id: '13',
        duration: '36_months',
      },
      { transaction: 'tx' },
    );
    expect(ThesisEmbargoMotivation.bulkCreate).toHaveBeenCalledWith(
      [
        { thesis_embargo_id: 55, motivation_id: 2, other_motivation: null },
        { thesis_embargo_id: 55, motivation_id: 7, other_motivation: 'Richiesta aziendale' },
      ],
      { transaction: 'tx' },
    );
  });

  test('saveDraftTransaction should clear existing embargo when authorization switches to license', async () => {
    const thesisRecord = {
      id: 14,
      student_id: '320213',
      status: 'ongoing',
      save: jest.fn().mockResolvedValue(undefined),
    };
    Thesis.findOne.mockResolvedValue(thesisRecord);
    ThesisEmbargo.findOne.mockResolvedValue({ id: 66 });

    await saveDraftTransaction({
      loggedStudent: { id: '320213' },
      draftData: {
        licenseId: 1,
      },
      files: {},
      baseUploadDir: '/tmp/base',
      draftUploadDir: '/tmp/base/uploads/thesis_conclusion_draft/320213',
      transaction: 'tx',
    });

    expect(thesisRecord.license_id).toBe(1);
    expect(ThesisEmbargo.findOne).toHaveBeenCalledWith({
      where: { thesis_id: '14' },
      transaction: 'tx',
    });
    expect(ThesisEmbargoMotivation.destroy).toHaveBeenCalledWith({
      where: { thesis_embargo_id: 66 },
      transaction: 'tx',
    });
    expect(ThesisEmbargo.destroy).toHaveBeenCalledWith({
      where: { id: 66 },
      transaction: 'tx',
    });
  });

  test('executeConclusionRequestTransaction should throw 401 when no logged student is found', async () => {
    LoggedStudent.findOne.mockResolvedValue(null);

    await expect(
      executeConclusionRequestTransaction({
        requestData: baseSubmitRequestData,
        files: baseSubmitFiles,
        transaction: 'tx',
        baseUploadDir: '/tmp/base',
      }),
    ).rejects.toMatchObject({ status: 401, message: 'Unauthorized' });
  });

  test('executeConclusionRequestTransaction should throw 404 when student is missing', async () => {
    LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
    Student.findByPk.mockResolvedValue(null);

    await expect(
      executeConclusionRequestTransaction({
        requestData: baseSubmitRequestData,
        files: baseSubmitFiles,
        transaction: 'tx',
        baseUploadDir: '/tmp/base',
      }),
    ).rejects.toMatchObject({ status: 404, message: 'Student not found' });
  });

  test('executeConclusionRequestTransaction should throw 404 when thesis is missing', async () => {
    LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
    Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
    Thesis.findOne.mockResolvedValue(null);

    await expect(
      executeConclusionRequestTransaction({
        requestData: baseSubmitRequestData,
        files: baseSubmitFiles,
        transaction: 'tx',
        baseUploadDir: '/tmp/base',
      }),
    ).rejects.toMatchObject({ status: 404, message: 'Thesis not found' });
  });

  test('executeConclusionRequestTransaction should throw 400 when thesis status is invalid', async () => {
    LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
    Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
    Thesis.findOne.mockResolvedValue({ ...baseThesisRecord(), status: 'final_exam' });

    await expect(
      executeConclusionRequestTransaction({
        requestData: baseSubmitRequestData,
        files: baseSubmitFiles,
        transaction: 'tx',
        baseUploadDir: '/tmp/base',
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Thesis is not in a valid state for conclusion request',
    });
  });

  test('executeConclusionRequestTransaction should throw 400 when title or abstract is missing', async () => {
    LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
    Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
    Thesis.findOne.mockResolvedValue(baseThesisRecord());

    await expect(
      executeConclusionRequestTransaction({
        requestData: { ...baseSubmitRequestData, title: null },
        files: baseSubmitFiles,
        transaction: 'tx',
        baseUploadDir: '/tmp/base',
      }),
    ).rejects.toMatchObject({ status: 400, message: 'Missing thesis title or abstract' });
  });

  test('executeConclusionRequestTransaction should throw 400 when thesis file is missing', async () => {
    LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
    Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
    Thesis.findOne.mockResolvedValue(baseThesisRecord());
    isSummaryRequiredForStudent.mockResolvedValue(false);

    await expect(
      executeConclusionRequestTransaction({
        requestData: baseSubmitRequestData,
        files: { ...baseSubmitFiles, thesisFile: null },
        transaction: 'tx',
        baseUploadDir: '/tmp/base',
      }),
    ).rejects.toMatchObject({ status: 400, message: 'Missing thesis file' });
  });

  test('executeConclusionRequestTransaction should throw 400 when summary is required but missing', async () => {
    LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
    Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
    Thesis.findOne.mockResolvedValue(baseThesisRecord());
    isSummaryRequiredForStudent.mockResolvedValue(true);

    await expect(
      executeConclusionRequestTransaction({
        requestData: baseSubmitRequestData,
        files: { ...baseSubmitFiles, thesisSummary: null },
        transaction: 'tx',
        baseUploadDir: '/tmp/base',
      }),
    ).rejects.toMatchObject({ status: 400, message: 'Missing thesis summary' });
  });

  test('executeConclusionRequestTransaction should skip live supervisors/sdgs/embargo when empty or invalid arrays are provided', async () => {
    const thesisRecord = baseThesisRecord();

    LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
    Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
    Thesis.findOne.mockResolvedValue(thesisRecord);
    isSummaryRequiredForStudent.mockResolvedValue(false);
    ensureDirExists.mockResolvedValue(undefined);
    writeValidatedPdf.mockResolvedValue(undefined);
    moveFile.mockResolvedValue(undefined);
    ThesisApplicationStatusHistory.create.mockResolvedValue(undefined);
    ThesisSupervisorCoSupervisor.destroy.mockResolvedValue(undefined);

    const thesisId = await executeConclusionRequestTransaction({
      requestData: {
        ...baseSubmitRequestData,
        coSupervisors: [],
        sdgs: [{ goalId: 'invalid-id', level: 'primary' }],
        embargo: null,
      },
      files: baseSubmitFiles,
      transaction: 'tx',
      baseUploadDir: '/tmp/base',
    });

    expect(thesisId).toBe(1);
    expect(Teacher.findAll).not.toHaveBeenCalled();
    expect(ThesisSustainableDevelopmentGoal.bulkCreate).not.toHaveBeenCalled();
    expect(ThesisEmbargo.create).not.toHaveBeenCalled();
  });

  test('executeConclusionRequestTransaction should process mixed live data with EN language, keywords and embargo motivations', async () => {
    const thesisRecord = baseThesisRecord();

    LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
    Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
    Thesis.findOne.mockResolvedValue(thesisRecord);
    isSummaryRequiredForStudent.mockResolvedValue(false);
    ensureDirExists.mockResolvedValue(undefined);
    writeValidatedPdf.mockResolvedValue(undefined);
    moveFile.mockResolvedValue(undefined);
    Teacher.findAll.mockResolvedValue([{ id: 3019 }, { id: 38485 }]);
    SustainableDevelopmentGoal.findAll.mockResolvedValue([{ id: 5 }, { id: 7 }]);
    Keyword.findAll.mockResolvedValue([{ id: 8 }]);
    ThesisEmbargo.findOne.mockResolvedValue(null);
    ThesisEmbargo.create.mockResolvedValue({ id: 99, duration: '12_months' });
    EmbargoMotivation.findAll.mockResolvedValue([{ id: 1 }]);
    ThesisApplicationStatusHistory.create.mockResolvedValue(undefined);
    ThesisSupervisorCoSupervisor.destroy.mockResolvedValue(undefined);

    const thesisId = await executeConclusionRequestTransaction({
      requestData: {
        ...baseSubmitRequestData,
        title: 'English final title',
        abstract: 'English final abstract',
        titleEng: 'Legacy EN title',
        abstractEng: 'Legacy EN abstract',
        language: 'en',
        coSupervisors: [3019, { id: 38485 }],
        sdgs: [{ goalId: 5, level: 'secondary' }, { goalId: 5, level: 'primary' }, 7],
        keywords: [8, '  free keyword  ', ''],
        embargo: {
          duration: '12_months',
          motivations: [{ motivationId: 1, otherMotivation: 'Other motivation' }],
        },
      },
      files: baseSubmitFiles,
      transaction: 'tx',
      baseUploadDir: '/tmp/base',
    });

    expect(thesisId).toBe(1);
    expect(thesisRecord.title_eng).toBe('English final title');
    expect(thesisRecord.abstract_eng).toBe('English final abstract');
    expect(ThesisSupervisorCoSupervisor.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ thesis_id: 1, teacher_id: 3019, scope: 'live' }),
        expect.objectContaining({ thesis_id: 1, teacher_id: 38485, scope: 'live' }),
      ]),
      { transaction: 'tx' },
    );
    expect(ThesisSustainableDevelopmentGoal.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        { thesis_id: 1, goal_id: 5, sdg_level: 'primary' },
        { thesis_id: 1, goal_id: 7, sdg_level: null },
      ]),
      { transaction: 'tx' },
    );
    expect(ThesisKeyword.bulkCreate).toHaveBeenNthCalledWith(1, [{ thesis_id: 1, keyword_id: 8 }], {
      transaction: 'tx',
    });
    expect(ThesisKeyword.bulkCreate).toHaveBeenNthCalledWith(2, [{ thesis_id: 1, keyword_other: 'free keyword' }], {
      transaction: 'tx',
    });
    expect(ThesisEmbargoMotivation.bulkCreate).toHaveBeenCalledWith(
      [
        {
          thesis_embargo_id: 99,
          motivation_id: 1,
          other_motivation: 'Other motivation',
        },
      ],
      { transaction: 'tx' },
    );
  });

  test('executeConclusionRequestTransaction should keep primary sdg when duplicate id fallback entry is secondary', async () => {
    const thesisRecord = baseThesisRecord();

    LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
    Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
    Thesis.findOne.mockResolvedValue(thesisRecord);
    isSummaryRequiredForStudent.mockResolvedValue(false);
    ensureDirExists.mockResolvedValue(undefined);
    writeValidatedPdf.mockResolvedValue(undefined);
    moveFile.mockResolvedValue(undefined);
    SustainableDevelopmentGoal.findAll.mockResolvedValue([{ id: 5 }]);
    ThesisApplicationStatusHistory.create.mockResolvedValue(undefined);
    ThesisSupervisorCoSupervisor.destroy.mockResolvedValue(undefined);

    await executeConclusionRequestTransaction({
      requestData: {
        ...baseSubmitRequestData,
        sdgs: [
          { goalId: 5, level: 'primary' },
          { id: 5, level: 'secondary' },
        ],
      },
      files: baseSubmitFiles,
      transaction: 'tx',
      baseUploadDir: '/tmp/base',
    });

    expect(ThesisSustainableDevelopmentGoal.bulkCreate).toHaveBeenCalledWith(
      [{ thesis_id: 1, goal_id: 5, sdg_level: 'primary' }],
      { transaction: 'tx' },
    );
  });

  test('executeConclusionRequestTransaction should skip keyword persistence when neither ids nor names are valid', async () => {
    const thesisRecord = baseThesisRecord();

    LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
    Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
    Thesis.findOne.mockResolvedValue(thesisRecord);
    isSummaryRequiredForStudent.mockResolvedValue(false);
    ensureDirExists.mockResolvedValue(undefined);
    writeValidatedPdf.mockResolvedValue(undefined);
    moveFile.mockResolvedValue(undefined);
    ThesisApplicationStatusHistory.create.mockResolvedValue(undefined);
    ThesisSupervisorCoSupervisor.destroy.mockResolvedValue(undefined);

    await executeConclusionRequestTransaction({
      requestData: {
        ...baseSubmitRequestData,
        keywords: [-1, { id: null }, { id: undefined }],
      },
      files: baseSubmitFiles,
      transaction: 'tx',
      baseUploadDir: '/tmp/base',
    });

    expect(Keyword.findAll).not.toHaveBeenCalled();
    expect(ThesisKeyword.bulkCreate).not.toHaveBeenCalled();
    expect(ThesisKeyword.destroy).toHaveBeenCalledWith({ where: { thesis_id: 1 }, transaction: 'tx' });
  });

  test('executeConclusionRequestTransaction should support primitive embargo motivations', async () => {
    const thesisRecord = baseThesisRecord();

    LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
    Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
    Thesis.findOne.mockResolvedValue(thesisRecord);
    isSummaryRequiredForStudent.mockResolvedValue(false);
    ensureDirExists.mockResolvedValue(undefined);
    writeValidatedPdf.mockResolvedValue(undefined);
    moveFile.mockResolvedValue(undefined);
    ThesisEmbargo.findOne.mockResolvedValue(null);
    ThesisEmbargo.create.mockResolvedValue({ id: 100, duration: '12_months' });
    EmbargoMotivation.findAll.mockResolvedValue([{ id: 2 }]);
    ThesisApplicationStatusHistory.create.mockResolvedValue(undefined);
    ThesisSupervisorCoSupervisor.destroy.mockResolvedValue(undefined);

    await executeConclusionRequestTransaction({
      requestData: {
        ...baseSubmitRequestData,
        embargo: { duration: '12_months', motivations: [2] },
      },
      files: baseSubmitFiles,
      transaction: 'tx',
      baseUploadDir: '/tmp/base',
    });

    expect(ThesisEmbargoMotivation.bulkCreate).toHaveBeenCalledWith(
      [{ thesis_embargo_id: 100, motivation_id: 2, other_motivation: null }],
      { transaction: 'tx' },
    );
  });

  test('executeConclusionRequestTransaction should skip motivation lookup when embargo motivations have no numeric ids', async () => {
    const thesisRecord = baseThesisRecord();

    LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
    Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
    Thesis.findOne.mockResolvedValue(thesisRecord);
    isSummaryRequiredForStudent.mockResolvedValue(false);
    ensureDirExists.mockResolvedValue(undefined);
    writeValidatedPdf.mockResolvedValue(undefined);
    moveFile.mockResolvedValue(undefined);
    ThesisEmbargo.findOne.mockResolvedValue(null);
    ThesisEmbargo.create.mockResolvedValue({ id: 101, duration: '12_months' });
    ThesisApplicationStatusHistory.create.mockResolvedValue(undefined);
    ThesisSupervisorCoSupervisor.destroy.mockResolvedValue(undefined);

    await executeConclusionRequestTransaction({
      requestData: {
        ...baseSubmitRequestData,
        embargo: {
          duration: '12_months',
          motivations: [{ motivationId: undefined, otherMotivation: 'Free text reason' }],
        },
      },
      files: baseSubmitFiles,
      transaction: 'tx',
      baseUploadDir: '/tmp/base',
    });

    expect(EmbargoMotivation.findAll).not.toHaveBeenCalled();
    expect(ThesisEmbargoMotivation.bulkCreate).toHaveBeenCalledWith([], { transaction: 'tx' });
  });

  test('executeConclusionRequestTransaction should reject incomplete embargo payload', async () => {
    const thesisRecord = baseThesisRecord();

    LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
    Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
    Thesis.findOne.mockResolvedValue(thesisRecord);
    isSummaryRequiredForStudent.mockResolvedValue(false);
    ensureDirExists.mockResolvedValue(undefined);
    writeValidatedPdf.mockResolvedValue(undefined);
    moveFile.mockResolvedValue(undefined);

    await expect(
      executeConclusionRequestTransaction({
        requestData: {
          ...baseSubmitRequestData,
          embargo: {},
        },
        files: baseSubmitFiles,
        transaction: 'tx',
        baseUploadDir: '/tmp/base',
      }),
    ).rejects.toMatchObject({ status: 400, message: 'Embargo data is incomplete' });
  });

  test('executeConclusionRequestTransaction should require embargo duration when motivations are provided', async () => {
    const thesisRecord = baseThesisRecord();

    LoggedStudent.findOne.mockResolvedValue({ student_id: '320213' });
    Student.findByPk.mockResolvedValue({ id: '320213', degree_id: '37-18' });
    Thesis.findOne.mockResolvedValue(thesisRecord);
    isSummaryRequiredForStudent.mockResolvedValue(false);
    ensureDirExists.mockResolvedValue(undefined);
    writeValidatedPdf.mockResolvedValue(undefined);
    moveFile.mockResolvedValue(undefined);

    await expect(
      executeConclusionRequestTransaction({
        requestData: {
          ...baseSubmitRequestData,
          embargo: {
            motivations: [{ motivationId: 1, otherMotivation: null }],
          },
        },
        files: baseSubmitFiles,
        transaction: 'tx',
        baseUploadDir: '/tmp/base',
      }),
    ).rejects.toMatchObject({ status: 400, message: 'Embargo duration is required' });
  });

  test('buildConclusionResponse should map all related live data including embargo motivations', async () => {
    Thesis.findByPk.mockResolvedValue({
      id: 1,
      topic: 'AI Thesis',
      title: 'Titolo',
      title_eng: 'Title',
      language: 'en',
      abstract: 'Abstract',
      abstract_eng: 'Abstract EN',
      thesis_file_path: 'uploads/thesis_conclusion_request/320213/thesis_320213.pdf',
      thesis_summary_path: 'uploads/thesis_conclusion_request/320213/summary_320213.pdf',
      additional_zip_path: 'uploads/thesis_conclusion_request/320213/additional_320213.zip',
      license_id: 1,
      company_id: null,
      student_id: '320213',
      thesis_application_id: 100,
      status: 'conclusion_requested',
      thesis_start_date: new Date('2025-01-01T00:00:00.000Z'),
      thesis_conclusion_request_date: new Date('2025-01-02T00:00:00.000Z'),
      thesis_conclusion_confirmation_date: new Date('2025-01-03T00:00:00.000Z'),
    });
    ThesisSupervisorCoSupervisor.findAll.mockResolvedValue([{ teacher_id: 3019, is_supervisor: true }]);
    ThesisSustainableDevelopmentGoal.findAll.mockResolvedValue([{ goal_id: 5, sdg_level: 'primary' }]);
    ThesisKeyword.findAll.mockResolvedValue([{ keyword_id: null, keyword_other: 'free-keyword' }]);
    ThesisEmbargo.findOne.mockResolvedValue({ id: 8, duration: '12_months' });
    ThesisEmbargoMotivation.findAll.mockResolvedValue([{ motivation_id: 1, other_motivation: 'Reason' }]);

    const response = await buildConclusionResponse(1);

    expect(response).toEqual(
      expect.objectContaining({
        id: 1,
        title: 'Titolo',
        titleEng: 'Title',
        thesisFilePath: 'uploads/thesis_conclusion_request/320213/thesis_320213.pdf',
        thesisSummaryPath: 'uploads/thesis_conclusion_request/320213/summary_320213.pdf',
        additionalZipPath: 'uploads/thesis_conclusion_request/320213/additional_320213.zip',
        keywords: [{ keywordId: null, keywordOther: 'free-keyword' }],
        embargo: {
          id: 8,
          duration: '12_months',
          motivations: [{ motivationId: 1, otherMotivation: 'Reason' }],
        },
      }),
    );
    expect(ThesisEmbargoMotivation.findAll).toHaveBeenCalledWith({
      where: { thesis_embargo_id: 8 },
      attributes: ['motivation_id', 'other_motivation'],
    });
  });

  test('buildConclusionResponse should return null embargo when thesis has no embargo row', async () => {
    Thesis.findByPk.mockResolvedValue({
      id: 2,
      topic: 'No embargo thesis',
      title: null,
      title_eng: null,
      language: 'it',
      abstract: null,
      abstract_eng: null,
      thesis_file_path: null,
      thesis_summary_path: null,
      additional_zip_path: null,
      license_id: null,
      company_id: null,
      student_id: '320213',
      thesis_application_id: 101,
      status: 'conclusion_requested',
      thesis_start_date: new Date('2025-01-01T00:00:00.000Z'),
      thesis_conclusion_request_date: null,
      thesis_conclusion_confirmation_date: null,
    });
    ThesisSupervisorCoSupervisor.findAll.mockResolvedValue([]);
    ThesisSustainableDevelopmentGoal.findAll.mockResolvedValue([]);
    ThesisKeyword.findAll.mockResolvedValue([]);
    ThesisEmbargo.findOne.mockResolvedValue(null);

    const response = await buildConclusionResponse(2);

    expect(ThesisEmbargoMotivation.findAll).not.toHaveBeenCalled();
    expect(response.embargo).toBeNull();
    expect(response.keywords).toEqual([]);
  });

  test('buildConclusionResponse should throw 404 when updated thesis is missing', async () => {
    Thesis.findByPk.mockResolvedValue(null);

    await expect(buildConclusionResponse(99999)).rejects.toMatchObject({
      status: 404,
      message: 'Thesis not found after update',
    });
  });
});

describe('Real uploads utils branches', () => {
  test('ensureDirExists should create nested directories', async () => {
    const uploadsReal = jest.requireActual('../../src/utils/uploads');
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'thesis-conclusion-ensure-dir-'));
    const nestedDir = path.join(baseDir, 'a', 'b', 'c');

    await uploadsReal.ensureDirExists(nestedDir);

    const stat = await fs.stat(nestedDir);
    expect(stat.isDirectory()).toBe(true);
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  test('resolveValidDraftFilePath should return null when file does not exist on disk', async () => {
    const uploadsReal = jest.requireActual('../../src/utils/uploads');
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'thesis-conclusion-draft-'));

    const resolved = await uploadsReal.resolveValidDraftFilePath(
      'uploads/thesis_conclusion_draft/320213/missing-file.pdf',
      '320213',
      baseDir,
    );

    expect(resolved).toBeNull();
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  test('resolveValidDraftFilePath should handle empty path/baseDir and invalid prefixes', async () => {
    const uploadsReal = jest.requireActual('../../src/utils/uploads');

    expect(await uploadsReal.resolveValidDraftFilePath(null, '320213', '/tmp/base')).toBeNull();
    expect(
      await uploadsReal.resolveValidDraftFilePath('uploads/thesis_conclusion_draft/320213/file.pdf', '320213', null),
    ).toBeNull();
    expect(
      await uploadsReal.resolveValidDraftFilePath('uploads/other_draft/320213/file.pdf', '320213', '/tmp/base'),
    ).toBeNull();
  });

  test('resolveValidDraftFilePath should return normalized relative path when file exists', async () => {
    const uploadsReal = jest.requireActual('../../src/utils/uploads');
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'thesis-conclusion-valid-path-'));
    const relative = 'uploads/thesis_conclusion_draft/320213/existing.pdf';
    const absolute = path.join(baseDir, relative);

    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, 'ok');

    const resolved = await uploadsReal.resolveValidDraftFilePath(relative, '320213', baseDir);

    expect(resolved).toBe(relative);
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  test('moveFile should fallback to copy+unlink when rename fails with EXDEV', async () => {
    const uploadsReal = jest.requireActual('../../src/utils/uploads');
    const renameSpy = jest
      .spyOn(fs, 'rename')
      .mockRejectedValueOnce(Object.assign(new Error('Cross-device'), { code: 'EXDEV' }));
    const copySpy = jest.spyOn(fs, 'copyFile').mockResolvedValueOnce(undefined);
    const unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValueOnce(undefined);

    await uploadsReal.moveFile('/tmp/source-file.pdf', '/tmp/destination-file.pdf');

    expect(copySpy).toHaveBeenCalledWith('/tmp/source-file.pdf', '/tmp/destination-file.pdf');
    expect(unlinkSpy).toHaveBeenCalledWith('/tmp/source-file.pdf');

    renameSpy.mockRestore();
    copySpy.mockRestore();
    unlinkSpy.mockRestore();
  });

  test('moveFile should rethrow non-EXDEV errors', async () => {
    const uploadsReal = jest.requireActual('../../src/utils/uploads');
    const renameSpy = jest
      .spyOn(fs, 'rename')
      .mockRejectedValueOnce(Object.assign(new Error('Permission denied'), { code: 'EACCES' }));

    await expect(uploadsReal.moveFile('/tmp/source-file.pdf', '/tmp/destination-file.pdf')).rejects.toThrow(
      'Permission denied',
    );

    renameSpy.mockRestore();
  });

  test('safeUnlink should ignore empty inputs and delete existing files', async () => {
    const uploadsReal = jest.requireActual('../../src/utils/uploads');
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'thesis-conclusion-safe-unlink-'));
    const filePath = path.join(baseDir, 'to-delete.txt');
    await fs.writeFile(filePath, 'delete-me');

    await uploadsReal.safeUnlink(null);
    await uploadsReal.safeUnlink(filePath);

    const existsAfterDelete = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    expect(existsAfterDelete).toBe(false);
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  test('cleanupUploads should invoke safeUnlink for each provided uploaded file', async () => {
    const uploadsReal = jest.requireActual('../../src/utils/uploads');
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'thesis-conclusion-cleanup-'));
    const firstPath = path.join(baseDir, 'first.txt');
    const secondPath = path.join(baseDir, 'second.txt');
    await fs.writeFile(firstPath, 'a');
    await fs.writeFile(secondPath, 'b');

    await uploadsReal.cleanupUploads({ path: firstPath }, null, { path: secondPath });

    const firstExists = await fs
      .access(firstPath)
      .then(() => true)
      .catch(() => false);
    const secondExists = await fs
      .access(secondPath)
      .then(() => true)
      .catch(() => false);
    expect(firstExists).toBe(false);
    expect(secondExists).toBe(false);
    await fs.rm(baseDir, { recursive: true, force: true });
  });
});
