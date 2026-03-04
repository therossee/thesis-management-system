require('jest');

const { app } = require('../../src/app');
const { sequelize } = require('../../src/models');

const request = require('supertest');

let server;

beforeAll(async () => {
  server = app.listen(0, () => {
    console.log(`Test server running on port ${server.address().port}`);
  });
});

afterAll(async () => {
  await server.close(() => {
    sequelize.close();
  });
});

describe('POST /api/thesis-applications', () => {
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
});

describe('GET /api/thesis-applications/eligibility', () => {
  test('Should return not eligible when logged student has a pending application', async () => {
    const response = await request(server).get('/api/thesis-applications/eligibility');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('studentId', '320213');
    expect(response.body).toHaveProperty('eligible', false);
  });
});

describe('GET /api/thesis-applications', () => {
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
