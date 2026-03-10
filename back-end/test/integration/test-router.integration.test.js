require('jest');

const { app } = require('../../src/app');
const { sequelize } = require('../../src/models');

const request = require('supertest');

let server;
const ORIGINAL_ENV = { ...process.env };

const TEMP_APPROVED_APPLICATION_ID = 9001;
const TEMP_REJECTED_APPLICATION_ID = 9002;
const TEMP_BROKEN_APPROVAL_APPLICATION_ID = 9003;
const TEMP_THESIS_APPLICATION_ID = 9010;
const TEMP_THESIS_APPROVAL_APPLICATION_ID = 9011;
const TEMP_THESIS_TRANSITION_APPLICATION_ID = 9012;
const TEMP_THESIS_ID = 9100;
const TEMP_THESIS_APPROVAL_ID = 9101;
const TEMP_THESIS_TRANSITION_ID = 9102;

const cleanupTempData = async () => {
  await sequelize.query(`
    DELETE FROM thesis_supervisor_cosupervisor
    WHERE thesis_id IN (${TEMP_THESIS_ID}, ${TEMP_THESIS_APPROVAL_ID})
       OR thesis_id IN (
         SELECT id
         FROM thesis
         WHERE thesis_application_id IN (
           ${TEMP_APPROVED_APPLICATION_ID},
           ${TEMP_REJECTED_APPLICATION_ID},
           ${TEMP_BROKEN_APPROVAL_APPLICATION_ID},
           ${TEMP_THESIS_APPLICATION_ID},
           ${TEMP_THESIS_APPROVAL_APPLICATION_ID},
           ${TEMP_THESIS_TRANSITION_APPLICATION_ID}
         )
       )
  `);
  await sequelize.query(`
    DELETE FROM thesis
    WHERE id IN (${TEMP_THESIS_ID}, ${TEMP_THESIS_APPROVAL_ID}, ${TEMP_THESIS_TRANSITION_ID})
       OR thesis_application_id IN (
         ${TEMP_APPROVED_APPLICATION_ID},
         ${TEMP_REJECTED_APPLICATION_ID},
         ${TEMP_BROKEN_APPROVAL_APPLICATION_ID},
         ${TEMP_THESIS_APPLICATION_ID},
         ${TEMP_THESIS_APPROVAL_APPLICATION_ID},
         ${TEMP_THESIS_TRANSITION_APPLICATION_ID}
       )
  `);
  await sequelize.query(`
    DELETE FROM thesis_application_status_history
    WHERE thesis_application_id IN (
      ${TEMP_APPROVED_APPLICATION_ID},
      ${TEMP_REJECTED_APPLICATION_ID},
      ${TEMP_BROKEN_APPROVAL_APPLICATION_ID},
      ${TEMP_THESIS_APPLICATION_ID},
      ${TEMP_THESIS_APPROVAL_APPLICATION_ID},
      ${TEMP_THESIS_TRANSITION_APPLICATION_ID}
    )
  `);
  await sequelize.query(`
    DELETE FROM thesis_application_supervisor_cosupervisor
    WHERE thesis_application_id IN (
      ${TEMP_APPROVED_APPLICATION_ID},
      ${TEMP_REJECTED_APPLICATION_ID},
      ${TEMP_BROKEN_APPROVAL_APPLICATION_ID},
      ${TEMP_THESIS_APPLICATION_ID},
      ${TEMP_THESIS_APPROVAL_APPLICATION_ID},
      ${TEMP_THESIS_TRANSITION_APPLICATION_ID}
    )
  `);
  await sequelize.query(`
    DELETE FROM thesis_application
    WHERE id IN (
      ${TEMP_APPROVED_APPLICATION_ID},
      ${TEMP_REJECTED_APPLICATION_ID},
      ${TEMP_BROKEN_APPROVAL_APPLICATION_ID},
      ${TEMP_THESIS_APPLICATION_ID},
      ${TEMP_THESIS_APPROVAL_APPLICATION_ID},
      ${TEMP_THESIS_TRANSITION_APPLICATION_ID}
    )
  `);
};

const insertTempApplication = async ({ id, status = 'pending', topic = 'Temp thesis application' }) => {
  await sequelize.query(`
    INSERT INTO thesis_application (
      id,
      topic,
      student_id,
      thesis_proposal_id,
      company_id,
      submission_date,
      status
    ) VALUES (
      ${id},
      '${topic}',
      '314796',
      NULL,
      NULL,
      NOW(),
      '${status}'
    )
  `);
};

const insertTempThesis = async ({ id, applicationId, status = 'ongoing' }) => {
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
      ${id},
      'Temp thesis for status update',
      ${applicationId},
      '314796',
      NULL,
      NOW(),
      '${status}'
    )
  `);
};

const waitForApplicationStatus = async ({ applicationId, expectedStatus, retries = 5, delayMs = 30 }) => {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const [rows] = await sequelize.query(`SELECT status FROM thesis_application WHERE id = ${applicationId}`);
    if (rows.length && rows[0].status === expectedStatus) return rows[0].status;
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  const [rows] = await sequelize.query(`SELECT status FROM thesis_application WHERE id = ${applicationId}`);
  return rows.length ? rows[0].status : null;
};

const resetEnvironment = () => {
  process.env = { ...ORIGINAL_ENV };
};

const setEnvironmentValue = (key, value) => {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
};

const buildIsolatedApp = ({ nodeEnv, allowedOrigins }) => {
  let isolatedApp;

  jest.resetModules();
  resetEnvironment();
  setEnvironmentValue('NODE_ENV', nodeEnv);
  setEnvironmentValue('CORS_ALLOWED_ORIGINS', allowedOrigins);

  jest.isolateModules(() => {
    const mockRouterFactory = () => {
      const express = require('express');
      const router = express.Router();
      router.get('/health', (_req, res) => res.status(200).json({ ok: true }));
      router.options('/health', (_req, res) => res.sendStatus(204));
      return router;
    };

    jest.doMock('../../src/routers/thesis-proposals', () => mockRouterFactory());
    jest.doMock('../../src/routers/students', () => mockRouterFactory());
    jest.doMock('../../src/routers/thesis-applications', () => mockRouterFactory());
    jest.doMock('../../src/routers/thesis', () => mockRouterFactory());
    jest.doMock('../../src/routers/companies', () => mockRouterFactory());
    jest.doMock('../../src/routers/test-router', () => mockRouterFactory());
    jest.doMock('../../src/routers/thesis-conclusion', () => mockRouterFactory());

    isolatedApp = require('../../src/app').app;
  });

  return isolatedApp;
};

beforeAll(async () => {
  server = app.listen(0);
});

beforeEach(async () => {
  await cleanupTempData();
});

afterAll(async () => {
  await cleanupTempData();
  await server.close(() => {
    sequelize.close();
  });
});

describe('PUT /api/test/thesis-application', () => {
  test('Should return 404 when thesis application does not exist', async () => {
    const response = await request(server).put('/api/test/thesis-application').send({
      id: 99999,
      new_status: 'pending',
    });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Thesis application not found');
  });

  test('Should return 400 when new status matches current', async () => {
    const response = await request(server).put('/api/test/thesis-application').send({
      id: 1,
      new_status: 'pending',
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'New status must be different from the current status');
  });

  test('Should return 400 when application is closed', async () => {
    const response = await request(server).put('/api/test/thesis-application').send({
      id: 2,
      new_status: 'pending',
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Cannot update a closed application');
  });

  test('Should update application to approved and create thesis with supervisors', async () => {
    await insertTempApplication({ id: TEMP_APPROVED_APPLICATION_ID });
    await sequelize.query(`
      INSERT INTO thesis_application_supervisor_cosupervisor (thesis_application_id, teacher_id, is_supervisor)
      VALUES
        (${TEMP_APPROVED_APPLICATION_ID}, 3019, 1),
        (${TEMP_APPROVED_APPLICATION_ID}, 38485, 0)
    `);

    const response = await request(server).put('/api/test/thesis-application').send({
      id: TEMP_APPROVED_APPLICATION_ID,
      new_status: 'approved',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('thesis_application_id', TEMP_APPROVED_APPLICATION_ID);

    const status = await waitForApplicationStatus({
      applicationId: TEMP_APPROVED_APPLICATION_ID,
      expectedStatus: 'approved',
    });
    expect(status).toBe('approved');

    const [createdThesisRows] = await sequelize.query(
      `SELECT id FROM thesis WHERE thesis_application_id = ${TEMP_APPROVED_APPLICATION_ID}`,
    );
    expect(createdThesisRows).toHaveLength(1);

    const [supervisorRows] = await sequelize.query(`
      SELECT teacher_id, is_supervisor
      FROM thesis_supervisor_cosupervisor
      WHERE thesis_id = ${createdThesisRows[0].id}
    `);
    expect(supervisorRows).toHaveLength(2);
  });

  test('Should update application to a non-approved status without creating thesis', async () => {
    await insertTempApplication({ id: TEMP_REJECTED_APPLICATION_ID });

    const response = await request(server).put('/api/test/thesis-application').send({
      id: TEMP_REJECTED_APPLICATION_ID,
      new_status: 'rejected',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'rejected');

    const [updatedApplicationRows] = await sequelize.query(
      `SELECT status FROM thesis_application WHERE id = ${TEMP_REJECTED_APPLICATION_ID}`,
    );
    expect(updatedApplicationRows).toHaveLength(1);
    expect(updatedApplicationRows[0].status).toBe('rejected');

    const [createdThesisRows] = await sequelize.query(
      `SELECT id FROM thesis WHERE thesis_application_id = ${TEMP_REJECTED_APPLICATION_ID}`,
    );
    expect(createdThesisRows).toHaveLength(0);
  });

  test('Should rollback and return 500 when approving an application without a supervisor link', async () => {
    await insertTempApplication({ id: TEMP_BROKEN_APPROVAL_APPLICATION_ID });

    const response = await request(server).put('/api/test/thesis-application').send({
      id: TEMP_BROKEN_APPROVAL_APPLICATION_ID,
      new_status: 'approved',
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error' });

    const [applicationRows] = await sequelize.query(
      `SELECT status FROM thesis_application WHERE id = ${TEMP_BROKEN_APPROVAL_APPLICATION_ID}`,
    );
    expect(applicationRows).toEqual([{ status: 'pending' }]);

    const [historyRows] = await sequelize.query(
      `SELECT id FROM thesis_application_status_history WHERE thesis_application_id = ${TEMP_BROKEN_APPROVAL_APPLICATION_ID}`,
    );
    expect(historyRows).toHaveLength(0);

    const [createdThesisRows] = await sequelize.query(
      `SELECT id FROM thesis WHERE thesis_application_id = ${TEMP_BROKEN_APPROVAL_APPLICATION_ID}`,
    );
    expect(createdThesisRows).toHaveLength(0);
  });
});

describe('PUT /api/test/thesis-conclusion', () => {
  test('Should return 404 when thesis does not exist', async () => {
    const response = await request(server).put('/api/test/thesis-conclusion').send({
      thesisId: 99999,
      conclusionStatus: 'conclusion_requested',
    });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Thesis not found');
  });

  test('Should return 400 for invalid transition', async () => {
    await insertTempApplication({ id: TEMP_THESIS_APPLICATION_ID });
    await insertTempThesis({
      id: TEMP_THESIS_ID,
      applicationId: TEMP_THESIS_APPLICATION_ID,
      status: 'ongoing',
    });

    const response = await request(server).put('/api/test/thesis-conclusion').send({
      thesisId: TEMP_THESIS_ID,
      conclusionStatus: 'final_exam',
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid conclusion status transition');
  });

  test('Should update thesis status for a valid transition', async () => {
    await insertTempApplication({ id: TEMP_THESIS_APPLICATION_ID });
    await insertTempThesis({
      id: TEMP_THESIS_ID,
      applicationId: TEMP_THESIS_APPLICATION_ID,
      status: 'ongoing',
    });

    const response = await request(server).put('/api/test/thesis-conclusion').send({
      thesisId: TEMP_THESIS_ID,
      conclusionStatus: 'conclusion_requested',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'conclusion_requested');

    const [updatedThesisRows] = await sequelize.query(`SELECT status FROM thesis WHERE id = ${TEMP_THESIS_ID}`);
    expect(updatedThesisRows).toHaveLength(1);
    expect(updatedThesisRows[0].status).toBe('conclusion_requested');

    const [historyRows] = await sequelize.query(`
      SELECT old_status, new_status
      FROM thesis_application_status_history
      WHERE thesis_application_id = ${TEMP_THESIS_APPLICATION_ID}
      ORDER BY id DESC
      LIMIT 1
    `);
    expect(historyRows).toHaveLength(1);
    expect(historyRows[0].old_status).toBe('ongoing');
    expect(historyRows[0].new_status).toBe('conclusion_requested');
  });

  test('Should set confirmation date when status becomes conclusion_approved', async () => {
    await insertTempApplication({ id: TEMP_THESIS_APPROVAL_APPLICATION_ID });
    await insertTempThesis({
      id: TEMP_THESIS_APPROVAL_ID,
      applicationId: TEMP_THESIS_APPROVAL_APPLICATION_ID,
      status: 'conclusion_requested',
    });

    const response = await request(server).put('/api/test/thesis-conclusion').send({
      thesisId: TEMP_THESIS_APPROVAL_ID,
      conclusionStatus: 'conclusion_approved',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'conclusion_approved');

    const [updatedThesisRows] = await sequelize.query(`
      SELECT thesis_conclusion_confirmation_date
      FROM thesis
      WHERE id = ${TEMP_THESIS_APPROVAL_ID}
    `);
    expect(updatedThesisRows).toHaveLength(1);
    expect(updatedThesisRows[0].thesis_conclusion_confirmation_date).not.toBeNull();
  });

  test('Should return 400 when new conclusion status matches the current status', async () => {
    await insertTempApplication({ id: TEMP_THESIS_APPLICATION_ID });
    await insertTempThesis({
      id: TEMP_THESIS_ID,
      applicationId: TEMP_THESIS_APPLICATION_ID,
      status: 'conclusion_requested',
    });

    const response = await request(server).put('/api/test/thesis-conclusion').send({
      thesisId: TEMP_THESIS_ID,
      conclusionStatus: 'conclusion_requested',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'New status must be different from the current status' });
  });

  test('Should return 400 when thesis has an invalid current status for conclusion updates', async () => {
    await insertTempApplication({ id: TEMP_THESIS_APPLICATION_ID });
    await insertTempThesis({
      id: TEMP_THESIS_ID,
      applicationId: TEMP_THESIS_APPLICATION_ID,
      status: 'done',
    });

    const response = await request(server).put('/api/test/thesis-conclusion').send({
      thesisId: TEMP_THESIS_ID,
      conclusionStatus: 'ongoing',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid current thesis status for conclusion update' });
  });

  test.each([
    ['conclusion_requested', 'ongoing', false],
    ['conclusion_approved', 'almalaurea', false],
    ['almalaurea', 'compiled_questionnaire', false],
    ['compiled_questionnaire', 'final_exam', false],
    ['final_exam', 'final_thesis', false],
    ['final_thesis', 'done', false],
    ['final_thesis', 'ongoing', false],
    ['cancel_requested', 'cancel_approved', false],
    ['cancel_requested', 'ongoing', false],
    ['ongoing', 'cancel_requested', false],
  ])(
    'Should update thesis status for valid transition %s -> %s',
    async (currentStatus, nextStatus, expectsConfirmationDate) => {
      await insertTempApplication({ id: TEMP_THESIS_TRANSITION_APPLICATION_ID });
      await insertTempThesis({
        id: TEMP_THESIS_TRANSITION_ID,
        applicationId: TEMP_THESIS_TRANSITION_APPLICATION_ID,
        status: currentStatus,
      });

      const response = await request(server).put('/api/test/thesis-conclusion').send({
        thesisId: TEMP_THESIS_TRANSITION_ID,
        conclusionStatus: nextStatus,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', nextStatus);

      const [updatedThesisRows] = await sequelize.query(
        `
        SELECT status, thesis_conclusion_confirmation_date
        FROM thesis
        WHERE id = ${TEMP_THESIS_TRANSITION_ID}
        `,
      );
      expect(updatedThesisRows).toHaveLength(1);
      expect(updatedThesisRows[0].status).toBe(nextStatus);
      expect(updatedThesisRows[0].thesis_conclusion_confirmation_date !== null).toBe(expectsConfirmationDate);

      const [historyRows] = await sequelize.query(
        `
        SELECT old_status, new_status
        FROM thesis_application_status_history
        WHERE thesis_application_id = ${TEMP_THESIS_TRANSITION_APPLICATION_ID}
        ORDER BY id DESC
        LIMIT 1
        `,
      );
      expect(historyRows).toEqual([{ old_status: currentStatus, new_status: nextStatus }]);
    },
  );
});

describe('App and database config coverage through integration suite', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    resetEnvironment();
  });

  test('Should allow configured CORS origin from env list', async () => {
    const isolatedApp = buildIsolatedApp({
      nodeEnv: 'development',
      allowedOrigins: 'https://a.example,https://b.example',
    });

    const response = await request(isolatedApp)
      .options('/api/test/health')
      .set('Origin', 'https://b.example')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://b.example');
  });

  test('Should not return CORS allow-origin in production with empty allowlist', async () => {
    const isolatedApp = buildIsolatedApp({
      nodeEnv: 'production',
      allowedOrigins: '',
    });

    const response = await request(isolatedApp)
      .options('/api/test/health')
      .set('Origin', 'https://blocked.example')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('Should allow requests without Origin and hide x-powered-by header', async () => {
    const isolatedApp = buildIsolatedApp({
      nodeEnv: 'development',
      allowedOrigins: '',
    });

    const response = await request(isolatedApp).get('/api/test/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  test('Should fallback to development database config when NODE_ENV is undefined', () => {
    let SequelizeConstructor;

    jest.resetModules();
    resetEnvironment();
    setEnvironmentValue('NODE_ENV', undefined);
    setEnvironmentValue('DB_NAME', 'dev_db_name');
    setEnvironmentValue('DB_NAME_TEST', 'test_db_name');
    setEnvironmentValue('DB_USER', 'db_user');
    setEnvironmentValue('DB_PASSWORD', 'db_password');
    setEnvironmentValue('DB_HOST', 'db_host');

    jest.isolateModules(() => {
      jest.doMock('sequelize', () => ({
        Sequelize: jest.fn().mockImplementation((...args) => ({ __constructorArgs: args })),
      }));

      require('../../src/config/database');
      ({ Sequelize: SequelizeConstructor } = require('sequelize'));
    });

    expect(SequelizeConstructor).toHaveBeenCalledTimes(1);
    expect(SequelizeConstructor).toHaveBeenCalledWith(
      'dev_db_name',
      'db_user',
      'db_password',
      expect.objectContaining({
        host: 'db_host',
        dialect: 'mysql',
      }),
    );
  });
});
