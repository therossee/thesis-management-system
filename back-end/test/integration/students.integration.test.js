require('jest');

const { app } = require('../../src/app');
const { sequelize } = require('../../src/models');

const request = require('supertest');

let server;
const DEFAULT_STUDENT_ID = '320213';
const TEMP_STUDENT_ID = '399999';

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

describe('GET /api/students', () => {
  test('Should return the list of students', async () => {
    const response = await request(server).get('/api/students');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(6);

    response.body.forEach(student => {
      expect(student).toHaveProperty('id');
      expect(student).toHaveProperty('firstName');
      expect(student).toHaveProperty('lastName');
      expect(student).toHaveProperty('degreeId');
      expect(student).toHaveProperty('isLogged');
    });

    const byId = new Map(response.body.map(student => [student.id, student]));
    expect(byId.get('320213')).toMatchObject({
      id: '320213',
      firstName: 'Luca',
      lastName: 'Barbato',
      degreeId: '37-18',
      isLogged: true,
    });
    expect(byId.get('314796')).toMatchObject({
      id: '314796',
      firstName: 'Daniele',
      lastName: 'De Rossi',
      degreeId: '37-18',
      isLogged: false,
    });
    expect(byId.get('318952')).toMatchObject({
      id: '318952',
      firstName: 'Sylvie',
      lastName: 'Molinatto',
      degreeId: '37-18',
      isLogged: false,
    });
    expect(byId.get('321001')).toMatchObject({
      id: '321001',
      firstName: 'Giulia',
      lastName: 'Rossi',
      degreeId: '37-18',
      isLogged: false,
    });
    expect(byId.get('321002')).toMatchObject({
      id: '321002',
      firstName: 'Marco',
      lastName: 'Bianchi',
      degreeId: '37-18',
      isLogged: false,
    });
    expect(byId.get('321003')).toMatchObject({
      id: '321003',
      firstName: 'Elena',
      lastName: 'Conti',
      degreeId: '37-18',
      isLogged: false,
    });

    const loggedStudents = response.body.filter(student => student.isLogged);
    expect(loggedStudents).toHaveLength(1);
    expect(loggedStudents[0].id).toBe('320213');
  });
});

describe('GET /api/students/logged-student', () => {
  test('Should return the logged student', async () => {
    const response = await request(server).get('/api/students/logged-student');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: '320213',
      firstName: 'Luca',
      lastName: 'Barbato',
      profilePictureUrl: 'https://avatars.githubusercontent.com/u/59212611',
      degreeId: '37-18',
    });
  });
});

describe('PUT /api/students/logged-student', () => {
  afterAll(async () => {
    await request(server).put('/api/students/logged-student').send({ student_id: DEFAULT_STUDENT_ID });
  });
  test('Should update the logged student', async () => {
    const response = await request(server).put('/api/students/logged-student').send({ student_id: '314796' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Logged student updated' });
  });

  test('Should return 400 if student_id is missing', async () => {
    const response = await request(server).put('/api/students/logged-student');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Missing student id' });
  });

  test('Should return 404 if student_id is not found', async () => {
    const response = await request(server).put('/api/students/logged-student').send({ student_id: '999999' });
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Student not found' });
  });
});

describe('GET /api/students/required-summary', () => {
  beforeAll(async () => {
    await sequelize.query('DELETE FROM logged_student WHERE student_id = :studentId', {
      replacements: { studentId: TEMP_STUDENT_ID },
    });
    await sequelize.query('DELETE FROM student WHERE id = :studentId', {
      replacements: { studentId: TEMP_STUDENT_ID },
    });
    await sequelize.query(
      `
      INSERT INTO student (id, first_name, last_name, profile_picture_url, degree_id)
      VALUES (:id, 'Temp', 'Student', NULL, '32-1')
      `,
      { replacements: { id: TEMP_STUDENT_ID } },
    );
  });

  afterAll(async () => {
    await request(server).put('/api/students/logged-student').send({ student_id: DEFAULT_STUDENT_ID });
    await sequelize.query('DELETE FROM logged_student WHERE student_id = :studentId', {
      replacements: { studentId: TEMP_STUDENT_ID },
    });
    await sequelize.query('DELETE FROM student WHERE id = :studentId', {
      replacements: { studentId: TEMP_STUDENT_ID },
    });
  });

  test('Should return requiredSummary=true for a CL003 student', async () => {
    await request(server).put('/api/students/logged-student').send({ student_id: DEFAULT_STUDENT_ID });

    const response = await request(server).get('/api/students/required-summary');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ requiredSummary: true });
  });

  test('Should return requiredSummary=false for a non-CL003 student', async () => {
    await request(server).put('/api/students/logged-student').send({ student_id: TEMP_STUDENT_ID });

    const response = await request(server).get('/api/students/required-summary');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ requiredSummary: false });
  });
});
