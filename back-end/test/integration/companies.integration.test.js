require('jest');

const { app } = require('../../src/app');
const { sequelize } = require('../../src/models');
const request = require('supertest');

let server;

beforeAll(async () => {
  server = app.listen(0);
});

afterAll(async () => {
  await server.close(() => {
    sequelize.close();
  });
});

describe('GET /api/companies', () => {
  test('Should return all companies ordered by corporate name', async () => {
    const response = await request(server).get('/api/companies');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(5);

    const [first, second, third, fourth, fifth] = response.body;
    expect(first.corporateName).toBe('AutoMotive Innovations');
    expect(second.corporateName).toBe('BioHealth Technologies');
    expect(third.corporateName).toBe('Green Energy Corp.');
    expect(fourth.corporateName).toBe('Innovatech S.p.A.');
    expect(fifth.corporateName).toBe('Tech Solutions S.r.l.');
  });
});
