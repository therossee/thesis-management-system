require('jest');

const { app } = require('../../src/app');
const { sequelize } = require('../../src/models');

const request = require('supertest');

let server;

const TEMP_APPROVED_APPLICATION_ID = 9001;
const TEMP_REJECTED_APPLICATION_ID = 9002;
const TEMP_THESIS_APPLICATION_ID = 9010;
const TEMP_THESIS_APPROVAL_APPLICATION_ID = 9011;
const TEMP_THESIS_ID = 9100;
const TEMP_THESIS_APPROVAL_ID = 9101;

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
           ${TEMP_THESIS_APPLICATION_ID},
           ${TEMP_THESIS_APPROVAL_APPLICATION_ID}
         )
       )
  `);
  await sequelize.query(`
    DELETE FROM thesis
    WHERE id IN (${TEMP_THESIS_ID}, ${TEMP_THESIS_APPROVAL_ID})
       OR thesis_application_id IN (
         ${TEMP_APPROVED_APPLICATION_ID},
         ${TEMP_REJECTED_APPLICATION_ID},
         ${TEMP_THESIS_APPLICATION_ID},
         ${TEMP_THESIS_APPROVAL_APPLICATION_ID}
       )
  `);
  await sequelize.query(`
    DELETE FROM thesis_application_status_history
    WHERE thesis_application_id IN (
      ${TEMP_APPROVED_APPLICATION_ID},
      ${TEMP_REJECTED_APPLICATION_ID},
      ${TEMP_THESIS_APPLICATION_ID},
      ${TEMP_THESIS_APPROVAL_APPLICATION_ID}
    )
  `);
  await sequelize.query(`
    DELETE FROM thesis_application_supervisor_cosupervisor
    WHERE thesis_application_id IN (
      ${TEMP_APPROVED_APPLICATION_ID},
      ${TEMP_REJECTED_APPLICATION_ID},
      ${TEMP_THESIS_APPLICATION_ID},
      ${TEMP_THESIS_APPROVAL_APPLICATION_ID}
    )
  `);
  await sequelize.query(`
    DELETE FROM thesis_application
    WHERE id IN (
      ${TEMP_APPROVED_APPLICATION_ID},
      ${TEMP_REJECTED_APPLICATION_ID},
      ${TEMP_THESIS_APPLICATION_ID},
      ${TEMP_THESIS_APPROVAL_APPLICATION_ID}
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
});
