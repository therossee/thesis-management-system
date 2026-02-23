require('jest');

const fs = require('node:fs/promises');
const path = require('node:path');

const { app } = require('../../src/app');
const { sequelize } = require('../../src/models');
const request = require('supertest');

let server;

const DEFAULT_STUDENT_ID = '320213';
const TMP_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'tmp');

const resetLoggedStudent = async () => {
  await sequelize.query('DELETE FROM logged_student');
  await sequelize.query('INSERT INTO logged_student (student_id) VALUES (:studentId)', {
    replacements: { studentId: DEFAULT_STUDENT_ID },
  });
};

const cleanupTmpUploads = async () => {
  try {
    const files = await fs.readdir(TMP_UPLOAD_DIR);
    await Promise.all(files.map(file => fs.unlink(path.join(TMP_UPLOAD_DIR, file)).catch(() => {})));
  } catch {
    // no tmp dir/no files: nothing to cleanup
  }
};

beforeAll(async () => {
  server = app.listen(0, () => {
    console.log(`Test server running on port ${server.address().port}`);
  });
  await resetLoggedStudent();
  await cleanupTmpUploads();
});

beforeEach(async () => {
  await resetLoggedStudent();
  await cleanupTmpUploads();
});

afterAll(async () => {
  await resetLoggedStudent();
  await cleanupTmpUploads();
  await server.close(() => {
    sequelize.close();
  });
});

describe('GET /api/thesis-conclusion/*', () => {
  test('Should return SDGs list', async () => {
    const response = await request(server).get('/api/thesis-conclusion/sdgs');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('Should return licenses list', async () => {
    const response = await request(server).get('/api/thesis-conclusion/licenses');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('Should return embargo motivations list', async () => {
    const response = await request(server).get('/api/thesis-conclusion/embargo-motivations');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
  });

  test('Should return draft for logged student thesis', async () => {
    const response = await request(server).get('/api/thesis-conclusion/draft');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('title');
    expect(response.body).toHaveProperty('titleEng');
    expect(response.body).toHaveProperty('abstract');
    expect(response.body).toHaveProperty('abstractEng');
    expect(response.body).toHaveProperty('language');
    expect(response.body).toHaveProperty('coSupervisors');
    expect(response.body).toHaveProperty('sdgs');
  });

  test('Should return 404 when no deadlines are configured for current flow', async () => {
    const response = await request(server).get('/api/thesis-conclusion/deadlines');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'No upcoming deadline found for this flag' });
  });
});

describe('POST /api/thesis-conclusion/*', () => {
  test('Should validate conclusion request payload and reject incomplete multipart body', async () => {
    const response = await request(server)
      .post('/api/thesis-conclusion')
      .attach('thesisFile', Buffer.from('fake-pdf-content'), {
        filename: 'bad file?name.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(typeof response.body.error).toBe('string');
  });

  test('Should reject non-PDF draft upload', async () => {
    const response = await request(server)
      .post('/api/thesis-conclusion/draft')
      .attach('thesisFile', Buffer.from('plain-text'), {
        filename: 'draft file?.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('File must be a PDF file');
  });

  test('Should reject final thesis upload when file is not PDF/A', async () => {
    const response = await request(server)
      .post('/api/thesis-conclusion/upload-final-thesis')
      .attach('thesisFile', Buffer.from('%PDF-1.4\nnot-pdfa-metadata'), {
        filename: 'final file?.pdf',
        contentType: 'application/pdf',
      })
      .attach('thesisSummary', Buffer.from('%PDF-1.4\nsummary-placeholder'), {
        filename: 'summary file?.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Thesis file must include PDF/A identification metadata' });
  });
});
