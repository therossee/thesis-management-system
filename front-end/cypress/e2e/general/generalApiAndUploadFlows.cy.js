/// <reference types="cypress" />

const LOGGED_STUDENT = {
  id: '314796',
  firstName: 'Daniele',
  lastName: 'De Rossi',
  profilePictureUrl: 'https://example.com/student.png',
  degreeId: '32-2',
};

const SECOND_STUDENT = {
  id: '320213',
  firstName: 'Luca',
  lastName: 'Barbato',
  profilePictureUrl: 'https://example.com/student2.png',
  degreeId: '81-5',
};

const ALL_STUDENTS = [LOGGED_STUDENT, SECOND_STUDENT];

const TEACHERS = [
  {
    id: 38485,
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'mario.rossi@polito.it',
  },
  {
    id: 3019,
    firstName: 'Giulia',
    lastName: 'Bianchi',
    email: 'giulia.bianchi@polito.it',
  },
];

const DEADLINES = {
  graduationSession: {
    id: 1,
    sessionName: 'Marzo/Aprile 2026',
    sessionNameEn: 'March/April 2026',
  },
  deadlines: [{ deadlineType: 'conclusion_request', deadlineDate: '2026-06-18T23:59:59' }],
};

const BASE_THESIS = {
  id: 701,
  topic: 'Studio su sistemi intelligenti',
  title: 'Titolo tesi',
  abstract: 'Abstract tesi',
  status: 'final_exam',
  supervisor: TEACHERS[0],
  coSupervisors: [TEACHERS[1]],
  company: null,
  thesisFilePath: '/uploads/final/thesis-file.pdf',
  thesisSummaryPath: '/uploads/final/summary-file.pdf',
  additionalZipPath: '/uploads/final/additional-file.zip',
  thesisConclusionRequestDate: null,
  thesisConclusionConfirmationDate: null,
  applicationStatusHistory: [
    { oldStatus: null, newStatus: 'pending', changeDate: '2025-10-01T08:00:00' },
    { oldStatus: 'pending', newStatus: 'approved', changeDate: '2025-10-05T11:00:00' },
    { oldStatus: 'approved', newStatus: 'ongoing', changeDate: '2025-10-07T09:00:00' },
  ],
};

const BASE_APPLICATION = {
  id: 51,
  topic: 'Studio su sistemi intelligenti',
  status: 'approved',
  supervisor: TEACHERS[0],
  coSupervisors: [TEACHERS[1]],
  submissionDate: '2025-10-01T08:00:00',
};

const setStableUiPreferences = win => {
  win.localStorage.setItem('language', 'it');
  win.localStorage.setItem('theme', 'light');
};

const attachPdf = (selector, fileName) => {
  cy.get(selector).selectFile(
    {
      contents: Cypress.Buffer.from('%PDF-1.4 fake-pdf-content'),
      fileName,
      mimeType: 'application/pdf',
    },
    { force: true },
  );
};

const attachZip = (selector, fileName) => {
  cy.get(selector).selectFile(
    {
      contents: Cypress.Buffer.from('zip-content'),
      fileName,
      mimeType: 'application/zip',
    },
    { force: true },
  );
};

describe('General API and upload flows', () => {
  it('covers API bootstrap error branches and keeps app usable', () => {
    cy.intercept('GET', '**/api/students', { statusCode: 500, body: { error: 'students failed' } }).as(
      'getStudentsErr',
    );
    cy.intercept('GET', '**/api/students/logged-student*', {
      statusCode: 500,
      body: { error: 'logged student failed' },
    }).as('getLoggedStudentErr');

    cy.visit('/', { onBeforeLoad: setStableUiPreferences });
    cy.wait(['@getStudentsErr', '@getLoggedStudentErr']);

    cy.contains(/Portale della Didattica|Didactic Portal/i).should('be.visible');
    cy.contains(/Home/i).should('be.visible');
  });

  it('covers FinalThesisUpload remove-file and close-confirmation branches', () => {
    cy.intercept('GET', '**/api/students', ALL_STUDENTS).as('getStudents');
    cy.intercept('GET', '**/api/students/logged-student*', LOGGED_STUDENT).as('getLoggedStudent');
    cy.intercept('GET', '**/api/thesis-applications', BASE_APPLICATION).as('getLastApplication');
    cy.intercept('GET', '**/api/thesis', { ...BASE_THESIS, status: 'final_exam' }).as('getThesis');
    cy.intercept('GET', '**/api/thesis-applications/eligibility*', { eligible: true }).as('getEligibility');
    cy.intercept('GET', '**/api/thesis-conclusion/deadlines*', DEADLINES).as('getDeadlines');
    cy.intercept('GET', '**/api/students/required-summary*', { requiredSummary: true }).as('getRequiredSummary');
    cy.intercept('POST', '**/api/thesis-conclusion/upload-final-thesis', {
      statusCode: 201,
      body: { ok: true },
    }).as('uploadFinalThesis');

    cy.visit('/carriera/tesi', { onBeforeLoad: setStableUiPreferences });
    cy.wait([
      '@getStudents',
      '@getLoggedStudent',
      '@getLastApplication',
      '@getThesis',
      '@getEligibility',
      '@getDeadlines',
      '@getRequiredSummary',
    ]);

    cy.contains('button', /Carica Tesi Definitiva|Upload Final Thesis/i).click();
    cy.get('.final-thesis-upload-modal').should('be.visible');

    attachPdf('#final-thesis-summary-pdfa', 'riassunto-finale.pdf');
    attachPdf('#final-thesis-pdfa', 'tesi-finale.pdf');
    attachZip('#final-thesis-additional-zip', 'materiale.zip');

    cy.get('#final-thesis-summary-pdfa')
      .closest('.cr-upload-card')
      .find('button[aria-label="Rimuovi file"], button[aria-label="Remove file"]')
      .click({ force: true });
    attachPdf('#final-thesis-summary-pdfa', 'riassunto-finale.pdf');

    cy.get('#final-thesis-pdfa')
      .closest('.cr-upload-card')
      .find('button[aria-label="Rimuovi file"], button[aria-label="Remove file"]')
      .click({ force: true });
    attachPdf('#final-thesis-pdfa', 'tesi-finale.pdf');

    cy.get('#final-thesis-additional-zip')
      .closest('.cr-upload-card')
      .find('button[aria-label="Rimuovi file"], button[aria-label="Remove file"]')
      .click({ force: true });
    attachZip('#final-thesis-additional-zip', 'materiale.zip');

    cy.get('.final-thesis-upload-modal')
      .contains('button', /Carica documento|Upload document/i)
      .should('be.enabled')
      .click();

    cy.get('.modal.show')
      .last()
      .contains('button', /Annulla|Cancel/i)
      .click({ force: true });
    cy.get('.final-thesis-upload-modal').should('be.visible');
    cy.get('.modal.show').should('have.length', 1);

    cy.get('.final-thesis-upload-modal')
      .contains('button', /Carica documento|Upload document/i)
      .click();
    cy.get('.modal.show')
      .last()
      .contains('button', /Si, carica la tesi|Yes, upload the thesis/i)
      .click({ force: true });
    cy.wait('@uploadFinalThesis').its('response.statusCode').should('eq', 201);
  });

  it('covers navbar logged-student switch success path', () => {
    let currentLoggedStudent = LOGGED_STUDENT;
    cy.intercept('GET', '**/api/students', ALL_STUDENTS).as('getStudents');
    cy.intercept('GET', '**/api/students/logged-student*', req => {
      req.reply(currentLoggedStudent);
    }).as('getLoggedStudent');
    cy.intercept('PUT', '**/api/students/logged-student', req => {
      currentLoggedStudent = SECOND_STUDENT;
      req.reply({ statusCode: 200, body: { ok: true } });
    }).as('updateLoggedStudent');

    cy.visit('/', { onBeforeLoad: setStableUiPreferences });
    cy.wait(['@getStudents', '@getLoggedStudent']);

    cy.get('#dropdown-icon').click();
    cy.contains('.dropdown-menu.show .dropdown-item', /Luca Barbato/i).click({ force: true });
    cy.wait('@updateLoggedStudent').its('request.body').should('deep.equal', { student_id: SECOND_STUDENT.id });
    cy.wait('@getLoggedStudent');
  });
});
