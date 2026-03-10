require('jest');

const { app } = require('../../src/app');
const { sequelize } = require('../../src/models');

const request = require('supertest');

let server;
const DEFAULT_STUDENT_ID = '320213';
const TEMP_STUDENT_ID = '399995';
const TEMP_PENDING_APPLICATION_ID = 9050;
const TEMP_APPROVED_APPLICATION_ID = 9051;
const TEMP_NULL_REFS_APPLICATION_ID = 9056;
const TEMP_LINKED_THESIS_ID = 9402;

const resetLoggedStudent = async (studentId = DEFAULT_STUDENT_ID) => {
  await sequelize.query('DELETE FROM logged_student');
  await sequelize.query('INSERT INTO logged_student (student_id) VALUES (:studentId)', {
    replacements: { studentId },
  });
};

const cleanupTempApplications = async () => {
  await sequelize.query(
    `
    DELETE FROM thesis
    WHERE student_id = :studentId
       OR thesis_application_id IN (:pendingApplicationId, :approvedApplicationId)
    `,
    {
      replacements: {
        studentId: TEMP_STUDENT_ID,
        pendingApplicationId: TEMP_PENDING_APPLICATION_ID,
        approvedApplicationId: TEMP_APPROVED_APPLICATION_ID,
      },
    },
  );
  await sequelize.query(
    `
    DELETE FROM thesis_application_status_history
    WHERE thesis_application_id IN (
      SELECT id
      FROM thesis_application
      WHERE student_id = :studentId
    )
       OR thesis_application_id IN (:pendingApplicationId, :approvedApplicationId)
    `,
    {
      replacements: {
        studentId: TEMP_STUDENT_ID,
        pendingApplicationId: TEMP_PENDING_APPLICATION_ID,
        approvedApplicationId: TEMP_APPROVED_APPLICATION_ID,
      },
    },
  );
  await sequelize.query(
    `
    DELETE FROM thesis_application_supervisor_cosupervisor
    WHERE thesis_application_id IN (
      SELECT id
      FROM thesis_application
      WHERE student_id = :studentId
    )
       OR thesis_application_id IN (:pendingApplicationId, :approvedApplicationId)
    `,
    {
      replacements: {
        studentId: TEMP_STUDENT_ID,
        pendingApplicationId: TEMP_PENDING_APPLICATION_ID,
        approvedApplicationId: TEMP_APPROVED_APPLICATION_ID,
      },
    },
  );
  await sequelize.query('DELETE FROM thesis_application WHERE student_id = :studentId', {
    replacements: { studentId: TEMP_STUDENT_ID },
  });
  await sequelize.query('DELETE FROM logged_student WHERE student_id = :studentId', {
    replacements: { studentId: TEMP_STUDENT_ID },
  });
};

const seedApprovedApplicationWithLinkedThesis = async thesisStatus => {
  await sequelize.query(
    `
    INSERT INTO thesis_application (
      id, topic, student_id, thesis_proposal_id, company_id, submission_date, status
    ) VALUES (
      :id, 'Approved integration application', :studentId, NULL, NULL, NOW(), 'approved'
    )
    `,
    { replacements: { id: TEMP_APPROVED_APPLICATION_ID, studentId: TEMP_STUDENT_ID } },
  );
  await sequelize.query(
    `
    INSERT INTO thesis (
      id, topic, thesis_application_id, student_id, company_id, thesis_start_date, status
    ) VALUES (
      :id, 'Linked integration thesis', :applicationId, :studentId, NULL, NOW(), :status
    )
    `,
    {
      replacements: {
        id: TEMP_LINKED_THESIS_ID,
        applicationId: TEMP_APPROVED_APPLICATION_ID,
        studentId: TEMP_STUDENT_ID,
        status: thesisStatus,
      },
    },
  );
};

const seedMinimalTempApplication = async status => {
  await sequelize.query(
    `
    INSERT INTO thesis_application (
      id, topic, student_id, thesis_proposal_id, company_id, submission_date, status
    ) VALUES (
      :id, 'Minimal integration application', :studentId, NULL, NULL, NOW(), :status
    )
    `,
    {
      replacements: {
        id: TEMP_NULL_REFS_APPLICATION_ID,
        studentId: TEMP_STUDENT_ID,
        status,
      },
    },
  );
  await sequelize.query(
    `
    INSERT INTO thesis_application_supervisor_cosupervisor (
      thesis_application_id, teacher_id, is_supervisor
    ) VALUES (
      :applicationId, 3019, 1
    )
    `,
    { replacements: { applicationId: TEMP_NULL_REFS_APPLICATION_ID } },
  );
};

beforeAll(async () => {
  server = app.listen(0, () => {
    console.log(`Test server running on port ${server.address().port}`);
  });
  await resetLoggedStudent();
  await cleanupTempApplications();
  await sequelize.query('DELETE FROM student WHERE id = :studentId', {
    replacements: { studentId: TEMP_STUDENT_ID },
  });
  await sequelize.query(
    `
    INSERT INTO student (id, first_name, last_name, profile_picture_url, degree_id)
    VALUES (:id, 'Temp', 'Applicant', NULL, '32-1')
    `,
    { replacements: { id: TEMP_STUDENT_ID } },
  );
  await resetLoggedStudent();
});

afterEach(async () => {
  await cleanupTempApplications();
  await resetLoggedStudent();
});

afterAll(async () => {
  await cleanupTempApplications();
  await resetLoggedStudent();
  await sequelize.query('DELETE FROM student WHERE id = :studentId', {
    replacements: { studentId: TEMP_STUDENT_ID },
  });
  await server.close(() => {
    sequelize.close();
  });
});

describe('POST /api/thesis-applications', () => {
  test('Should return 401 when creating an application without a logged student', async () => {
    await sequelize.query('DELETE FROM logged_student');

    const response = await request(server)
      .post('/api/thesis-applications')
      .send({
        topic: 'Unauthorized integration application',
        supervisor: { id: 3019, firstName: 'Marco', lastName: 'Torchiano' },
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'No logged-in student found' });
  });

  test('Should fail to create a new thesis application when student already has an active one', async () => {
    const newThesisApplication = {
      topic: 'New Thesis Topic',
      supervisor: { id: 3019, firstName: 'Marco', lastName: 'Torchiano' },
      coSupervisors: [{ id: 38485, firstName: 'Riccardo', lastName: 'Coppola' }],
      company: { id: 1, corporate_name: 'Tech Solutions S.r.l' },
      thesisProposal: { id: 13169, topic: 'New Thesis Topic' },
    };

    const response = await request(server).post('/api/thesis-applications').send(newThesisApplication);
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Student already has an active thesis application');
  });

  test('Should fail to create a thesis application with missing fields', async () => {
    const incompleteThesisApplication = {
      topic: null,
      supervisor: { id: 3019, firstName: 'Marco', lastName: 'Torchiano' },
    };

    const response = await request(server).post('/api/thesis-applications').send(incompleteThesisApplication);
    expect(response.status).toBe(400);
  });

  test('Should return 400 when the supervisor does not exist', async () => {
    await resetLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-applications')
      .send({
        topic: 'Invalid supervisor application',
        supervisor: { id: 999999, firstName: 'Ghost', lastName: 'Teacher' },
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Supervisor not found' });
  });

  test('Should return 400 when a co-supervisor does not exist', async () => {
    await resetLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-applications')
      .send({
        topic: 'Invalid co-supervisor application',
        supervisor: { id: 3019, firstName: 'Marco', lastName: 'Torchiano' },
        coSupervisors: [{ id: 999999, firstName: 'Ghost', lastName: 'CoSupervisor' }],
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Co-Supervisor with id 999999 not found' });
  });

  test('Should return 400 when the thesis proposal does not exist', async () => {
    await resetLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-applications')
      .send({
        topic: 'Invalid proposal application',
        supervisor: { id: 3019, firstName: 'Marco', lastName: 'Torchiano' },
        thesisProposal: { id: 999999, topic: 'Missing proposal' },
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Thesis proposal not found' });
  });

  test('Should return 400 when the company does not exist', async () => {
    await resetLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-applications')
      .send({
        topic: 'Invalid company application',
        supervisor: { id: 3019, firstName: 'Marco', lastName: 'Torchiano' },
        company: { id: 999999, corporate_name: 'Missing company' },
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Company not found' });
  });

  test('Should return 400 when the student already has an approved application linked to an active thesis', async () => {
    await resetLoggedStudent(TEMP_STUDENT_ID);
    await seedApprovedApplicationWithLinkedThesis('ongoing');

    const response = await request(server)
      .post('/api/thesis-applications')
      .send({
        topic: 'Blocked approved application',
        supervisor: { id: 3019, firstName: 'Marco', lastName: 'Torchiano' },
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Student already has an active thesis application' });
  });

  test('Should return 400 when the student already has an approved application without a linked thesis', async () => {
    await resetLoggedStudent(TEMP_STUDENT_ID);
    await seedMinimalTempApplication('approved');

    const response = await request(server)
      .post('/api/thesis-applications')
      .send({
        topic: 'Blocked approved application without thesis',
        supervisor: { id: 3019, firstName: 'Marco', lastName: 'Torchiano' },
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Student already has an active thesis application' });
  });

  test('Should create a new thesis application for a student without active ones', async () => {
    await resetLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-applications')
      .send({
        topic: 'Integration application topic',
        supervisor: { id: 3019, firstName: 'Marco', lastName: 'Torchiano' },
        coSupervisors: [{ id: 38485, firstName: 'Riccardo', lastName: 'Coppola' }],
        company: { id: 1, corporate_name: 'Tech Solutions S.r.l.' },
        thesisProposal: { id: 13169, topic: 'Descrizione 13169' },
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      topic: 'Integration application topic',
      status: 'pending',
      company: { id: 1, corporateName: 'Tech Solutions S.r.l.' },
      thesisProposal: { id: 13169, topic: 'Descrizione 13169' },
    });
    expect(response.body.supervisor).toMatchObject({ id: 3019, firstName: 'Marco', lastName: 'Torchiano' });
    expect(response.body.coSupervisors).toHaveLength(1);
    expect(response.body.coSupervisors[0]).toMatchObject({ id: 38485, firstName: 'Riccardo', lastName: 'Coppola' });

    const [applications] = await sequelize.query(
      `
      SELECT id, topic, status, student_id, thesis_proposal_id, company_id
      FROM thesis_application
      WHERE student_id = :studentId
      `,
      { replacements: { studentId: TEMP_STUDENT_ID } },
    );
    expect(applications).toHaveLength(1);
    expect(applications[0]).toMatchObject({
      topic: 'Integration application topic',
      status: 'pending',
      student_id: TEMP_STUDENT_ID,
      thesis_proposal_id: 13169,
      company_id: 1,
    });

    const [links] = await sequelize.query(
      `
      SELECT teacher_id, is_supervisor
      FROM thesis_application_supervisor_cosupervisor
      WHERE thesis_application_id = :applicationId
      ORDER BY is_supervisor DESC, teacher_id ASC
      `,
      { replacements: { applicationId: applications[0].id } },
    );
    expect(links).toEqual([
      { teacher_id: 3019, is_supervisor: 1 },
      { teacher_id: 38485, is_supervisor: 0 },
    ]);
  });

  test('Should create a minimal thesis application without optional references', async () => {
    await resetLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-applications')
      .send({
        topic: 'Minimal integration application topic',
        supervisor: { id: 3019, firstName: 'Marco', lastName: 'Torchiano' },
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      topic: 'Minimal integration application topic',
      status: 'pending',
      company: null,
      thesisProposal: null,
    });
    expect(response.body.coSupervisors).toEqual([]);

    const [applications] = await sequelize.query(
      `
      SELECT id, thesis_proposal_id, company_id
      FROM thesis_application
      WHERE student_id = :studentId
      `,
      { replacements: { studentId: TEMP_STUDENT_ID } },
    );
    expect(applications).toHaveLength(1);
    expect(applications[0]).toMatchObject({
      thesis_proposal_id: null,
      company_id: null,
    });
  });
});

describe('GET /api/thesis-applications/eligibility', () => {
  test('Should return 401 when checking eligibility without a logged student', async () => {
    await sequelize.query('DELETE FROM logged_student');

    const response = await request(server).get('/api/thesis-applications/eligibility');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'No logged-in student found' });
  });

  test('Should return not eligible when logged student has a pending application', async () => {
    const response = await request(server).get('/api/thesis-applications/eligibility');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('studentId', '320213');
    expect(response.body).toHaveProperty('eligible', false);
  });

  test('Should return not eligible when the student has an approved application linked to an active thesis', async () => {
    await resetLoggedStudent(TEMP_STUDENT_ID);
    await seedApprovedApplicationWithLinkedThesis('ongoing');

    const response = await request(server).get('/api/thesis-applications/eligibility');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ studentId: TEMP_STUDENT_ID, eligible: false });
  });

  test('Should return not eligible when the student has an approved application without a linked thesis', async () => {
    await resetLoggedStudent(TEMP_STUDENT_ID);
    await seedMinimalTempApplication('approved');

    const response = await request(server).get('/api/thesis-applications/eligibility');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ studentId: TEMP_STUDENT_ID, eligible: false });
  });

  test('Should return eligible when the approved application is linked to a cancel approved thesis', async () => {
    await resetLoggedStudent(TEMP_STUDENT_ID);
    await seedApprovedApplicationWithLinkedThesis('cancel_approved');

    const response = await request(server).get('/api/thesis-applications/eligibility');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ studentId: TEMP_STUDENT_ID, eligible: true });
  });

  test('Should return eligible when logged student has no pending or approved applications', async () => {
    await resetLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server).get('/api/thesis-applications/eligibility');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ studentId: TEMP_STUDENT_ID, eligible: true });
  });
});

describe('GET /api/thesis-applications', () => {
  test('Should return 401 when fetching the last application without a logged student', async () => {
    await sequelize.query('DELETE FROM logged_student');

    const response = await request(server).get('/api/thesis-applications');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'No logged-in student found' });
  });

  test('Should return the most recent application for the logged student', async () => {
    const response = await request(server).get('/api/thesis-applications');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', 1);
    expect(response.body).toHaveProperty('topic');
    expect(response.body).toHaveProperty('supervisor');
    expect(Array.isArray(response.body.coSupervisors)).toBe(true);
    expect(response.body).toHaveProperty('submissionDate');
    expect(response.body).toHaveProperty('status', 'pending');
  });

  test('Should return 404 when the logged student has no applications', async () => {
    await resetLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server).get('/api/thesis-applications');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'No active application found for the student' });
  });

  test('Should return the last application when company and proposal are null', async () => {
    await resetLoggedStudent(TEMP_STUDENT_ID);
    await seedMinimalTempApplication('pending');

    const response = await request(server).get('/api/thesis-applications');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: TEMP_NULL_REFS_APPLICATION_ID,
      company: null,
      thesisProposal: null,
      status: 'pending',
    });
    expect(response.body.supervisor).toMatchObject({ id: 3019, firstName: 'Marco', lastName: 'Torchiano' });
    expect(response.body.coSupervisors).toEqual([]);
  });
});

describe('GET /api/thesis-applications/all', () => {
  test('Should return all thesis applications ordered by submission date desc', async () => {
    const response = await request(server).get('/api/thesis-applications/all');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(3);

    const [first, second, third] = response.body;
    expect(first.id).toBe(3);
    expect(second.id).toBe(1);
    expect(third.id).toBe(2);
  });

  test('Should include applications with null company and null proposal', async () => {
    await seedMinimalTempApplication('pending');

    const response = await request(server).get('/api/thesis-applications/all');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: TEMP_NULL_REFS_APPLICATION_ID,
          company: null,
          thesisProposal: null,
          status: 'pending',
        }),
      ]),
    );
  });
});

describe('GET /api/thesis-applications/status-history', () => {
  test('Should return 400 when applicationId is missing', async () => {
    const response = await request(server).get('/api/thesis-applications/status-history');
    expect(response.status).toBe(400);
  });

  test('Should return ordered status history for an application', async () => {
    const response = await request(server).get('/api/thesis-applications/status-history').query({ applicationId: 2 });
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
    expect(response.body[0]).toHaveProperty('newStatus', 'pending');
    expect(response.body[1]).toHaveProperty('newStatus', 'approved');
  });
});

describe('POST /api/thesis-applications/cancel', () => {
  test('Should cancel a pending thesis application', async () => {
    await sequelize.query(
      `
      INSERT INTO thesis_application (
        id, topic, student_id, thesis_proposal_id, company_id, submission_date, status
      ) VALUES (
        :id, 'Pending integration application', :studentId, NULL, NULL, NOW(), 'pending'
      )
      `,
      { replacements: { id: TEMP_PENDING_APPLICATION_ID, studentId: TEMP_STUDENT_ID } },
    );

    const response = await request(server)
      .post('/api/thesis-applications/cancel')
      .send({ id: TEMP_PENDING_APPLICATION_ID });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: TEMP_PENDING_APPLICATION_ID,
      status: 'cancelled',
      student_id: TEMP_STUDENT_ID,
    });

    const [history] = await sequelize.query(
      `
      SELECT old_status, new_status
      FROM thesis_application_status_history
      WHERE thesis_application_id = :applicationId
      ORDER BY id DESC
      LIMIT 1
      `,
      { replacements: { applicationId: TEMP_PENDING_APPLICATION_ID } },
    );
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual({ old_status: 'pending', new_status: 'cancelled' });
  });

  test('Should return 400 when cancelling a non-pending application', async () => {
    await sequelize.query(
      `
      INSERT INTO thesis_application (
        id, topic, student_id, thesis_proposal_id, company_id, submission_date, status
      ) VALUES (
        :id, 'Approved integration application', :studentId, NULL, NULL, NOW(), 'approved'
      )
      `,
      { replacements: { id: TEMP_APPROVED_APPLICATION_ID, studentId: TEMP_STUDENT_ID } },
    );

    const response = await request(server)
      .post('/api/thesis-applications/cancel')
      .send({ id: TEMP_APPROVED_APPLICATION_ID });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Only pending applications can be cancelled' });
  });

  test('Should return 404 when cancelling an unknown application', async () => {
    const response = await request(server).post('/api/thesis-applications/cancel').send({ id: 999999 });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Thesis application not found' });
  });
});
