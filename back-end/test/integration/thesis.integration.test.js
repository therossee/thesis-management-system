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
const TEMP_DOWNLOAD_THESIS_ID = 9200;
const TEMP_CANCEL_THESIS_ID = 9300;

const DOWNLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'test_downloads');
const TEMP_APPLICATION_IDS = [
  TEMP_CREATE_APPLICATION_ID,
  TEMP_CANCEL_APPLICATION_ID,
  TEMP_DOWNLOAD_APPLICATION_ID,
].join(', ');

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
  await request(server).put('/api/students/logged-student').send({ student_id: DEFAULT_STUDENT_ID });
});

afterAll(async () => {
  await request(server).put('/api/students/logged-student').send({ student_id: DEFAULT_STUDENT_ID });
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

  test('Should return 404 when logged student has no thesis', async () => {
    await request(server).put('/api/students/logged-student').send({ student_id: TEMP_NO_THESIS_STUDENT_ID });

    const response = await request(server).get('/api/thesis');
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message', 'Thesis not found for the logged-in student.');
  });
});

describe('POST /api/thesis', () => {
  test('Should create a thesis for a logged student without an existing thesis', async () => {
    await sequelize.query(`
      INSERT INTO thesis_application (
        id, topic, student_id, thesis_proposal_id, company_id, submission_date, status
      ) VALUES (
        ${TEMP_CREATE_APPLICATION_ID}, 'Integration create thesis', '${TEMP_CREATE_STUDENT_ID}', NULL, NULL, NOW(), 'pending'
      )
    `);
    await request(server).put('/api/students/logged-student').send({ student_id: TEMP_CREATE_STUDENT_ID });

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
    await request(server).put('/api/students/logged-student').send({ student_id: TEMP_CANCEL_STUDENT_ID });
  });

  test('Should accept cancellation request for an ongoing thesis', async () => {
    const response = await request(server).post('/api/thesis/cancel');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Thesis cancellation requested successfully.' });

    const [rows] = await sequelize.query(`SELECT status FROM thesis WHERE id = ${TEMP_CANCEL_THESIS_ID}`);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('cancel_requested');
  });

  test('Should reject cancellation request when thesis is not ongoing', async () => {
    await request(server).post('/api/thesis/cancel');
    const response = await request(server).post('/api/thesis/cancel');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Thesis cancellation is not allowed for this thesis status.' });
  });
});
