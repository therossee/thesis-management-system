require('jest');

const fs = require('node:fs/promises');
const path = require('node:path');

const { app } = require('../../src/app');
const { sequelize } = require('../../src/models');
const request = require('supertest');

let server;

const DEFAULT_STUDENT_ID = '320213';
const TEMP_STUDENT_ID = '399994';
const TEMP_ONGOING_APPLICATION_ID = 9052;
const TEMP_FINAL_APPLICATION_ID = 9053;
const TEMP_APPLICATION_ONLY_ID = 9054;
const TEMP_ONGOING_THESIS_ID = 9400;
const TEMP_FINAL_THESIS_ID = 9401;
const TEMP_PRIMARY_SDG_ID = 901;
const TEMP_SECONDARY_SDG_ID = 902;
const TEMP_LICENSE_ID = 9902;
const TEMP_FIRST_SESSION_ID = 9900;
const TEMP_SECOND_SESSION_ID = 9901;
const TMP_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'tmp');
const TEMP_DRAFT_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'thesis_conclusion_draft', TEMP_STUDENT_ID);
const TEMP_REQUEST_UPLOAD_DIR = path.join(
  __dirname,
  '..',
  '..',
  'uploads',
  'thesis_conclusion_request',
  TEMP_STUDENT_ID,
);
const TEMP_FINAL_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'final_thesis', TEMP_STUDENT_ID);
const VALID_PDFA_CONTENT = Buffer.from(
  '%PDF-1.7\n<pdfaid:part>1</pdfaid:part>\n<pdfaid:conformance>B</pdfaid:conformance>\n',
  'latin1',
);

const resetLoggedStudent = async () => {
  await sequelize.query('DELETE FROM logged_student');
  await sequelize.query('INSERT INTO logged_student (student_id) VALUES (:studentId)', {
    replacements: { studentId: DEFAULT_STUDENT_ID },
  });
};

const setLoggedStudent = async studentId => {
  await sequelize.query('DELETE FROM logged_student');
  await sequelize.query('INSERT INTO logged_student (student_id) VALUES (:studentId)', {
    replacements: { studentId },
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

const cleanupTempConclusionRows = async () => {
  await sequelize.query(`DELETE FROM logged_student WHERE student_id = '${TEMP_STUDENT_ID}'`);
  await sequelize.query(`
    DELETE FROM thesis_embargo_motivation
    WHERE thesis_embargo_id IN (
      SELECT id
      FROM thesis_embargo
      WHERE thesis_id IN (
        SELECT id
        FROM thesis
        WHERE student_id = '${TEMP_STUDENT_ID}'
      )
    )
  `);
  await sequelize.query(`
    DELETE FROM thesis_embargo
    WHERE thesis_id IN (
      SELECT id
      FROM thesis
      WHERE student_id = '${TEMP_STUDENT_ID}'
    )
  `);
  await sequelize.query(`
    DELETE FROM thesis_keyword
    WHERE thesis_id IN (
      SELECT id
      FROM thesis
      WHERE student_id = '${TEMP_STUDENT_ID}'
    )
  `);
  await sequelize.query(`
    DELETE FROM thesis_sustainable_development_goal
    WHERE thesis_id IN (
      SELECT id
      FROM thesis
      WHERE student_id = '${TEMP_STUDENT_ID}'
    )
  `);
  await sequelize.query(`
    DELETE FROM thesis_supervisor_cosupervisor
    WHERE thesis_id IN (
      SELECT id
      FROM thesis
      WHERE student_id = '${TEMP_STUDENT_ID}'
    )
  `);
  await sequelize.query(`
    DELETE FROM thesis_application_status_history
    WHERE thesis_application_id IN (
      SELECT id
      FROM thesis_application
      WHERE student_id = '${TEMP_STUDENT_ID}'
    )
  `);
  await sequelize.query(`
    DELETE FROM thesis
    WHERE student_id = '${TEMP_STUDENT_ID}'
  `);
  await sequelize.query(`
    DELETE FROM thesis_application_supervisor_cosupervisor
    WHERE thesis_application_id IN (
      SELECT id
      FROM thesis_application
      WHERE student_id = '${TEMP_STUDENT_ID}'
    )
  `);
  await sequelize.query(`
    DELETE FROM thesis_application
    WHERE student_id = '${TEMP_STUDENT_ID}'
  `);
  await sequelize.query(`
    DELETE FROM deadline
    WHERE graduation_session_id IN (${TEMP_FIRST_SESSION_ID}, ${TEMP_SECOND_SESSION_ID})
  `);
  await sequelize.query(`
    DELETE FROM graduation_session
    WHERE id IN (${TEMP_FIRST_SESSION_ID}, ${TEMP_SECOND_SESSION_ID})
  `);
  await sequelize.query(`
    DELETE FROM license
    WHERE id = ${TEMP_LICENSE_ID}
  `);
  await fs.rm(TEMP_DRAFT_UPLOAD_DIR, { recursive: true, force: true });
  await fs.rm(TEMP_REQUEST_UPLOAD_DIR, { recursive: true, force: true });
  await fs.rm(TEMP_FINAL_UPLOAD_DIR, { recursive: true, force: true });
};

const seedTempStudent = async () => {
  await sequelize.query(`DELETE FROM student WHERE id = '${TEMP_STUDENT_ID}'`);
  await sequelize.query(`
    INSERT INTO student (id, first_name, last_name, profile_picture_url, degree_id)
    VALUES ('${TEMP_STUDENT_ID}', 'Temp', 'Conclusion', NULL, '32-1')
  `);
};

const seedTempSustainableGoals = async () => {
  await sequelize.query(`
    DELETE FROM sustainable_development_goal
    WHERE id IN (${TEMP_PRIMARY_SDG_ID}, ${TEMP_SECONDARY_SDG_ID})
  `);
  await sequelize.query(`
    INSERT INTO sustainable_development_goal (id, goal)
    VALUES
      (${TEMP_PRIMARY_SDG_ID}, 'Integration SDG Primary'),
      (${TEMP_SECONDARY_SDG_ID}, 'Integration SDG Secondary')
  `);
};

const seedOngoingTempThesis = async () => {
  await sequelize.query(`
    INSERT INTO thesis_application (
      id, topic, student_id, thesis_proposal_id, company_id, submission_date, status
    ) VALUES (
      ${TEMP_ONGOING_APPLICATION_ID},
      'Integration ongoing thesis application',
      '${TEMP_STUDENT_ID}',
      NULL,
      NULL,
      NOW(),
      'approved'
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
      ${TEMP_ONGOING_THESIS_ID},
      'Integration ongoing thesis topic',
      ${TEMP_ONGOING_APPLICATION_ID},
      '${TEMP_STUDENT_ID}',
      NULL,
      NOW(),
      'ongoing'
    )
  `);
  await sequelize.query(`
    INSERT INTO thesis_supervisor_cosupervisor (thesis_id, teacher_id, scope, is_supervisor)
    VALUES (${TEMP_ONGOING_THESIS_ID}, 3019, 'live', 1)
  `);
};

const seedFinalExamTempThesis = async () => {
  await sequelize.query(`
    INSERT INTO thesis_application (
      id, topic, student_id, thesis_proposal_id, company_id, submission_date, status
    ) VALUES (
      ${TEMP_FINAL_APPLICATION_ID},
      'Integration final exam thesis application',
      '${TEMP_STUDENT_ID}',
      NULL,
      NULL,
      NOW(),
      'approved'
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
      ${TEMP_FINAL_THESIS_ID},
      'Integration final exam thesis topic',
      ${TEMP_FINAL_APPLICATION_ID},
      '${TEMP_STUDENT_ID}',
      NULL,
      NOW(),
      'final_exam'
    )
  `);
};

const seedApplicationOnlyTempStudent = async () => {
  await sequelize.query(`
    INSERT INTO thesis_application (
      id, topic, student_id, thesis_proposal_id, company_id, submission_date, status
    ) VALUES (
      ${TEMP_APPLICATION_ONLY_ID},
      'Integration application only',
      '${TEMP_STUDENT_ID}',
      NULL,
      NULL,
      NOW(),
      'approved'
    )
  `);
};

const seedDeadlineSessions = async () => {
  await sequelize.query(`
    INSERT INTO graduation_session (id, session_name, session_name_en)
    VALUES
      (${TEMP_FIRST_SESSION_ID}, 'Prima sessione integrazione', 'First integration session'),
      (${TEMP_SECOND_SESSION_ID}, 'Seconda sessione integrazione', 'Second integration session')
  `);
  await sequelize.query(`
    INSERT INTO deadline (id, deadline_type, graduation_session_id, deadline_date)
    VALUES
      (99001, 'final_exam_registration', ${TEMP_FIRST_SESSION_ID}, '2099-01-10 10:00:00'),
      (99002, 'final_exam_registration', ${TEMP_SECOND_SESSION_ID}, '2099-02-10 10:00:00'),
      (99003, 'conclusion_request', ${TEMP_SECOND_SESSION_ID}, '2099-01-20 10:00:00')
  `);
};

const seedSingleDeadlineSession = async () => {
  await sequelize.query(`
    INSERT INTO graduation_session (id, session_name, session_name_en)
    VALUES
      (${TEMP_FIRST_SESSION_ID}, 'Prima sessione integrazione', 'First integration session')
  `);
  await sequelize.query(`
    INSERT INTO deadline (id, deadline_type, graduation_session_id, deadline_date)
    VALUES
      (99001, 'final_exam_registration', ${TEMP_FIRST_SESSION_ID}, '2099-01-10 10:00:00')
  `);
};

beforeAll(async () => {
  server = app.listen(0, () => {
    console.log(`Test server running on port ${server.address().port}`);
  });
  await resetLoggedStudent();
  await cleanupTempConclusionRows();
  await seedTempStudent();
  await seedTempSustainableGoals();
  await cleanupTmpUploads();
});

beforeEach(async () => {
  await cleanupTempConclusionRows();
  await resetLoggedStudent();
  await cleanupTmpUploads();
});

afterAll(async () => {
  await cleanupTempConclusionRows();
  await resetLoggedStudent();
  await sequelize.query(`
    DELETE FROM sustainable_development_goal
    WHERE id IN (${TEMP_PRIMARY_SDG_ID}, ${TEMP_SECONDARY_SDG_ID})
  `);
  await sequelize.query(`DELETE FROM student WHERE id = '${TEMP_STUDENT_ID}'`);
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
    expect(response.body).toHaveProperty('embargo');
    expect(response.body).toHaveProperty('sdgs');
  });

  test('Should return 401 when fetching draft without a logged student', async () => {
    await sequelize.query('DELETE FROM logged_student');

    const response = await request(server).get('/api/thesis-conclusion/draft');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  test('Should return an empty draft payload for a thesis without saved draft data', async () => {
    await seedOngoingTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server).get('/api/thesis-conclusion/draft');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      title: null,
      titleEng: null,
      abstract: null,
      abstractEng: null,
      language: null,
      licenseId: null,
      thesisFilePath: null,
      thesisSummaryPath: null,
      additionalZipPath: null,
      coSupervisors: [],
      embargo: null,
      sdgs: [],
      keywords: [],
    });
  });

  test('Should return 401 when fetching deadlines without a logged student', async () => {
    await sequelize.query('DELETE FROM logged_student');

    const response = await request(server).get('/api/thesis-conclusion/deadlines');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'No logged-in student found' });
  });

  test('Should return deadlines for a student with an approved application and no thesis', async () => {
    await seedApplicationOnlyTempStudent();
    await seedDeadlineSessions();
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server).get('/api/thesis-conclusion/deadlines');

    expect(response.status).toBe(200);
    expect(response.body.graduationSession).toEqual({
      id: TEMP_SECOND_SESSION_ID,
      sessionName: 'Seconda sessione integrazione',
      sessionNameEn: 'Second integration session',
    });
    expect(response.body.deadlines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          graduationSessionId: TEMP_SECOND_SESSION_ID,
          deadlineType: 'conclusion_request',
        }),
      ]),
    );
  });

  test('Should return 404 when no deadlines are configured for current flow', async () => {
    const response = await request(server).get('/api/thesis-conclusion/deadlines');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'No upcoming deadline found for this flag' });
  });
});

describe('POST /api/thesis-conclusion/*', () => {
  test('Should save and return a populated thesis conclusion draft for a temporary thesis', async () => {
    await seedOngoingTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);

    const draftResponse = await request(server)
      .post('/api/thesis-conclusion/draft')
      .field('title', 'Draft integration title')
      .field('abstract', 'Draft integration abstract')
      .field('language', 'it')
      .field('coSupervisors', JSON.stringify([{ id: 38485, firstName: 'Riccardo', lastName: 'Coppola' }]))
      .field('keywords', JSON.stringify([{ id: 1, keyword: 'APPLICAZIONI WEB' }, 'draft custom keyword']))
      .field('sdgs', JSON.stringify([{ goalId: TEMP_PRIMARY_SDG_ID, level: 'primary' }]))
      .field('embargo', JSON.stringify({ duration: '12_months', motivations: [{ motivationId: 1 }] }))
      .attach('thesisFile', VALID_PDFA_CONTENT, {
        filename: 'draft-thesis.pdf',
        contentType: 'application/pdf',
      })
      .attach('thesisSummary', VALID_PDFA_CONTENT, {
        filename: 'draft-summary.pdf',
        contentType: 'application/pdf',
      })
      .attach('additionalZip', Buffer.from('draft-zip-content'), {
        filename: 'draft-additional.zip',
        contentType: 'application/zip',
      });

    expect(draftResponse.status).toBe(200);
    expect(draftResponse.body).toEqual({ message: 'Draft saved successfully' });

    const draftFetchResponse = await request(server).get('/api/thesis-conclusion/draft');

    expect(draftFetchResponse.status).toBe(200);
    expect(draftFetchResponse.body).toMatchObject({
      title: 'Draft integration title',
      abstract: 'Draft integration abstract',
      language: 'it',
      thesisFilePath: `uploads/thesis_conclusion_draft/${TEMP_STUDENT_ID}/draft-thesis.pdf`,
      thesisSummaryPath: `uploads/thesis_conclusion_draft/${TEMP_STUDENT_ID}/draft-summary.pdf`,
      additionalZipPath: `uploads/thesis_conclusion_draft/${TEMP_STUDENT_ID}/draft-additional.zip`,
      embargo: {
        duration: '12_months',
        motivations: [{ motivationId: 1, otherMotivation: null }],
      },
      sdgs: [{ goalId: TEMP_PRIMARY_SDG_ID, level: 'primary' }],
    });
    expect(draftFetchResponse.body.coSupervisors).toEqual([
      expect.objectContaining({ id: 38485, firstName: 'Riccardo', lastName: 'Coppola' }),
    ]);
    expect(draftFetchResponse.body.keywords).toEqual(
      expect.arrayContaining([
        { id: 1, keyword: 'IA' },
        { id: null, keyword: 'draft custom keyword' },
      ]),
    );
  });

  test('Should reject draft payload when nullable fields are sent with invalid native types', async () => {
    await seedOngoingTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server).post('/api/thesis-conclusion/draft').send({
      title: 123,
      removeThesisSummary: true,
      removeThesisFile: false,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Expected string');
  });

  test('Should return 404 when saving a draft for a student without a thesis', async () => {
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server).post('/api/thesis-conclusion/draft').send({
      removeThesisSummary: '1',
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Thesis not found' });
  });

  test('Should return 400 when saving a draft for a thesis that is not ongoing', async () => {
    await seedFinalExamTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server).post('/api/thesis-conclusion/draft').send({
      title: 'Invalid state draft',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'No draft can be saved for current thesis status' });
  });

  test('Should remove stored draft files and clear embargo when switching to a license', async () => {
    await seedOngoingTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);
    await sequelize.query(
      `
      INSERT INTO license (id, name, name_en, description, description_en)
      VALUES (:id, 'Integration license', 'Integration license', 'Integration license', 'Integration license')
      `,
      { replacements: { id: TEMP_LICENSE_ID } },
    );

    await fs.mkdir(TEMP_DRAFT_UPLOAD_DIR, { recursive: true });

    const storedSummaryPath = path.join(TEMP_DRAFT_UPLOAD_DIR, 'old-summary.pdf');
    const storedThesisPath = path.join(TEMP_DRAFT_UPLOAD_DIR, 'old-thesis.pdf');
    const storedZipPath = path.join(TEMP_DRAFT_UPLOAD_DIR, 'old-additional.zip');

    await Promise.all([
      fs.writeFile(storedSummaryPath, VALID_PDFA_CONTENT),
      fs.writeFile(storedThesisPath, VALID_PDFA_CONTENT),
      fs.writeFile(storedZipPath, Buffer.from('old-zip-content')),
    ]);

    await sequelize.query(
      `
      UPDATE thesis
      SET thesis_summary_path = :summaryPath,
          thesis_file_path = :thesisPath,
          additional_zip_path = :zipPath
      WHERE id = :thesisId
      `,
      {
        replacements: {
          summaryPath: `uploads/thesis_conclusion_draft/${TEMP_STUDENT_ID}/old-summary.pdf`,
          thesisPath: `uploads/thesis_conclusion_draft/${TEMP_STUDENT_ID}/old-thesis.pdf`,
          zipPath: `uploads/thesis_conclusion_draft/${TEMP_STUDENT_ID}/old-additional.zip`,
          thesisId: TEMP_ONGOING_THESIS_ID,
        },
      },
    );
    await sequelize.query(
      `
      INSERT INTO thesis_embargo (thesis_id, duration)
      VALUES (:thesisId, '12_months')
      `,
      { replacements: { thesisId: TEMP_ONGOING_THESIS_ID } },
    );
    await sequelize.query(
      `
      INSERT INTO thesis_embargo_motivation (thesis_embargo_id, motivation_id)
      SELECT id, 1
      FROM thesis_embargo
      WHERE thesis_id = :thesisId
      `,
      { replacements: { thesisId: String(TEMP_ONGOING_THESIS_ID) } },
    );

    const response = await request(server)
      .post('/api/thesis-conclusion/draft')
      .send({
        licenseId: String(TEMP_LICENSE_ID),
        removeThesisSummary: '1',
        removeThesisFile: '1',
        removeAdditionalZip: '1',
        coSupervisors: '{invalid-json',
        keywords: '{invalid-json',
        sdgs: '{invalid-json',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Draft saved successfully' });

    const [thesisRows] = await sequelize.query(
      `
      SELECT license_id, thesis_summary_path, thesis_file_path, additional_zip_path
      FROM thesis
      WHERE id = :thesisId
      `,
      { replacements: { thesisId: TEMP_ONGOING_THESIS_ID } },
    );
    expect(thesisRows).toEqual([
      {
        license_id: TEMP_LICENSE_ID,
        thesis_summary_path: null,
        thesis_file_path: null,
        additional_zip_path: null,
      },
    ]);

    const [embargoRows] = await sequelize.query(
      `
      SELECT id
      FROM thesis_embargo
      WHERE thesis_id = :thesisId
      `,
      { replacements: { thesisId: String(TEMP_ONGOING_THESIS_ID) } },
    );
    expect(embargoRows).toEqual([]);

    await expect(fs.access(storedSummaryPath)).rejects.toThrow();
    await expect(fs.access(storedThesisPath)).rejects.toThrow();
    await expect(fs.access(storedZipPath)).rejects.toThrow();
  });

  test('Should save an English draft using fallback fields, dedupe SDGs and preserve same-path uploads', async () => {
    await seedOngoingTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);
    await sequelize.query(
      `
      INSERT INTO license (id, name, name_en, description, description_en)
      VALUES (:id, 'Integration english license', 'Integration english license', 'Integration english license', 'Integration english license')
      `,
      { replacements: { id: TEMP_LICENSE_ID } },
    );
    await sequelize.query(
      `
      UPDATE thesis
      SET license_id = :licenseId
      WHERE id = :thesisId
      `,
      {
        replacements: {
          licenseId: TEMP_LICENSE_ID,
          thesisId: TEMP_ONGOING_THESIS_ID,
        },
      },
    );

    await fs.mkdir(TEMP_DRAFT_UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(TEMP_DRAFT_UPLOAD_DIR, 'same-file.pdf'), VALID_PDFA_CONTENT);
    await sequelize.query(
      `
      UPDATE thesis
      SET thesis_file_path = :thesisPath
      WHERE id = :thesisId
      `,
      {
        replacements: {
          thesisPath: `uploads/thesis_conclusion_draft/${TEMP_STUDENT_ID}/same-file.pdf`,
          thesisId: TEMP_ONGOING_THESIS_ID,
        },
      },
    );

    const response = await request(server)
      .post('/api/thesis-conclusion/draft')
      .field('titleEng', 'English draft title')
      .field('abstractEng', 'English draft abstract')
      .field('language', 'en')
      .field('coSupervisors', JSON.stringify([]))
      .field('keywords', JSON.stringify(['  english keyword  ']))
      .field(
        'sdgs',
        JSON.stringify([
          { goalId: TEMP_PRIMARY_SDG_ID, level: 'secondary' },
          { goalId: TEMP_PRIMARY_SDG_ID, level: 'primary' },
        ]),
      )
      .field('embargo', JSON.stringify({ duration: '18_months' }))
      .attach('thesisFile', VALID_PDFA_CONTENT, {
        filename: 'same-file.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Draft saved successfully' });

    const draftFetchResponse = await request(server).get('/api/thesis-conclusion/draft');

    expect(draftFetchResponse.status).toBe(200);
    expect(draftFetchResponse.body).toMatchObject({
      title: 'English draft title',
      titleEng: 'English draft title',
      abstract: 'English draft abstract',
      abstractEng: 'English draft abstract',
      language: 'en',
      licenseId: null,
      thesisFilePath: `uploads/thesis_conclusion_draft/${TEMP_STUDENT_ID}/same-file.pdf`,
      coSupervisors: [],
      sdgs: [{ goalId: TEMP_PRIMARY_SDG_ID, level: 'primary' }],
      keywords: [{ id: null, keyword: 'english keyword' }],
      embargo: {
        duration: '18_months',
        motivations: [],
      },
    });
  });

  test('Should reject a draft when a co-supervisor cannot be found', async () => {
    await seedOngoingTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-conclusion/draft')
      .field('title', 'Draft with invalid co-supervisor')
      .field('coSupervisors', JSON.stringify([{ id: 999999, firstName: 'Ghost', lastName: 'Teacher' }]));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'One or more co-supervisors not found' });
  });

  test('Should reject a draft when an embargo motivation cannot be found', async () => {
    await seedOngoingTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-conclusion/draft')
      .field('embargo', JSON.stringify({ duration: '12_months', motivations: [{ motivationId: 999999 }] }));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'One or more embargo motivations not found' });
  });

  test('Should parse native JSON draft fields and reject unknown keywords', async () => {
    await seedOngoingTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-conclusion/draft')
      .send({
        title: 'Native JSON draft',
        coSupervisors: [],
        keywords: [{ id: 999999, keyword: 'Ghost keyword' }],
        sdgs: [{ goalId: TEMP_PRIMARY_SDG_ID, level: 'primary' }],
        embargo: { duration: '12_months' },
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'One or more keywords not found' });
  });

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

  test('Should submit a complete conclusion request and return the transformed thesis response', async () => {
    await seedOngoingTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-conclusion')
      .field('title', 'Integration final title')
      .field('abstract', 'Integration final abstract')
      .field('language', 'en')
      .field('coSupervisors', JSON.stringify([{ id: 38485, firstName: 'Riccardo', lastName: 'Coppola' }]))
      .field('keywords', JSON.stringify([{ id: 1, keyword: 'APPLICAZIONI WEB' }, 'custom integration keyword']))
      .field(
        'sdgs',
        JSON.stringify([
          { goalId: TEMP_PRIMARY_SDG_ID, level: 'primary' },
          { goalId: TEMP_SECONDARY_SDG_ID, level: 'secondary' },
        ]),
      )
      .field(
        'embargo',
        JSON.stringify({
          duration: '12_months',
          motivations: [{ motivationId: 1 }, { motivationId: 2 }],
        }),
      )
      .attach('thesisFile', VALID_PDFA_CONTENT, {
        filename: 'request-thesis.pdf',
        contentType: 'application/pdf',
      })
      .attach('thesisSummary', VALID_PDFA_CONTENT, {
        filename: 'request-summary.pdf',
        contentType: 'application/pdf',
      })
      .attach('additionalZip', Buffer.from('request-zip-content'), {
        filename: 'request-additional.zip',
        contentType: 'application/zip',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: TEMP_ONGOING_THESIS_ID,
      title: 'Integration final title',
      titleEng: 'Integration final title',
      abstract: 'Integration final abstract',
      abstractEng: 'Integration final abstract',
      status: 'conclusion_requested',
      studentId: TEMP_STUDENT_ID,
      thesisApplicationId: TEMP_ONGOING_APPLICATION_ID,
      thesisFilePath: `uploads/thesis_conclusion_request/${TEMP_STUDENT_ID}/thesis_${TEMP_STUDENT_ID}.pdf`,
      thesisSummaryPath: `uploads/thesis_conclusion_request/${TEMP_STUDENT_ID}/summary_${TEMP_STUDENT_ID}.pdf`,
      additionalZipPath: `uploads/thesis_conclusion_request/${TEMP_STUDENT_ID}/additional_${TEMP_STUDENT_ID}.zip`,
      embargo: {
        duration: '12_months',
      },
    });
    expect(response.body.thesisConclusionRequestDate).not.toBeNull();
    expect(response.body.supervisorsAndCoSupervisors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ teacherId: 3019, isSupervisor: true }),
        expect.objectContaining({ teacherId: 38485, isSupervisor: false }),
      ]),
    );
    expect(response.body.sustainableDevelopmentGoals).toEqual(
      expect.arrayContaining([
        { goalId: TEMP_PRIMARY_SDG_ID, sdgLevel: 'primary' },
        { goalId: TEMP_SECONDARY_SDG_ID, sdgLevel: 'secondary' },
      ]),
    );
    expect(response.body.keywords).toEqual(
      expect.arrayContaining([
        { keywordId: 1, keywordOther: null },
        { keywordId: null, keywordOther: 'custom integration keyword' },
      ]),
    );
    expect(response.body.embargo.motivations).toEqual(
      expect.arrayContaining([
        { motivationId: 1, otherMotivation: null },
        { motivationId: 2, otherMotivation: null },
      ]),
    );

    const [rows] = await sequelize.query(`
      SELECT status, thesis_file_path, thesis_summary_path, additional_zip_path
      FROM thesis
      WHERE id = ${TEMP_ONGOING_THESIS_ID}
    `);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: 'conclusion_requested',
      thesis_file_path: `uploads/thesis_conclusion_request/${TEMP_STUDENT_ID}/thesis_${TEMP_STUDENT_ID}.pdf`,
      thesis_summary_path: `uploads/thesis_conclusion_request/${TEMP_STUDENT_ID}/summary_${TEMP_STUDENT_ID}.pdf`,
      additional_zip_path: `uploads/thesis_conclusion_request/${TEMP_STUDENT_ID}/additional_${TEMP_STUDENT_ID}.zip`,
    });
  });

  test('Should submit a minimal conclusion request without summary or additional files', async () => {
    await seedOngoingTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-conclusion')
      .field('title', 'Minimal integration title')
      .field('abstract', 'Minimal integration abstract')
      .field('language', 'it')
      .field('licenseId', '')
      .field('coSupervisors', '{invalid-json')
      .field('keywords', '{invalid-json')
      .field('sdgs', '{invalid-json')
      .attach('thesisFile', VALID_PDFA_CONTENT, {
        filename: 'minimal-request-thesis.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: TEMP_ONGOING_THESIS_ID,
      title: 'Minimal integration title',
      titleEng: null,
      abstract: 'Minimal integration abstract',
      abstractEng: null,
      thesisSummaryPath: null,
      additionalZipPath: null,
      licenseId: null,
      embargo: null,
      status: 'conclusion_requested',
    });
    expect(response.body.supervisorsAndCoSupervisors).toEqual([
      expect.objectContaining({ teacherId: 3019, isSupervisor: true }),
    ]);
    expect(response.body.sustainableDevelopmentGoals).toEqual([]);
    expect(response.body.keywords).toEqual([]);
  });

  test('Should reject a conclusion request when the uploaded thesis is too short to be a PDF', async () => {
    await seedOngoingTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-conclusion')
      .field('title', 'Short file title')
      .field('abstract', 'Short file abstract')
      .attach('thesisFile', Buffer.from('1234'), {
        filename: 'too-short.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Thesis file must include PDF/A identification metadata' });
  });

  test('Should reject a conclusion request when a live co-supervisor cannot be found', async () => {
    await seedOngoingTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-conclusion')
      .field('title', 'Invalid co-supervisor conclusion')
      .field('abstract', 'Invalid co-supervisor abstract')
      .field('coSupervisors', JSON.stringify([{ id: 999999, firstName: 'Ghost', lastName: 'Teacher' }]))
      .attach('thesisFile', VALID_PDFA_CONTENT, {
        filename: 'invalid-co-supervisor.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'One or more co-supervisors not found' });
  });

  test('Should reject a conclusion request when an embargo motivation cannot be found', async () => {
    await seedOngoingTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-conclusion')
      .field('title', 'Invalid embargo conclusion')
      .field('abstract', 'Invalid embargo abstract')
      .field('embargo', JSON.stringify({ duration: '12_months', motivations: [{ motivationId: 999999 }] }))
      .attach('thesisFile', VALID_PDFA_CONTENT, {
        filename: 'invalid-embargo.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'One or more embargo motivations not found' });
  });

  test('Should replace an existing embargo during conclusion submission', async () => {
    await seedOngoingTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);
    await sequelize.query(
      `
      INSERT INTO thesis_embargo (thesis_id, duration)
      VALUES (:thesisId, '12_months')
      `,
      { replacements: { thesisId: TEMP_ONGOING_THESIS_ID } },
    );
    await sequelize.query(
      `
      INSERT INTO thesis_embargo_motivation (thesis_embargo_id, motivation_id, other_motivation)
      SELECT id, 1, 'old motivation'
      FROM thesis_embargo
      WHERE thesis_id = :thesisId
      `,
      { replacements: { thesisId: String(TEMP_ONGOING_THESIS_ID) } },
    );

    const response = await request(server)
      .post('/api/thesis-conclusion')
      .field('title', 'Replace embargo title')
      .field('abstract', 'Replace embargo abstract')
      .field('embargo', JSON.stringify({ duration: '18_months', motivations: [{ motivationId: 2 }] }))
      .attach('thesisFile', VALID_PDFA_CONTENT, {
        filename: 'replace-embargo.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(200);
    expect(response.body.embargo).toEqual({
      id: expect.any(Number),
      duration: '18_months',
      motivations: [{ motivationId: 2, otherMotivation: null }],
    });

    const [embargoRows] = await sequelize.query(
      `
      SELECT duration
      FROM thesis_embargo
      WHERE thesis_id = :thesisId
      `,
      { replacements: { thesisId: String(TEMP_ONGOING_THESIS_ID) } },
    );
    expect(embargoRows).toEqual([{ duration: '18_months' }]);
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

  test('Should reject final thesis upload when thesis file is missing', async () => {
    const response = await request(server).post('/api/thesis-conclusion/upload-final-thesis');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Missing thesis file' });
  });

  test('Should reject non-PDF final thesis upload', async () => {
    const response = await request(server)
      .post('/api/thesis-conclusion/upload-final-thesis')
      .attach('thesisFile', Buffer.from('plain-text'), {
        filename: 'final file?.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('File must be a PDF file');
  });

  test('Should return 401 when uploading the final thesis without a logged student', async () => {
    await sequelize.query('DELETE FROM logged_student');

    const response = await request(server)
      .post('/api/thesis-conclusion/upload-final-thesis')
      .attach('thesisFile', VALID_PDFA_CONTENT, {
        filename: 'unauthorized-final.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  test('Should reject final thesis upload when additionalZip is not a ZIP file', async () => {
    const response = await request(server)
      .post('/api/thesis-conclusion/upload-final-thesis')
      .attach('thesisFile', VALID_PDFA_CONTENT, {
        filename: 'final-valid.pdf',
        contentType: 'application/pdf',
      })
      .attach('additionalZip', Buffer.from('not-a-zip'), {
        filename: 'invalid-additional.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'additionalZip must be a ZIP file' });
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

  test('Should reject final thesis upload when thesis file does not start with PDF header', async () => {
    const response = await request(server)
      .post('/api/thesis-conclusion/upload-final-thesis')
      .attach('thesisFile', Buffer.from('not-a-pdf'), {
        filename: 'final-no-header.pdf',
        contentType: 'application/pdf',
      })
      .attach('thesisSummary', VALID_PDFA_CONTENT, {
        filename: 'summary-valid.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Thesis file must include PDF/A identification metadata' });
  });

  test('Should return 404 when final thesis upload cannot find a thesis for the logged student', async () => {
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-conclusion/upload-final-thesis')
      .attach('thesisFile', VALID_PDFA_CONTENT, {
        filename: 'missing-thesis.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Thesis not found' });
  });

  test('Should return 400 when final thesis upload is attempted for a thesis not in final exam state', async () => {
    await seedOngoingTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-conclusion/upload-final-thesis')
      .attach('thesisFile', VALID_PDFA_CONTENT, {
        filename: 'ongoing-thesis.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Thesis is not in a final exam state' });
  });

  test('Should reject final thesis upload when summary file is not PDF/A', async () => {
    const response = await request(server)
      .post('/api/thesis-conclusion/upload-final-thesis')
      .attach('thesisFile', VALID_PDFA_CONTENT, {
        filename: 'final-valid.pdf',
        contentType: 'application/pdf',
      })
      .attach('thesisSummary', Buffer.from('%PDF-1.4\nsummary-without-pdfa'), {
        filename: 'summary-invalid.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Thesis file must include PDF/A identification metadata' });
  });

  test('Should return the next session deadlines after a rejected final upload', async () => {
    await seedOngoingTempThesis();
    await seedDeadlineSessions();
    await setLoggedStudent(TEMP_STUDENT_ID);
    await sequelize.query(`
      INSERT INTO thesis_application_status_history (
        thesis_application_id, old_status, new_status, change_date
      ) VALUES (
        ${TEMP_ONGOING_APPLICATION_ID}, 'final_thesis', 'ongoing', NOW()
      )
    `);

    const response = await request(server).get('/api/thesis-conclusion/deadlines');

    expect(response.status).toBe(200);
    expect(response.body.graduationSession).toEqual({
      id: TEMP_SECOND_SESSION_ID,
      sessionName: 'Seconda sessione integrazione',
      sessionNameEn: 'Second integration session',
    });
    expect(response.body.deadlines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          graduationSessionId: TEMP_SECOND_SESSION_ID,
          deadlineType: 'final_exam_registration',
        }),
        expect.objectContaining({
          graduationSessionId: TEMP_SECOND_SESSION_ID,
          deadlineType: 'conclusion_request',
        }),
      ]),
    );
  });

  test('Should keep the first available session when there is no later session to force', async () => {
    await seedOngoingTempThesis();
    await seedSingleDeadlineSession();
    await setLoggedStudent(TEMP_STUDENT_ID);
    await sequelize.query(`
      INSERT INTO thesis_application_status_history (
        thesis_application_id, old_status, new_status, change_date
      ) VALUES (
        ${TEMP_ONGOING_APPLICATION_ID}, 'final_thesis', 'ongoing', NOW()
      )
    `);

    const response = await request(server).get('/api/thesis-conclusion/deadlines');

    expect(response.status).toBe(200);
    expect(response.body.graduationSession).toEqual({
      id: TEMP_FIRST_SESSION_ID,
      sessionName: 'Prima sessione integrazione',
      sessionNameEn: 'First integration session',
    });
    expect(response.body.deadlines).toEqual([
      expect.objectContaining({
        graduationSessionId: TEMP_FIRST_SESSION_ID,
        deadlineType: 'final_exam_registration',
      }),
    ]);
  });

  test('Should upload only the final thesis file when summary is not required', async () => {
    await seedFinalExamTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-conclusion/upload-final-thesis')
      .attach('thesisFile', VALID_PDFA_CONTENT, {
        filename: 'minimal-final-thesis.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Final thesis uploaded successfully' });

    const [rows] = await sequelize.query(
      `
      SELECT status, thesis_file_path, thesis_summary_path, additional_zip_path
      FROM thesis
      WHERE id = :thesisId
      `,
      { replacements: { thesisId: TEMP_FINAL_THESIS_ID } },
    );
    expect(rows).toEqual([
      {
        status: 'final_thesis',
        thesis_file_path: `uploads/final_thesis/${TEMP_STUDENT_ID}/final_thesis_${TEMP_STUDENT_ID}.pdf`,
        thesis_summary_path: null,
        additional_zip_path: null,
      },
    ]);
  });

  test('Should upload the final thesis successfully for a thesis in final exam state', async () => {
    await seedFinalExamTempThesis();
    await setLoggedStudent(TEMP_STUDENT_ID);

    const response = await request(server)
      .post('/api/thesis-conclusion/upload-final-thesis')
      .attach('thesisFile', VALID_PDFA_CONTENT, {
        filename: 'final-thesis.pdf',
        contentType: 'application/pdf',
      })
      .attach('thesisSummary', VALID_PDFA_CONTENT, {
        filename: 'final-summary.pdf',
        contentType: 'application/pdf',
      })
      .attach('additionalZip', Buffer.from('final-zip-content'), {
        filename: 'final-additional.zip',
        contentType: 'application/x-zip-compressed',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Final thesis uploaded successfully' });

    const [rows] = await sequelize.query(`
      SELECT status, thesis_file_path, thesis_summary_path, additional_zip_path
      FROM thesis
      WHERE id = ${TEMP_FINAL_THESIS_ID}
    `);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: 'final_thesis',
      thesis_file_path: `uploads/final_thesis/${TEMP_STUDENT_ID}/final_thesis_${TEMP_STUDENT_ID}.pdf`,
      thesis_summary_path: `uploads/final_thesis/${TEMP_STUDENT_ID}/final_summary_${TEMP_STUDENT_ID}.pdf`,
      additional_zip_path: `uploads/final_thesis/${TEMP_STUDENT_ID}/final_additional_${TEMP_STUDENT_ID}.zip`,
    });

    const [historyRows] = await sequelize.query(`
      SELECT old_status, new_status
      FROM thesis_application_status_history
      WHERE thesis_application_id = ${TEMP_FINAL_APPLICATION_ID}
    `);
    expect(historyRows).toEqual([{ old_status: 'final_exam', new_status: 'final_thesis' }]);
  });
});
