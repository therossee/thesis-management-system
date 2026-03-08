/// <reference types="cypress" />

const LOGGED_STUDENT = {
  id: '314796',
  firstName: 'Daniele',
  lastName: 'De Rossi',
  profilePictureUrl: 'https://example.com/student.png',
  degreeId: '32-2',
};

const ALL_STUDENTS = [
  LOGGED_STUDENT,
  {
    id: '320213',
    firstName: 'Luca',
    lastName: 'Barbato',
    profilePictureUrl: 'https://example.com/student2.png',
    degreeId: '81-5',
  },
];

const TEACHERS = [
  {
    id: 38485,
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'mario.rossi@polito.it',
    role: 'Professore Associato',
    facilityShortName: 'DAUIN',
  },
  {
    id: 3019,
    firstName: 'Giulia',
    lastName: 'Bianchi',
    email: 'giulia.bianchi@polito.it',
    role: 'Professore Associato',
    facilityShortName: 'DAUIN',
  },
];

const COMPANIES = [
  { id: 1, corporateName: 'Reply S.p.A.' },
  { id: 2, corporateName: 'Stellantis N.V.' },
];

const DEADLINES = {
  graduationSession: {
    id: 1,
    sessionName: 'Marzo/Aprile 2026',
    sessionNameEn: 'March/April 2026',
  },
  deadlines: [
    {
      deadlineType: 'thesis_request',
      deadlineDate: '2026-03-06T23:59:59',
      graduationSessionId: 1,
    },
  ],
};

const PENDING_APPLICATION = {
  id: 200,
  topic: 'Richiesta tesi pending',
  status: 'pending',
  supervisor: TEACHERS[0],
  coSupervisors: [TEACHERS[1]],
  submissionDate: '2026-01-10T09:00:00',
};

const REJECTED_APPLICATION = {
  id: 201,
  topic: 'Richiesta tesi rejected',
  status: 'rejected',
  supervisor: TEACHERS[0],
  coSupervisors: [TEACHERS[1]],
  submissionDate: '2026-01-10T09:00:00',
};

const CANCELLED_APPLICATION = {
  id: 202,
  topic: 'Richiesta tesi cancelled',
  status: 'cancelled',
  supervisor: TEACHERS[0],
  coSupervisors: [TEACHERS[1]],
  submissionDate: '2026-01-10T09:00:00',
};

const CANCEL_APPROVED_THESIS = {
  id: 701,
  topic: 'Tesi annullata',
  status: 'cancel_approved',
  supervisor: TEACHERS[0],
  coSupervisors: [TEACHERS[1]],
  thesisConclusionRequestDate: null,
  thesisConclusionConfirmationDate: null,
  applicationStatusHistory: [
    {
      oldStatus: null,
      newStatus: 'pending',
      changeDate: '2025-10-01T08:00:00',
    },
    {
      oldStatus: 'pending',
      newStatus: 'approved',
      changeDate: '2025-10-05T11:00:00',
    },
    {
      oldStatus: 'approved',
      newStatus: 'ongoing',
      changeDate: '2025-10-07T09:00:00',
    },
    {
      oldStatus: 'ongoing',
      newStatus: 'cancel_requested',
      changeDate: '2026-01-02T10:00:00',
    },
    {
      oldStatus: 'cancel_requested',
      newStatus: 'cancel_approved',
      changeDate: '2026-01-10T15:00:00',
    },
  ],
};

const EMPTY_200_RESPONSE = {
  statusCode: 200,
  body: null,
};

const setStableUiPreferences = win => {
  win.localStorage.setItem('language', 'it');
  win.localStorage.setItem('theme', 'light');
};

const openThesisRequestModal = () => {
  const requestButtonMatcher = /Nuova Richiesta Tesi|application form/i;
  cy.contains('button', requestButtonMatcher, { timeout: 10000 }).should('be.visible');
  cy.contains('button', requestButtonMatcher, { timeout: 10000 }).click({ force: true });
  cy.get('.modal.show')
    .contains(/Richiesta Tesi|Thesis request/i)
    .should('be.visible');
};

const openSelectControlByLabel = labelRegex => {
  cy.get('.modal.show').contains('label', labelRegex).closest('.mb-3').find('.select__control').click({ force: true });
};

const selectSupervisor = label => {
  openSelectControlByLabel(/Relatore|Supervisor/i);
  cy.get('.select__menu').contains(label).click({ force: true });
};

const fillMinimalRequest = topic => {
  cy.get('#thesisTopic').clear();
  cy.get('#thesisTopic').type(topic);
  selectSupervisor('Rossi Mario');
};

const submitRequestFromModal = () => {
  cy.get('.modal.show')
    .contains('button', /Invia richiesta|Submit request/i)
    .click();
  cy.get('.modal.show')
    .last()
    .contains('button', /Si, invia|Yes, send/i)
    .click();
};

const stubCommonShell = () => {
  cy.intercept('GET', '**/api/students', ALL_STUDENTS).as('getStudents');
  cy.intercept('GET', '**/api/students/logged-student', LOGGED_STUDENT).as('getLoggedStudent');
  cy.intercept('GET', '**/api/thesis-conclusion/deadlines*', DEADLINES).as('getDeadlines');
  cy.intercept('GET', '**/api/thesis-applications/eligibility*', { eligible: true }).as('getEligibility');
  cy.intercept('GET', '**/api/thesis-proposals/teachers*', TEACHERS).as('getTeachers');
  cy.intercept('GET', '**/api/companies', COMPANIES).as('getCompanies');
};

const visitTesiPage = () => {
  cy.visit('/carriera/tesi', { onBeforeLoad: setStableUiPreferences });
  cy.wait(['@getStudents', '@getLoggedStudent', '@getLastApplication', '@getDeadlines', '@getEligibility']);
};

describe('Thesis request flows', () => {
  it('submits a custom thesis request successfully from no-application state', () => {
    stubCommonShell();
    let currentApplication = null;
    cy.intercept('GET', '**/api/thesis-applications', req => {
      req.reply({ statusCode: 200, body: currentApplication });
    }).as('getLastApplication');
    cy.intercept('GET', '**/api/thesis', EMPTY_200_RESPONSE).as('getThesis');
    cy.intercept('POST', '**/api/thesis-applications', req => {
      currentApplication = PENDING_APPLICATION;
      req.reply({ statusCode: 201, body: { id: 900 } });
    }).as('createThesisApplication');

    visitTesiPage();
    cy.wait('@getThesis');
    cy.wait(['@getTeachers', '@getCompanies']);

    openThesisRequestModal();
    fillMinimalRequest('Argomento tesi per test e2e');

    openSelectControlByLabel(/Azienda|Company/i);
    cy.get('.select__menu').contains('Reply S.p.A.').click({ force: true });

    submitRequestFromModal();

    cy.wait('@createThesisApplication')
      .its('request.body')
      .should(body => {
        expect(body.topic).to.contain('Argomento tesi per test e2e');
        expect(body.supervisor.id).to.eq(38485);
      });

    cy.wait('@getLastApplication');
    cy.contains('button', /Ritira candidatura|Cancel application/i).should('be.visible');
    cy.contains(/Richiesta inviata con successo|Request submitted successfully/i).should('be.visible');
  });

  it('shows validation errors and reset behavior in thesis request modal', () => {
    stubCommonShell();
    cy.intercept('GET', '**/api/thesis-applications', EMPTY_200_RESPONSE).as('getLastApplication');
    cy.intercept('GET', '**/api/thesis', EMPTY_200_RESPONSE).as('getThesis');
    cy.intercept('POST', '**/api/thesis-applications', { statusCode: 201, body: { id: 901 } }).as(
      'createThesisApplication',
    );

    visitTesiPage();
    cy.wait('@getThesis');
    cy.wait(['@getTeachers', '@getCompanies']);

    openThesisRequestModal();
    cy.get('.modal.show')
      .contains('button', /Invia richiesta|Submit request/i)
      .click();
    cy.contains(/argomento della tesi è obbligatorio|topic is required/i).should('be.visible');
    cy.contains(/relatore è obbligatorio|supervisor is required/i).should('be.visible');

    fillMinimalRequest('Argomento da resettare');
    cy.get('.modal.show').contains('button', /Reset/i).click();
    cy.get('#thesisTopic').should('have.value', '');
  });

  it('shows error toast when custom thesis request submission fails', () => {
    stubCommonShell();
    cy.intercept('GET', '**/api/thesis-applications', EMPTY_200_RESPONSE).as('getLastApplication');
    cy.intercept('GET', '**/api/thesis', EMPTY_200_RESPONSE).as('getThesis');
    cy.intercept('POST', '**/api/thesis-applications', {
      statusCode: 500,
      body: { error: 'submission failed' },
    }).as('createThesisApplication');

    visitTesiPage();
    cy.wait('@getThesis');
    cy.wait(['@getTeachers', '@getCompanies']);

    openThesisRequestModal();
    fillMinimalRequest('Argomento per errore submit');
    submitRequestFromModal();

    cy.wait('@createThesisApplication').its('response.statusCode').should('eq', 500);
    cy.contains(/Errore durante l'invio della richiesta|Error while submitting the request/i).should('be.visible');
  });

  it('cancels pending thesis application successfully', () => {
    stubCommonShell();
    let currentApplication = PENDING_APPLICATION;
    cy.intercept('GET', '**/api/thesis-applications', req => {
      req.reply({ statusCode: 200, body: currentApplication });
    }).as('getLastApplication');
    cy.intercept('GET', '**/api/thesis-applications/status-history*', []).as('getApplicationHistory');
    cy.intercept('GET', '**/api/thesis', EMPTY_200_RESPONSE).as('getThesis');
    cy.intercept('POST', '**/api/thesis-applications/cancel', req => {
      currentApplication = CANCELLED_APPLICATION;
      req.reply({ statusCode: 200, body: { ok: true } });
    }).as('cancelApplication');

    visitTesiPage();
    cy.wait('@getApplicationHistory');

    cy.contains('button', /Ritira candidatura|Cancel application/i)
      .should('be.visible')
      .click();
    cy.get('.modal.show')
      .last()
      .contains('button', /S[iì], ritira|Yes, cancel/i)
      .click({ force: true });

    cy.wait('@cancelApplication')
      .its('request.body')
      .should(body => {
        expect(body.id).to.eq(200);
      });

    cy.wait('@getLastApplication');
    cy.contains(/Candidatura ritirata con successo|Application cancelled successfully/i).should('be.visible');
  });

  it('shows error toast when pending thesis application cancellation fails', () => {
    stubCommonShell();
    cy.intercept('GET', '**/api/thesis-applications', PENDING_APPLICATION).as('getLastApplication');
    cy.intercept('GET', '**/api/thesis-applications/status-history*', []).as('getApplicationHistory');
    cy.intercept('GET', '**/api/thesis', EMPTY_200_RESPONSE).as('getThesis');
    cy.intercept('POST', '**/api/thesis-applications/cancel', {
      statusCode: 500,
      body: { error: 'cancel failed' },
    }).as('cancelApplication');

    visitTesiPage();
    cy.wait('@getApplicationHistory');

    cy.contains('button', /Ritira candidatura|Cancel application/i)
      .should('be.visible')
      .click();
    cy.get('.modal.show')
      .last()
      .contains('button', /S[iì], ritira|Yes, cancel/i)
      .click({ force: true });

    cy.wait('@cancelApplication').its('response.statusCode').should('eq', 500);
    cy.contains(/Errore durante il ritiro della candidatura|Error canceling application/i).should('be.visible');
  });

  it('renders next steps card for rejected and cancelled applications', () => {
    stubCommonShell();
    let call = 0;
    cy.intercept('GET', '**/api/thesis-applications', req => {
      call += 1;
      req.reply(call === 1 ? REJECTED_APPLICATION : CANCELLED_APPLICATION);
    }).as('getLastApplication');
    cy.intercept('GET', '**/api/thesis-applications/status-history*', []).as('getApplicationHistory');
    cy.intercept('GET', '**/api/thesis', EMPTY_200_RESPONSE).as('getThesis');
    cy.intercept('POST', '**/api/thesis-applications', { statusCode: 201, body: { id: 902 } }).as(
      'createThesisApplication',
    );

    visitTesiPage();
    cy.wait('@getApplicationHistory');
    cy.contains(/una nuova richiesta di tesi personalizzata./i).should('be.visible');
    cy.contains('button', /Nuova Richiesta Tesi|application form/i)
      .should('be.visible')
      .click();
    cy.get('.modal.show')
      .contains(/Richiesta Tesi|Thesis request/i)
      .should('be.visible');
    cy.get('.modal.show').find('button.btn-close').click({ force: true });

    cy.reload();
    cy.wait(['@getStudents', '@getLoggedStudent', '@getLastApplication', '@getDeadlines', '@getEligibility']);
    cy.wait('@getApplicationHistory');
    cy.contains(/Hai annullato la tua candidatura/i).should('be.visible');
  });

  it('renders cancel-approved thesis next steps card and opens request modal', () => {
    stubCommonShell();
    cy.intercept('GET', '**/api/thesis-applications', {
      ...PENDING_APPLICATION,
      status: 'approved',
    }).as('getLastApplication');
    cy.intercept('GET', '**/api/thesis', CANCEL_APPROVED_THESIS).as('getThesis');
    cy.intercept('GET', '**/api/students/required-summary', { requiredSummary: false }).as('getRequiredSummary');
    cy.intercept('POST', '**/api/thesis-applications', { statusCode: 201, body: { id: 903 } }).as(
      'createThesisApplication',
    );

    visitTesiPage();
    cy.wait(['@getThesis', '@getRequiredSummary']);
    cy.wait(['@getTeachers', '@getCompanies']);

    cy.contains(/La tua tesi è stata annullata/i).should('be.visible');
    cy.contains('button', /Nuova Richiesta Tesi|application form/i).click();
    cy.get('.modal.show')
      .contains(/Richiesta Tesi|Thesis request/i)
      .should('be.visible');
  });
});
