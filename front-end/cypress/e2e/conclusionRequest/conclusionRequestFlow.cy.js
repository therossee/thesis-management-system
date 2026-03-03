/// <reference types="cypress" />

const student = {
  id: 1001,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada.lovelace@polito.it',
  role: 'student',
};

const teachers = [
  { id: 10, firstName: 'Mario', lastName: 'Rossi', email: 'mario.rossi@polito.it' },
  { id: 11, firstName: 'Giulia', lastName: 'Bianchi', email: 'giulia.bianchi@polito.it' },
];

const licenses = [
  {
    id: 6,
    name: 'CC BY-NC-ND',
    name_en: 'CC BY-NC-ND',
    description: '<p>Licenza consigliata</p>',
    description_en: '<p>Recommended license</p>',
  },
];

const sdgs = [
  { id: 1, goal: 'No Poverty' },
  { id: 2, goal: 'Zero Hunger' },
  { id: 3, goal: 'Good Health and Well-being' },
];

const embargoMotivations = [
  { id: 1, motivation: 'Segreto industriale', motivation_en: 'Industrial secret' },
  { id: 7, motivation: 'Altro', motivation_en: 'Other' },
];

const keywords = [
  { id: 100, keyword: 'Machine Learning' },
  { id: 101, keyword: 'Computer Vision' },
];

const buildThesis = status => ({
  id: 9001,
  status,
  topic: 'Analisi predittiva per sistemi embedded',
  supervisor: teachers[0],
  coSupervisors: [teachers[1]],
});

const buildDraftData = ({ authorization = 'authorize', withSummary = false } = {}) => {
  const draft = {
    title: 'Titolo tesi di test',
    titleEng: 'Test thesis title',
    abstract: 'Abstract in italiano per test automatici.',
    abstractEng: 'English abstract for automated tests.',
    language: 'it',
    keywords: [{ id: 100, keyword: 'Machine Learning' }],
    sdgs: [
      { goalId: 1, level: 'primary' },
      { goalId: 2, level: 'secondary' },
      { goalId: 3, level: 'secondary' },
    ],
    coSupervisors: [teachers[1]],
    thesisDraftDate: '2026-03-03',
    thesisFilePath: '/draft/thesis.pdf',
  };

  if (withSummary) {
    draft.thesisSummaryPath = '/draft/summary.pdf';
  }

  if (authorization === 'deny') {
    draft.embargo = {
      duration: '12_months',
      motivations: [{ motivationId: 1 }],
    };
  } else {
    draft.licenseId = 6;
  }

  return draft;
};

const stubConclusionBootstrap = ({ thesisStatus = 'ongoing', draftData = null, requiredSummary = false } = {}) => {
  cy.intercept('GET', '**/api/students', { statusCode: 200, body: [student] }).as('getStudents');
  cy.intercept('GET', '**/api/students/logged-student', { statusCode: 200, body: student }).as('getLoggedStudent');

  cy.intercept('GET', '**/api/thesis', {
    statusCode: 200,
    body: buildThesis(thesisStatus),
  }).as('getThesis');
  cy.intercept('GET', '**/api/thesis-proposals/teachers*', { statusCode: 200, body: teachers }).as('getTeachers');
  cy.intercept('GET', '**/api/thesis-conclusion/licenses*', { statusCode: 200, body: licenses }).as('getLicenses');
  cy.intercept('GET', '**/api/thesis-conclusion/sdgs*', { statusCode: 200, body: sdgs }).as('getSdgs');
  cy.intercept('GET', '**/api/thesis-conclusion/embargo-motivations*', {
    statusCode: 200,
    body: embargoMotivations,
  }).as('getEmbargoMotivations');
  cy.intercept('GET', '**/api/thesis-proposals/keywords*', { statusCode: 200, body: keywords }).as('getKeywords');
  cy.intercept('GET', '**/api/students/required-summary*', {
    statusCode: 200,
    body: { requiredSummary },
  }).as('getRequiredSummary');

  if (draftData) {
    cy.intercept('GET', '**/api/thesis-conclusion/draft', { statusCode: 200, body: draftData }).as('getDraft');
  } else {
    cy.intercept('GET', '**/api/thesis-conclusion/draft', { statusCode: 404, body: {} }).as('getDraft');
  }

  cy.intercept('POST', '**/api/thesis-conclusion/draft', { statusCode: 200, body: { ok: true } }).as('saveDraft');
};

const stubDraftFileDownloads = ({ includeSummary = false } = {}) => {
  cy.intercept('GET', '**/api/thesis/9001/thesis', {
    statusCode: 200,
    headers: { 'content-type': 'application/pdf' },
    body: '%PDF-1.4 fake thesis',
  }).as('downloadDraftThesis');

  if (includeSummary) {
    cy.intercept('GET', '**/api/thesis/9001/summary', {
      statusCode: 200,
      headers: { 'content-type': 'application/pdf' },
      body: '%PDF-1.4 fake summary',
    }).as('downloadDraftSummary');
  }
};

const goToDeclarationsStep = () => {
  cy.contains('button', 'Avanti').should('be.enabled').click();
  cy.contains('button', 'Avanti').should('be.enabled').click();
  cy.contains('button', 'Avanti').should('be.enabled').click();
};

const acceptDeclarations = authorization => {
  const declarationIds = authorization === 'authorize' ? ['1', '2', '3', '4', '5', '6'] : ['1', '3', '4', '5', '6'];

  declarationIds.forEach(id => {
    cy.get(`#declaration-${id}`).check({ force: true });
  });
};

describe('Conclusion request flow', () => {
  it('shows not eligible state when thesis is not ongoing', () => {
    stubConclusionBootstrap({ thesisStatus: 'done' });

    cy.visit('/carriera/tesi/conclusione_tesi');
    cy.wait('@getThesis');
    cy.contains('Non idoneo').should('be.visible');
    cy.contains('Torna alla pagina della tesi').should('be.visible');
  });

  it('submits successfully on authorize flow with preloaded draft data', () => {
    stubConclusionBootstrap({
      thesisStatus: 'ongoing',
      draftData: buildDraftData({ authorization: 'authorize' }),
      requiredSummary: false,
    });
    stubDraftFileDownloads();
    cy.intercept('POST', '**/api/thesis-conclusion', { statusCode: 200, body: { id: 12345 } }).as('submitConclusion');

    cy.visit('/carriera/tesi/conclusione_tesi');
    cy.wait(['@getThesis', '@getDraft']);

    goToDeclarationsStep();
    cy.contains('button', 'Avanti').should('be.disabled');
    acceptDeclarations('authorize');
    cy.contains('button', 'Avanti').should('be.enabled').click();

    cy.contains('button', 'Invia richiesta').should('be.enabled').click();
    cy.get('.modal-footer button').last().click();

    cy.wait('@downloadDraftThesis');
    cy.wait('@submitConclusion');
    cy.contains('h3', 'Richiesta inviata con successo!').should('be.visible');
  });

  it('shows error outcome on deny flow when submit API fails', () => {
    stubConclusionBootstrap({
      thesisStatus: 'ongoing',
      draftData: buildDraftData({ authorization: 'deny', withSummary: true }),
      requiredSummary: true,
    });
    stubDraftFileDownloads({ includeSummary: true });
    cy.intercept('POST', '**/api/thesis-conclusion', { statusCode: 500, body: { error: 'Unexpected error' } }).as(
      'submitConclusion',
    );

    cy.visit('/carriera/tesi/conclusione_tesi');
    cy.wait(['@getThesis', '@getDraft']);

    goToDeclarationsStep();
    cy.get('#declaration-2').should('not.exist');
    acceptDeclarations('deny');
    cy.contains('button', 'Avanti').should('be.enabled').click();

    cy.contains('button', 'Invia richiesta').should('be.enabled').click();
    cy.get('.modal-footer button').last().click();

    cy.wait('@downloadDraftThesis');
    cy.wait('@downloadDraftSummary');
    cy.wait('@submitConclusion');
    cy.contains('h3', "Errore durante l'invio della richiesta.").should('be.visible');
  });
});
