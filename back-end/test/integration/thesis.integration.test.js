require('jest');

const fs = require('node:fs/promises');
const path = require('node:path');

const { app } = require('../../src/app');
const { sequelize } = require('../../src/models');
const request = require('supertest');

let server;

const DEFAULT_STUDENT_ID = '320213';
const TEMP_CREATE_STUDENT_ID = '399998';
const TEMP_CANCEL_STUDENT_ID = '399997';
const TEMP_NO_THESIS_STUDENT_ID = '399996';

const TEMP_CREATE_APPLICATION_ID = 9020;
const TEMP_CANCEL_APPLICATION_ID = 9030;
const TEMP_DOWNLOAD_APPLICATION_ID = 9040;
const TEMP_MINIMAL_GET_APPLICATION_ID = 9060;
const TEMP_DOWNLOAD_THESIS_ID = 9200;
const TEMP_MINIMAL_GET_THESIS_ID = 9210;
const TEMP_CANCEL_THESIS_ID = 9300;

const DOWNLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'test_downloads');
const TEMP_APPLICATION_IDS = [
  TEMP_CREATE_APPLICATION_ID,
  TEMP_CANCEL_APPLICATION_ID,
  TEMP_DOWNLOAD_APPLICATION_ID,
  TEMP_MINIMAL_GET_APPLICATION_ID,
].join(', ');

const setLoggedStudent = async studentId => {
  await sequelize.query('DELETE FROM logged_student');
  await sequelize.query('INSERT INTO logged_student (student_id) VALUES (:studentId)', {
    replacements: { studentId },
  });
};

const cleanupTempRows = async () => {
  await sequelize.query(`
    DELETE FROM thesis_supervisor_cosupervisor
    WHERE thesis_id IN (${TEMP_DOWNLOAD_THESIS_ID}, ${TEMP_CANCEL_THESIS_ID})
       OR thesis_id IN (
         SELECT id
         FROM thesis
         WHERE thesis_application_id IN (${TEMP_APPLICATION_IDS})
       )
  `);
  await sequelize.query(`
    DELETE FROM thesis
    WHERE id IN (${TEMP_DOWNLOAD_THESIS_ID}, ${TEMP_CANCEL_THESIS_ID})
       OR thesis_application_id IN (${TEMP_APPLICATION_IDS})
  `);
  await sequelize.query(`
    DELETE FROM thesis_application_status_history
    WHERE thesis_application_id IN (${TEMP_APPLICATION_IDS})
  `);
  await sequelize.query(`
    DELETE FROM thesis_application_supervisor_cosupervisor
    WHERE thesis_application_id IN (${TEMP_APPLICATION_IDS})
  `);
  await sequelize.query(`
    DELETE FROM thesis_application
    WHERE id IN (${TEMP_APPLICATION_IDS})
  `);
  await fs.rm(DOWNLOADS_DIR, { recursive: true, force: true });
};

const seedTempStudents = async () => {
  await sequelize.query(`
    DELETE FROM student
    WHERE id IN ('${TEMP_CREATE_STUDENT_ID}', '${TEMP_CANCEL_STUDENT_ID}', '${TEMP_NO_THESIS_STUDENT_ID}')
  `);
  await sequelize.query(`
    INSERT INTO student (id, first_name, last_name, profile_picture_url, degree_id)
    VALUES
      ('${TEMP_CREATE_STUDENT_ID}', 'Temp', 'Create', NULL, '32-1'),
      ('${TEMP_CANCEL_STUDENT_ID}', 'Temp', 'Cancel', NULL, '32-1'),
      ('${TEMP_NO_THESIS_STUDENT_ID}', 'Temp', 'NoThesis', NULL, '32-1')
  `);
};

beforeAll(async () => {
  server = app.listen(0);
  await cleanupTempRows();
  await seedTempStudents();
});

beforeEach(async () => {
  await cleanupTempRows();
  await setLoggedStudent(DEFAULT_STUDENT_ID);
});

afterAll(async () => {
  await setLoggedStudent(DEFAULT_STUDENT_ID);
  await cleanupTempRows();
  await sequelize.query(`
    DELETE FROM student
    WHERE id IN ('${TEMP_CREATE_STUDENT_ID}', '${TEMP_CANCEL_STUDENT_ID}', '${TEMP_NO_THESIS_STUDENT_ID}')
  `);
  await server.close(() => {
    sequelize.close();
  });
});

describe('GET /api/thesis', () => {
  test('Should return the logged student thesis', async () => {
    const response = await request(server).get('/api/thesis');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', 1);
    expect(response.body).toHaveProperty('topic');
    expect(response.body).toHaveProperty('student');
    expect(response.body).toHaveProperty('supervisor');
    expect(Array.isArray(response.body.coSupervisors)).toBe(true);
    expect(response.body).toHaveProperty('thesisStartDate');
    expect(response.body.thesisStartDate).toContain('2025-02-01');
  });

  test('Should return 401 when there is no logged student', async () => {
    await sequelize.query('DELETE FROM logged_student');

    const response = await request(server).get('/api/thesis');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'No logged-in student found' });
  });

  test('Should return 404 when logged student has no thesis', async () => {
    await setLoggedStudent(TEMP_NO_THESIS_STUDENT_ID);

    const response = await request(server).get('/api/thesis');
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message', 'Thesis not found for the logged-in student.');
  });

  test('Should return a minimal thesis with null company and no co-supervisors', async () => {
    await sequelize.query(`
      INSERT INTO thesis_application (
        id, topic, student_id, thesis_proposal_id, company_id, submission_date, status
      ) VALUES (
        ${TEMP_MINIMAL_GET_APPLICATION_ID}, 'Integration minimal thesis', '${TEMP_CREATE_STUDENT_ID}', NULL, NULL, NOW(), 'approved'
      )
    `);
    await sequelize.query(`
      INSERT INTO thesis (
        id,
        topic,
        thesis_application_id,
        student_id,
        company_id,
        thesis_start_date,
        status
      ) VALUES (
        ${TEMP_MINIMAL_GET_THESIS_ID},
        'Minimal thesis topic',
        ${TEMP_MINIMAL_GET_APPLICATION_ID},
        '${TEMP_CREATE_STUDENT_ID}',
        NULL,
        NOW(),
        'ongoing'
      )
    `);
    await sequelize.query(`
      INSERT INTO thesis_supervisor_cosupervisor (thesis_id, teacher_id, scope, is_supervisor)
      VALUES (${TEMP_MINIMAL_GET_THESIS_ID}, 3019, 'live', 1)
    `);
    await setLoggedStudent(TEMP_CREATE_STUDENT_ID);

    const response = await request(server).get('/api/thesis');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: TEMP_MINIMAL_GET_THESIS_ID,
      topic: 'Minimal thesis topic',
      company: null,
      status: 'ongoing',
      thesisConclusionRequestDate: null,
      thesisConclusionConfirmationDate: null,
      thesisDraftDate: null,
    });
    expect(response.body.coSupervisors).toEqual([]);
    expect(response.body.supervisor).toMatchObject({ id: 3019, firstName: 'Marco', lastName: 'Torchiano' });
  });
});

describe('POST /api/thesis', () => {
  test('Should return 401 when creating a thesis without a logged student', async () => {
    await sequelize.query('DELETE FROM logged_student');

    const response = await request(server)
      .post('/api/thesis')
      .send({
        topic: 'Unauthorized thesis creation',
        thesisApplicationId: TEMP_CREATE_APPLICATION_ID,
        supervisor: { id: 3019 },
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'No logged-in student found' });
  });

  test('Should create a thesis for a logged student without an existing thesis', async () => {
    await sequelize.query(`
      INSERT INTO thesis_application (
        id, topic, student_id, thesis_proposal_id, company_id, submission_date, status
      ) VALUES (
        ${TEMP_CREATE_APPLICATION_ID}, 'Integration create thesis', '${TEMP_CREATE_STUDENT_ID}', NULL, NULL, NOW(), 'pending'
      )
    `);
    await setLoggedStudent(TEMP_CREATE_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis')
      .send({
        topic: 'Integration created thesis topic',
        thesisApplicationId: TEMP_CREATE_APPLICATION_ID,
        supervisor: { id: 3019 },
        coSupervisors: [{ id: 38485 }],
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('topic', 'Integration created thesis topic');
    expect(response.body).toHaveProperty('status', 'ongoing');

    const [createdRows] = await sequelize.query(`
      SELECT id
      FROM thesis
      WHERE thesis_application_id = ${TEMP_CREATE_APPLICATION_ID}
    `);
    expect(createdRows).toHaveLength(1);
  });

  test('Should create a minimal thesis without company or co-supervisors', async () => {
    await sequelize.query(`
      INSERT INTO thesis_application (
        id, topic, student_id, thesis_proposal_id, company_id, submission_date, status
      ) VALUES (
        ${TEMP_CREATE_APPLICATION_ID}, 'Integration create minimal thesis', '${TEMP_CREATE_STUDENT_ID}', NULL, NULL, NOW(), 'pending'
      )
    `);
    await setLoggedStudent(TEMP_CREATE_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis')
      .send({
        topic: 'Integration minimal thesis topic',
        thesisApplicationId: TEMP_CREATE_APPLICATION_ID,
        supervisor: { id: 3019 },
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      topic: 'Integration minimal thesis topic',
      status: 'ongoing',
      company: null,
    });
    expect(response.body.coSupervisors).toEqual([]);

    const [links] = await sequelize.query(`
      SELECT teacher_id, is_supervisor
      FROM thesis_supervisor_cosupervisor
      WHERE thesis_id = (
        SELECT id
        FROM thesis
        WHERE thesis_application_id = ${TEMP_CREATE_APPLICATION_ID}
      )
      ORDER BY is_supervisor DESC, teacher_id ASC
    `);
    expect(links).toEqual([{ teacher_id: 3019, is_supervisor: 1 }]);
  });
});

describe('GET /api/thesis/all', () => {
  test('Should return all theses', async () => {
    const response = await request(server).get('/api/thesis/all');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/thesis/:id/:fileType', () => {
  beforeEach(async () => {
    await fs.mkdir(DOWNLOADS_DIR, { recursive: true });
    await fs.writeFile(path.join(DOWNLOADS_DIR, 'test_thesis_9200.pdf'), 'test thesis file');

    await sequelize.query(`
      INSERT INTO thesis_application (
        id, topic, student_id, thesis_proposal_id, company_id, submission_date, status
      ) VALUES (
        ${TEMP_DOWNLOAD_APPLICATION_ID}, 'Integration download thesis', '${TEMP_CREATE_STUDENT_ID}', NULL, NULL, NOW(), 'pending'
      )
    `);
    await sequelize.query(`
      INSERT INTO thesis (
        id,
        topic,
        thesis_application_id,
        student_id,
        company_id,
        thesis_start_date,
        status,
        thesis_file_path
      ) VALUES (
        ${TEMP_DOWNLOAD_THESIS_ID},
        'Download thesis topic',
        ${TEMP_DOWNLOAD_APPLICATION_ID},
        '${TEMP_CREATE_STUDENT_ID}',
        NULL,
        NOW(),
        'ongoing',
        'uploads/test_downloads/test_thesis_9200.pdf'
      )
    `);
  });

  test('Should return 404 when thesis is not found', async () => {
    const response = await request(server).get('/api/thesis/99999/thesis');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Thesis not found' });
  });

  test('Should return 400 when fileType is invalid', async () => {
    const response = await request(server).get(`/api/thesis/${TEMP_DOWNLOAD_THESIS_ID}/invalid`);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid file type requested' });
  });

  test('Should return 404 when requested file path is missing', async () => {
    const response = await request(server).get(`/api/thesis/${TEMP_DOWNLOAD_THESIS_ID}/summary`);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Requested file not found for this thesis' });
  });

  test('Should download thesis file when present', async () => {
    const response = await request(server).get(`/api/thesis/${TEMP_DOWNLOAD_THESIS_ID}/thesis`);
    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toContain('test_thesis_9200.pdf');
  });
});

describe('POST /api/thesis/cancel', () => {
  beforeEach(async () => {
    await sequelize.query(`
      INSERT INTO thesis_application (
        id, topic, student_id, thesis_proposal_id, company_id, submission_date, status
      ) VALUES (
        ${TEMP_CANCEL_APPLICATION_ID}, 'Integration cancel thesis', '${TEMP_CANCEL_STUDENT_ID}', NULL, NULL, NOW(), 'pending'
      )
    `);
    await sequelize.query(`
      INSERT INTO thesis (
        id,
        topic,
        thesis_application_id,
        student_id,
        company_id,
        thesis_start_date,
        status
      ) VALUES (
        ${TEMP_CANCEL_THESIS_ID},
        'Cancel thesis topic',
        ${TEMP_CANCEL_APPLICATION_ID},
        '${TEMP_CANCEL_STUDENT_ID}',
        NULL,
        NOW(),
        'ongoing'
      )
    `);
    await setLoggedStudent(TEMP_CANCEL_STUDENT_ID);
  });

  test('Should accept cancellation request for an ongoing thesis', async () => {
    const response = await request(server).post('/api/thesis/cancel');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Thesis cancellation requested successfully.' });

    const [rows] = await sequelize.query(`SELECT status FROM thesis WHERE id = ${TEMP_CANCEL_THESIS_ID}`);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('cancel_requested');
  });

  test('Should return 401 when requesting thesis cancellation without a logged student', async () => {
    await sequelize.query('DELETE FROM logged_student');

    const response = await request(server).post('/api/thesis/cancel');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'No logged-in student found' });
  });

  test('Should return 404 when the logged student has no thesis to cancel', async () => {
    await setLoggedStudent(TEMP_NO_THESIS_STUDENT_ID);

    const response = await request(server).post('/api/thesis/cancel');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Thesis not found for the logged-in student.' });
  });

  test('Should reject cancellation request when thesis is not ongoing', async () => {
    await request(server).post('/api/thesis/cancel');
    const response = await request(server).post('/api/thesis/cancel');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Thesis cancellation is not allowed for this thesis status.' });
  });
});
