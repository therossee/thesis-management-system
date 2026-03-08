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
    sessionName: 'Marzo/Aprile 2026',
    sessionNameEn: 'March/April 2026',
  },
  deadlines: [
    {
      deadlineType: 'conclusion_request',
      deadlineDate: '2026-06-18T23:59:59',
      graduationSessionId: 1,
    },
  ],
};

const setStableUiPreferences = (win, language = 'it') => {
  win.localStorage.setItem('language', language);
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

const stubTesiPageApis = ({ thesisStatus = 'ongoing', requiredSummary = false, thesisOverride = {} }) => {
  cy.intercept('GET', '**/api/students', ALL_STUDENTS).as('getStudents');
  cy.intercept('GET', '**/api/students/logged-student', LOGGED_STUDENT).as('getLoggedStudent');

  cy.intercept('GET', '**/api/thesis-applications', BASE_APPLICATION).as('getLastApplication');
  cy.intercept('GET', '**/api/thesis', {
    ...BASE_THESIS,
    status: thesisStatus,
    ...thesisOverride,
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

const visitTesiPage = (language = 'it') => {
  cy.visit('/carriera/tesi', {
    onBeforeLoad: win => setStableUiPreferences(win, language),
  });
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

const isoDateWithOffsetDays = offsetDays => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString();
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

  it('renders deadlines modal overdue/today branches with english session title', () => {
    stubTesiPageApis({ thesisStatus: 'ongoing', requiredSummary: false });
    cy.intercept('GET', '**/api/thesis-conclusion/deadlines*', {
      graduationSession: {
        id: 1,
        sessionName: 'Marzo/Aprile 2026',
        sessionNameEn: 'March/April 2026',
      },
      deadlines: [
        {
          deadlineType: 'conclusion_request',
          graduationSessionId: 1,
          deadlineDate: isoDateWithOffsetDays(-1),
        },
        {
          deadlineType: 'exams',
          graduationSessionId: 1,
          deadlineDate: isoDateWithOffsetDays(0),
        },
      ],
    }).as('getDeadlines');

    visitTesiPage('en');

    cy.get('.timeline-card').should('be.visible');
    cy.get('.timeline-deadlines-btn').first().as('deadlinesBtn');
    cy.get('@deadlinesBtn').scrollIntoView();
    cy.get('@deadlinesBtn').should('be.visible');
    cy.get('@deadlinesBtn').click({ force: true });

    cy.get('body').then($body => {
      if (!$body.find('[role="dialog"], .modal.show').length) {
        cy.get('@deadlinesBtn').click({ force: true });
      }
    });

    cy.get('[role="dialog"], .modal.show', { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', 'March/April 2026');
    cy.get('.deadline-status-overdue')
      .contains(/Overdue|Scaduta/i)
      .should('be.visible');
    cy.get('.deadline-status-today')
      .contains(/Today|Oggi/i)
      .should('be.visible');
  });

  it('uses file path basename as download filename when content-disposition is missing', () => {
    stubTesiPageApis({
      thesisStatus: 'conclusion_approved',
      requiredSummary: false,
      thesisOverride: {
        thesisFilePath: '/uploads/final/fallback-name.pdf',
        thesisSummaryPath: null,
        additionalZipPath: null,
      },
    });
    cy.intercept('GET', '**/api/thesis/701/thesis', {
      statusCode: 200,
      body: 'thesis-content',
      headers: {
        'content-type': 'application/pdf',
      },
    }).as('downloadThesisNoDisposition');

    visitTesiPage();

    cy.window().then(win => {
      cy.stub(win.URL, 'createObjectURL').returns('blob:download-url').as('createObjectUrl');
      cy.stub(win.URL, 'revokeObjectURL').as('revokeObjectUrl');
      cy.stub(win.HTMLAnchorElement.prototype, 'click').as('anchorClick');
      cy.stub(win.HTMLAnchorElement.prototype, 'setAttribute').callThrough().as('setAttribute');
    });

    cy.contains('button', /Tesi in formato PDF\/A|Thesis in PDF\/A format/i).click();
    cy.wait('@downloadThesisNoDisposition');
    cy.get('@anchorClick').should('have.been.called');
    cy.get('@setAttribute').then(setAttributeStub => {
      const downloadCall = setAttributeStub.getCalls().find(call => call.args[0] === 'download');
      expect(downloadCall, 'download attribute call').to.not.be.undefined;
      expect(downloadCall.args[1]).to.eq('fallback-name.pdf');
    });
  });

  it('uses topic fallback download filename when basename and content-disposition are unavailable', () => {
    stubTesiPageApis({
      thesisStatus: 'conclusion_approved',
      requiredSummary: false,
      thesisOverride: {
        topic: 'Fallback Topic',
        thesisFilePath: '/uploads/final/',
        thesisSummaryPath: null,
        additionalZipPath: null,
      },
    });
    cy.intercept('GET', '**/api/thesis/701/thesis', {
      statusCode: 200,
      body: 'thesis-content',
      headers: { 'content-type': 'application/pdf' },
    }).as('downloadThesisFallbackTopic');

    visitTesiPage();

    cy.window().then(win => {
      cy.stub(win.URL, 'createObjectURL').returns('blob:download-url').as('createObjectUrl');
      cy.stub(win.URL, 'revokeObjectURL').as('revokeObjectUrl');
      cy.stub(win.HTMLAnchorElement.prototype, 'click').as('anchorClick');
      cy.stub(win.HTMLAnchorElement.prototype, 'setAttribute').callThrough().as('setAttribute');
    });

    cy.contains('button', /Tesi in formato PDF\/A|Thesis in PDF\/A format/i).click();
    cy.wait('@downloadThesisFallbackTopic');
    cy.get('@anchorClick').should('have.been.called');
    cy.get('@setAttribute').then(setAttributeStub => {
      const downloadCall = setAttributeStub.getCalls().find(call => call.args[0] === 'download');
      expect(downloadCall, 'download attribute call').to.not.be.undefined;
      expect(downloadCall.args[1]).to.eq('Fallback Topic_thesis');
    });
  });

  it('keeps thesis page visible when eligibility check API fails', () => {
    stubTesiPageApis({ thesisStatus: 'ongoing', requiredSummary: false });
    cy.intercept('GET', '**/api/thesis-applications/eligibility*', {
      statusCode: 500,
      body: { error: 'eligibility unavailable' },
    }).as('getEligibility');

    visitTesiPage();
    cy.get('.timeline-card').should('be.visible');
    cy.contains('.thesis-topic', /Timeline|Cronologia/i).should('be.visible');
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

  it('toggles show more/show less in thesis topic card for long topics', () => {
    const longTopic = `${'Tema esteso per copertura topic card. '.repeat(40)}Fine tema.`;
    stubTesiPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      thesisOverride: {
        topic: longTopic,
        abstract: 'Abstract breve',
      },
    });

    visitTesiPage();

    cy.contains('.roundCard .thesis-topic', /Argomento|Topic/i)
      .closest('.roundCard')
      .as('topicCard');

    cy.get('@topicCard')
      .contains('button', /Mostra di pi[uù]|Show more/i)
      .should('have.attr', 'aria-expanded', 'false')
      .click({ force: true });

    cy.get('@topicCard')
      .contains('button', /Mostra( di)? meno|Show less/i)
      .should('have.attr', 'aria-expanded', 'true')
      .click({ force: true });

    cy.get('@topicCard')
      .contains('button', /Mostra di pi[uù]|Show more/i)
      .should('have.attr', 'aria-expanded', 'false');
  });

  it('shows conclusion rejected as active timeline outcome when status returns to ongoing', () => {
    stubTesiPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      thesisOverride: {
        applicationStatusHistory: [
          ...BASE_THESIS.applicationStatusHistory,
          {
            oldStatus: 'ongoing',
            newStatus: 'conclusion_requested',
            changeDate: '2026-01-08T11:00:00',
          },
          {
            oldStatus: 'conclusion_requested',
            newStatus: 'ongoing',
            changeDate: '2026-01-15T09:00:00',
          },
        ],
      },
    });

    visitTesiPage();

    cy.contains('.progress-step', /Conclusione respinta|Conclusion rejected/i)
      .should('have.class', 'is-active-step')
      .find('.progress-step-circle.rejected')
      .should('exist');
  });

  it('shows final upload rejected as active timeline outcome when latest status returns to ongoing', () => {
    stubTesiPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      thesisOverride: {
        applicationStatusHistory: [
          ...BASE_THESIS.applicationStatusHistory,
          {
            oldStatus: 'ongoing',
            newStatus: 'conclusion_requested',
            changeDate: '2026-01-08T11:00:00',
          },
          {
            oldStatus: 'conclusion_requested',
            newStatus: 'conclusion_approved',
            changeDate: '2026-01-10T11:00:00',
          },
          {
            oldStatus: 'conclusion_approved',
            newStatus: 'almalaurea',
            changeDate: '2026-01-11T11:00:00',
          },
          {
            oldStatus: 'almalaurea',
            newStatus: 'compiled_questionnaire',
            changeDate: '2026-01-12T11:00:00',
          },
          {
            oldStatus: 'compiled_questionnaire',
            newStatus: 'final_exam',
            changeDate: '2026-01-13T11:00:00',
          },
          {
            oldStatus: 'final_exam',
            newStatus: 'final_thesis',
            changeDate: '2026-01-14T11:00:00',
          },
          {
            oldStatus: 'final_thesis',
            newStatus: 'ongoing',
            changeDate: '2026-01-15T11:00:00',
          },
        ],
      },
    });

    visitTesiPage();

    cy.contains('.progress-step', /Tesi finale rifiutata|Final thesis rejected/i)
      .should('have.class', 'is-active-step')
      .find('.progress-step-circle.rejected')
      .should('exist');
  });

  it('infers timeline status from history when thesis status is unknown', () => {
    stubTesiPageApis({
      thesisStatus: 'mystery_status',
      requiredSummary: false,
      thesisOverride: {
        applicationStatusHistory: [
          ...BASE_THESIS.applicationStatusHistory,
          {
            oldStatus: 'ongoing',
            newStatus: 'cancel_requested',
            changeDate: '2026-01-20T10:00:00',
          },
        ],
      },
    });

    visitTesiPage();

    cy.contains('.progress-step', /Annullamento richiesto|Cancellation requested/i).should(
      'have.class',
      'is-active-step',
    );
    cy.contains('.progress-step', /Esito annullamento|Cancellation outcome/i).should('be.visible');
  });
});
