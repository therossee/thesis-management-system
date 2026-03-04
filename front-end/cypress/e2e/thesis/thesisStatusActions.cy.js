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
  },
  {
    id: 3019,
    firstName: 'Giulia',
    lastName: 'Bianchi',
    email: 'giulia.bianchi@polito.it',
  },
];

const BASE_APPLICATION = {
  id: 51,
  topic: 'Studio su sistemi intelligenti',
  status: 'approved',
  supervisor: TEACHERS[0],
  coSupervisors: [TEACHERS[1]],
  submissionDate: '2025-10-01T08:00:00',
};

const BASE_THESIS = {
  id: 701,
  topic: 'Studio su sistemi intelligenti',
  title: 'Titolo tesi',
  abstract: 'Abstract tesi',
  status: 'ongoing',
  supervisor: TEACHERS[0],
  coSupervisors: [TEACHERS[1]],
  company: null,
  thesisFilePath: '/uploads/final/thesis-file.pdf',
  thesisSummaryPath: '/uploads/final/summary-file.pdf',
  additionalZipPath: '/uploads/final/additional-file.zip',
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
  ],
};

const DEADLINES = {
  graduationSession: {
    id: 1,
    session_name: 'Marzo/Aprile 2026',
    session_name_en: 'March/April 2026',
  },
  deadlines: [
    {
      deadline_type: 'conclusion_request',
      deadline_date: '2026-06-18T23:59:59',
    },
  ],
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

const stubTesiPageApis = ({ thesisStatus = 'ongoing', requiredSummary = false }) => {
  cy.intercept('GET', '**/api/students', ALL_STUDENTS).as('getStudents');
  cy.intercept('GET', '**/api/students/logged-student', LOGGED_STUDENT).as('getLoggedStudent');

  cy.intercept('GET', '**/api/thesis-applications', BASE_APPLICATION).as('getLastApplication');
  cy.intercept('GET', '**/api/thesis', {
    ...BASE_THESIS,
    status: thesisStatus,
  }).as('getThesis');

  cy.intercept('GET', '**/api/thesis-applications/eligibility*', { eligible: true }).as('getEligibility');
  cy.intercept('GET', '**/api/thesis-conclusion/deadlines*', DEADLINES).as('getDeadlines');
  cy.intercept('GET', '**/api/students/required-summary', { requiredSummary }).as('getRequiredSummary');
};

const stubConclusionBootstrapForNavigation = () => {
  cy.intercept('GET', '**/api/thesis-proposals/teachers*', TEACHERS).as('getTeachers');
  cy.intercept('GET', '**/api/thesis-conclusion/licenses*', [
    {
      id: 6,
      name: 'Attribuzione - Non commerciale - Non opere derivate CC BY-NC-ND',
      name_en: 'Attribution - NonCommercial-NoDerivs CC BY-NC-ND',
      description: 'Descrizione licenza',
      description_en: 'License description',
    },
  ]).as('getLicenses');
  cy.intercept('GET', '**/api/thesis-conclusion/sdgs*', [
    { id: 1, goal: 'No Poverty' },
    { id: 2, goal: 'Zero Hunger' },
    { id: 3, goal: 'Good Health and Well-being' },
  ]).as('getSdgs');
  cy.intercept('GET', '**/api/thesis-conclusion/embargo-motivations*', [
    { id: 1, motivation: 'Motivazione', motivation_en: 'Motivation' },
  ]).as('getEmbargoMotivations');
  cy.intercept('GET', '**/api/thesis-proposals/keywords*', [{ id: 1, keyword: 'AI' }]).as('getKeywords');
  cy.intercept('GET', '**/api/thesis-conclusion/draft', {
    statusCode: 404,
    body: { error: 'Draft not found' },
  }).as('getDraft');
  cy.intercept('POST', '**/api/thesis-conclusion/draft', { statusCode: 201, body: { ok: true } }).as('saveDraft');
  cy.intercept('POST', '**/api/thesis-conclusion', { statusCode: 201, body: { id: 900 } }).as('submitConclusion');
};

const visitTesiPage = () => {
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
};

describe('Thesis status actions', () => {
  it('shows conclusion request CTA in ongoing status and navigates to conclusion page', () => {
    stubTesiPageApis({ thesisStatus: 'ongoing', requiredSummary: false });
    stubConclusionBootstrapForNavigation();
    visitTesiPage();

    cy.contains('button', /Richiedi conclusione|Request conclusion/i)
      .should('be.visible')
      .click();
    cy.url().should('include', '/carriera/tesi/conclusione_tesi');
    cy.wait(['@getTeachers', '@getLicenses', '@getSdgs', '@getEmbargoMotivations', '@getKeywords', '@getDraft']);
    cy.get('#title-original').should('exist');
  });

  it('calls status transition API from conclusion_approved to almalaurea', () => {
    stubTesiPageApis({ thesisStatus: 'conclusion_approved', requiredSummary: false });
    cy.intercept('PUT', '**/api/test/thesis-conclusion', {
      ...BASE_THESIS,
      status: 'almalaurea',
    }).as('updateConclusionStatus');
    visitTesiPage();

    cy.window().then(win => {
      cy.stub(win, 'open').as('windowOpen');
    });

    cy.contains('button', /Compila questionario AlmaLaurea|Fill AlmaLaurea questionnaire/i).click();

    cy.get('@windowOpen').should('have.been.calledOnce');
    cy.wait('@updateConclusionStatus')
      .its('request.body')
      .should('deep.include', { thesisId: 701, conclusionStatus: 'almalaurea' });
  });

  it('calls status transition API from almalaurea to compiled_questionnaire', () => {
    stubTesiPageApis({ thesisStatus: 'almalaurea', requiredSummary: false });
    cy.intercept('PUT', '**/api/test/thesis-conclusion', {
      ...BASE_THESIS,
      status: 'compiled_questionnaire',
    }).as('updateConclusionStatus');
    visitTesiPage();

    cy.window().then(win => {
      cy.stub(win, 'open').as('windowOpen');
    });

    cy.contains('button', /Compila questionario|Fill questionnaire/i).click();

    cy.get('@windowOpen').should('have.been.calledOnce');
    cy.wait('@updateConclusionStatus')
      .its('request.body')
      .should('deep.include', { thesisId: 701, conclusionStatus: 'compiled_questionnaire' });
  });

  it('calls status transition API from compiled_questionnaire to final_exam', () => {
    stubTesiPageApis({ thesisStatus: 'compiled_questionnaire', requiredSummary: false });
    cy.intercept('PUT', '**/api/test/thesis-conclusion', {
      ...BASE_THESIS,
      status: 'final_exam',
    }).as('updateConclusionStatus');
    visitTesiPage();

    cy.window().then(win => {
      cy.stub(win, 'open').as('windowOpen');
    });

    cy.contains('button', /Iscriviti all'esame finale|Register for final exam/i).click();

    cy.get('@windowOpen').should('have.been.calledOnce');
    cy.wait('@updateConclusionStatus')
      .its('request.body')
      .should('deep.include', { thesisId: 701, conclusionStatus: 'final_exam' });
  });

  it('uploads final thesis from final_exam status using modal confirmation flow', () => {
    stubTesiPageApis({ thesisStatus: 'final_exam', requiredSummary: false });
    cy.intercept('POST', '**/api/thesis-conclusion/upload-final-thesis', {
      statusCode: 201,
      body: { ok: true },
    }).as('uploadFinalThesis');
    visitTesiPage();

    cy.contains('button', /Carica Tesi Definitiva|Upload Final Thesis/i)
      .should('be.visible')
      .click();
    cy.get('.final-thesis-upload-modal').should('be.visible');

    attachPdf('#final-thesis-pdfa', 'tesi-finale.pdf');
    cy.get('.final-thesis-upload-modal')
      .contains('button', /Carica documento|Upload document/i)
      .should('be.enabled')
      .click();

    cy.get('.modal.show')
      .last()
      .contains('button', /Si, carica la tesi|Yes, upload the thesis/i)
      .click();

    cy.wait('@uploadFinalThesis').its('response.statusCode').should('eq', 201);
  });

  it('requests thesis cancellation from ongoing status', () => {
    stubTesiPageApis({ thesisStatus: 'ongoing', requiredSummary: false });
    cy.intercept('POST', '**/api/thesis/cancel', { statusCode: 201, body: { ok: true } }).as('cancelThesis');
    visitTesiPage();

    cy.contains('button', /Richiedi annullamento tesi|Request thesis cancellation/i).click();
    cy.get('.modal.show')
      .last()
      .contains('button', /Annulla tesi|Cancel thesis|S[iì]|Yes/i)
      .click({ force: true });

    cy.wait('@cancelThesis').its('response.statusCode').should('eq', 201);
  });

  it('shows error toast when thesis cancellation request fails', () => {
    stubTesiPageApis({ thesisStatus: 'ongoing', requiredSummary: false });
    cy.intercept('POST', '**/api/thesis/cancel', { statusCode: 500, body: { error: 'cancel failed' } }).as(
      'cancelThesis',
    );
    visitTesiPage();

    cy.contains('button', /Richiedi annullamento tesi|Request thesis cancellation/i).click();
    cy.get('.modal.show')
      .last()
      .contains('button', /Annulla tesi|Cancel thesis|S[iì]|Yes/i)
      .click({ force: true });

    cy.wait('@cancelThesis').its('response.statusCode').should('eq', 500);
    cy.contains(
      /Errore durante l'invio della richiesta di annullamento|Error while sending the thesis cancellation request/i,
    ).should('be.visible');
  });

  it('downloads thesis files and shows download error toast when a file fetch fails', () => {
    const longTopic = `${'Tema molto lungo. '.repeat(35)}\n\nDettaglio finale.`;
    const longAbstract = `${'Abstract molto lungo per coprire il branch show more. '.repeat(20)}Fine.`;

    cy.intercept('GET', '**/api/students', ALL_STUDENTS).as('getStudents');
    cy.intercept('GET', '**/api/students/logged-student', LOGGED_STUDENT).as('getLoggedStudent');
    cy.intercept('GET', '**/api/thesis-applications', BASE_APPLICATION).as('getLastApplication');
    cy.intercept('GET', '**/api/thesis', {
      ...BASE_THESIS,
      status: 'conclusion_approved',
      topic: longTopic,
      abstract: longAbstract,
      company: { id: 1, corporateName: 'Reply S.p.A.' },
    }).as('getThesis');
    cy.intercept('GET', '**/api/thesis-applications/eligibility*', { eligible: true }).as('getEligibility');
    cy.intercept('GET', '**/api/thesis-conclusion/deadlines*', DEADLINES).as('getDeadlines');
    cy.intercept('GET', '**/api/students/required-summary', { requiredSummary: true }).as('getRequiredSummary');
    cy.intercept('GET', '**/api/thesis/701/summary', {
      statusCode: 200,
      body: 'summary-content',
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="summary_server_name.pdf"',
      },
    }).as('downloadSummary');
    cy.intercept('GET', '**/api/thesis/701/thesis', {
      statusCode: 200,
      body: 'thesis-content',
      headers: { 'content-type': 'application/pdf' },
    }).as('downloadThesis');
    cy.intercept('GET', '**/api/thesis/701/additional', {
      statusCode: 500,
      body: { error: 'download failed' },
    }).as('downloadAdditional');

    visitTesiPage();

    cy.window().then(win => {
      cy.stub(win.URL, 'createObjectURL').returns('blob:download-url').as('createObjectUrl');
      cy.stub(win.URL, 'revokeObjectURL').as('revokeObjectUrl');
      cy.stub(win.HTMLAnchorElement.prototype, 'click').as('anchorClick');
    });

    cy.contains(/Mostra di più|Show more/i)
      .first()
      .click();
    cy.contains(/Mostra di meno|Show less/i)
      .first()
      .should('be.visible');

    cy.contains('button', /Riepilogo|Summary/i).click();
    cy.wait('@downloadSummary');
    cy.get('@anchorClick').should('have.been.called');

    cy.contains('button', /Tesi in formato PDF\/A|Thesis in PDF\/A format/i).click();
    cy.wait('@downloadThesis');
    cy.get('@createObjectUrl').should('have.been.called');
    cy.get('@revokeObjectUrl').should('have.been.called');

    cy.contains('button', /Allegato aggiuntivo|Additional attachment/i).click();
    cy.wait('@downloadAdditional');
    cy.contains(/Errore durante il download|Download error/i).should('be.visible');
  });

  it('shows placeholders for missing uploaded files when thesis is at conclusion stage', () => {
    cy.intercept('GET', '**/api/students', ALL_STUDENTS).as('getStudents');
    cy.intercept('GET', '**/api/students/logged-student', LOGGED_STUDENT).as('getLoggedStudent');
    cy.intercept('GET', '**/api/thesis-applications', BASE_APPLICATION).as('getLastApplication');
    cy.intercept('GET', '**/api/thesis', {
      ...BASE_THESIS,
      status: 'conclusion_requested',
      topic: 'Tema breve',
      abstract: 'Abstract breve',
      company: null,
      thesisFilePath: null,
      thesisSummaryPath: null,
      additionalZipPath: null,
    }).as('getThesis');
    cy.intercept('GET', '**/api/thesis-applications/eligibility*', { eligible: true }).as('getEligibility');
    cy.intercept('GET', '**/api/thesis-conclusion/deadlines*', DEADLINES).as('getDeadlines');
    cy.intercept('GET', '**/api/students/required-summary', { requiredSummary: true }).as('getRequiredSummary');

    visitTesiPage();

    cy.contains(/Mostra di pi[uù]|Show more/i).should('not.exist');
    cy.contains(/Riepilogo:\s*-|Summary:\s*-/i).should('exist');
    cy.contains(/Tesi in formato PDF\/A:\s*-|Thesis in PDF\/A format:\s*-/i).should('exist');
    cy.contains(/Allegato aggiuntivo:\s*-|Additional attachment:\s*-/i).should('exist');
    cy.contains('button', /Riepilogo|Summary/i).should('not.exist');
    cy.contains('button', /Tesi in formato PDF\/A|Thesis in PDF\/A format/i).should('not.exist');
    cy.contains('button', /Allegato aggiuntivo|Additional attachment/i).should('not.exist');
  });

  it('requires summary file and shows upload failure toast in final thesis modal', () => {
    stubTesiPageApis({ thesisStatus: 'final_exam', requiredSummary: true });
    cy.intercept('POST', '**/api/thesis-conclusion/upload-final-thesis', {
      statusCode: 500,
      body: { error: 'upload failed' },
    }).as('uploadFinalThesis');

    visitTesiPage();

    cy.contains('button', /Carica Tesi Definitiva|Upload Final Thesis/i)
      .should('be.visible')
      .click();
    cy.get('.final-thesis-upload-modal').should('be.visible');

    attachPdf('#final-thesis-pdfa', 'tesi-finale.pdf');
    cy.get('.final-thesis-upload-modal')
      .contains('button', /Carica documento|Upload document/i)
      .should('be.disabled');

    attachPdf('#final-thesis-summary-pdfa', 'riassunto-finale.pdf');
    cy.get('.final-thesis-upload-modal')
      .contains('button', /Carica documento|Upload document/i)
      .should('be.enabled');

    cy.get('.final-thesis-upload-modal').contains('button', /Reset/i).click();
    cy.get('.final-thesis-upload-modal')
      .contains('button', /Carica documento|Upload document/i)
      .should('be.disabled');

    attachPdf('#final-thesis-pdfa', 'tesi-finale.pdf');
    attachPdf('#final-thesis-summary-pdfa', 'riassunto-finale.pdf');
    cy.get('.final-thesis-upload-modal')
      .contains('button', /Carica documento|Upload document/i)
      .click();

    cy.get('.modal.show')
      .last()
      .contains('button', /Si, carica la tesi|Yes, upload the thesis/i)
      .click();

    cy.wait('@uploadFinalThesis').its('response.statusCode').should('eq', 500);
    cy.contains(/Errore durante il caricamento della tesi definitiva|Error uploading the final thesis/i).should(
      'be.visible',
    );
  });

  it('uploads final thesis when required-summary endpoint fails and summary becomes optional', () => {
    stubTesiPageApis({ thesisStatus: 'final_exam', requiredSummary: false });
    cy.intercept('GET', '**/api/students/required-summary', {
      statusCode: 500,
      body: { error: 'required summary unavailable' },
    }).as('getRequiredSummary');
    cy.intercept('POST', '**/api/thesis-conclusion/upload-final-thesis', {
      statusCode: 201,
      body: { ok: true },
    }).as('uploadFinalThesis');

    visitTesiPage();

    cy.contains('button', /Carica Tesi Definitiva|Upload Final Thesis/i)
      .should('be.visible')
      .click();
    cy.get('.final-thesis-upload-modal').should('be.visible');

    cy.get('#final-thesis-summary-pdfa').should('not.exist');
    attachPdf('#final-thesis-pdfa', 'tesi-finale.pdf');
    cy.get('.final-thesis-upload-modal')
      .contains('button', /Carica documento|Upload document/i)
      .should('be.enabled')
      .click();

    cy.get('.modal.show')
      .last()
      .contains('button', /Si, carica la tesi|Yes, upload the thesis/i)
      .click();

    cy.wait('@uploadFinalThesis').its('response.statusCode').should('eq', 201);
  });
});
