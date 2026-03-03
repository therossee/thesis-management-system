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

const BASE_THESIS = {
  id: 701,
  topic: 'Studio su sistemi intelligenti',
  status: 'ongoing',
  supervisor: TEACHERS[0],
  coSupervisors: [TEACHERS[1]],
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
  ],
};

const SDGS = [
  { id: 1, goal: 'No Poverty' },
  { id: 2, goal: 'Zero Hunger' },
  { id: 3, goal: 'Good Health and Well-being' },
  { id: 18, goal: 'NOT APPLICABLE' },
];

const LICENSES = [
  {
    id: 6,
    name: 'Attribuzione - Non commerciale - Non opere derivate CC BY-NC-ND',
    name_en: 'Attribution - NonCommercial-NoDerivs CC BY-NC-ND',
    description: 'Descrizione licenza',
    description_en: 'License description',
  },
  {
    id: 1,
    name: 'Attribuzione CC BY',
    name_en: 'Attribution CC BY',
    description: 'Descrizione licenza 2',
    description_en: 'License description 2',
  },
];

const EMBARGO_MOTIVATIONS = [
  {
    id: 1,
    motivation: 'Necessità di evitare la divulgazione di risultati',
    motivation_en: 'Need to avoid disclosure of results',
  },
  {
    id: 7,
    motivation: 'Altro',
    motivation_en: 'Other',
  },
];

const KEYWORDS = [
  { id: 1, keyword: 'AI' },
  { id: 2, keyword: 'Data' },
];

const BASE_DRAFT_DETAILS = {
  title: 'Titolo bozza',
  titleEng: 'Draft title',
  abstract: 'Abstract di prova',
  abstractEng: 'Draft abstract',
  language: 'en',
  keywords: [{ id: 1, keyword: 'AI' }],
  sdgs: [
    { goalId: 1, level: 'primary' },
    { goalId: 2, level: 'secondary' },
    { goalId: 3, level: 'secondary' },
  ],
};

const AUTHORIZE_DRAFT = {
  ...BASE_DRAFT_DETAILS,
  licenseId: 6,
  thesisDraftDate: '2026-02-01T09:00:00',
  thesisFilePath: '/uploads/draft/thesis.pdf',
};

const DETAILS_ONLY_DRAFT = {
  ...BASE_DRAFT_DETAILS,
  thesisDraftDate: '2026-02-01T09:00:00',
};

const DRAFT_WITH_FILES = {
  ...AUTHORIZE_DRAFT,
  thesisFilePath: '/uploads/draft/thesis-draft.pdf',
  thesisSummaryPath: '/uploads/draft/summary-draft.pdf',
  additionalZipPath: '/uploads/draft/additional-draft.zip',
};

const ENGLISH_DRAFT_WITH_FALLBACKS = {
  ...AUTHORIZE_DRAFT,
  language: 'en',
  title: 'English title',
  titleEng: '',
  abstract: 'English abstract used as source text for fallback branches',
  abstractEng: '',
  keywords: [' Generative AI ', { id: 2, keyword: 'Data' }],
  sdgs: [{ goalId: 18, level: 'primary' }],
  coSupervisors: [
    {
      id: 99999,
      firstName: 'Paola',
      lastName: 'Neri',
      email: 'paola.neri@example.com',
    },
  ],
};

const setStableUiPreferences = win => {
  win.localStorage.setItem('language', 'it');
  win.localStorage.setItem('theme', 'light');
};

const rightActionButton = () => cy.get('.cr-steps-actions-right button');
const nextStepButton = () => cy.contains('.cr-steps-actions-right button', /Avanti|Next/i);
const waitForDraftSaveUiStability = () => {
  cy.get('body', { timeout: 10000 }).find('.modal.show .spinner-border').should('have.length', 0);
};

const clickNextStep = () => {
  nextStepButton().should('be.enabled');
  nextStepButton().click({ force: true });
};

const confirmConclusionSubmit = () => {
  cy.get('.modal.show')
    .last()
    .contains('button', /S[iì], invia|Yes, send/i)
    .should('be.visible')
    .click({ force: true });
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

const checkDeclarations = declarationIds => {
  declarationIds.forEach(id => {
    cy.get(`#declaration-${id}`).check({ force: true });
  });
};

const stubConclusionPageApis = ({
  thesisStatus = 'ongoing',
  requiredSummary = false,
  draft = null,
  submitStatus = 201,
}) => {
  cy.intercept('GET', '**/api/students', ALL_STUDENTS).as('getStudents');
  cy.intercept('GET', '**/api/students/logged-student', LOGGED_STUDENT).as('getLoggedStudent');

  cy.intercept('GET', '**/api/thesis', {
    ...BASE_THESIS,
    status: thesisStatus,
  }).as('getThesis');
  cy.intercept('GET', '**/api/thesis-proposals/teachers*', TEACHERS).as('getTeachers');
  cy.intercept('GET', '**/api/thesis-conclusion/licenses*', LICENSES).as('getLicenses');
  cy.intercept('GET', '**/api/thesis-conclusion/sdgs*', SDGS).as('getSdgs');
  cy.intercept('GET', '**/api/thesis-conclusion/embargo-motivations*', EMBARGO_MOTIVATIONS).as('getEmbargoMotivations');
  cy.intercept('GET', '**/api/thesis-proposals/keywords*', KEYWORDS).as('getKeywords');
  cy.intercept('GET', '**/api/students/required-summary', { requiredSummary }).as('getRequiredSummary');
  cy.intercept('GET', '**/api/thesis/*/thesis', {
    statusCode: 200,
    body: 'thesis-file-content',
    headers: { 'content-type': 'application/pdf' },
  }).as('getDraftThesisBlob');
  cy.intercept('GET', '**/api/thesis/*/summary', {
    statusCode: 200,
    body: 'summary-file-content',
    headers: { 'content-type': 'application/pdf' },
  }).as('getDraftSummaryBlob');
  cy.intercept('GET', '**/api/thesis/*/additional', {
    statusCode: 200,
    body: 'additional-file-content',
    headers: { 'content-type': 'application/zip' },
  }).as('getDraftAdditionalBlob');

  if (draft) {
    cy.intercept('GET', '**/api/thesis-conclusion/draft', draft).as('getDraft');
  } else {
    cy.intercept('GET', '**/api/thesis-conclusion/draft', {
      statusCode: 404,
      body: { error: 'Draft not found' },
    }).as('getDraft');
  }

  cy.intercept('POST', '**/api/thesis-conclusion/draft', { statusCode: 201, body: { ok: true } }).as('saveDraft');
  cy.intercept('POST', '**/api/thesis-conclusion', {
    statusCode: submitStatus,
    body: submitStatus >= 400 ? { error: 'submit failed' } : { id: 999 },
  }).as('submitConclusion');
};

const visitConclusionPage = () => {
  cy.visit('/carriera/tesi/conclusione_tesi', { onBeforeLoad: setStableUiPreferences });
  cy.wait([
    '@getStudents',
    '@getLoggedStudent',
    '@getThesis',
    '@getTeachers',
    '@getLicenses',
    '@getSdgs',
    '@getEmbargoMotivations',
    '@getKeywords',
    '@getRequiredSummary',
    '@getDraft',
  ]);
};

const moveToSubmitStepWithAuthorizeFlow = ({ attachFreshThesis = true } = {}) => {
  clickNextStep();
  cy.wait('@saveDraft');
  waitForDraftSaveUiStability();

  cy.get('#authorization-authorize').should('be.checked');
  clickNextStep();
  cy.wait('@saveDraft');
  waitForDraftSaveUiStability();

  if (attachFreshThesis) {
    attachPdf('#final-thesis-pdfa', 'tesi-definitiva.pdf');
  }
  clickNextStep();
  cy.wait('@saveDraft');
  waitForDraftSaveUiStability();

  checkDeclarations([1, 2, 3, 4, 5, 6]);
  clickNextStep();
  cy.wait('@saveDraft');
  waitForDraftSaveUiStability();
};

describe('Conclusion request wizard', () => {
  it('shows not-eligible state when thesis status is not ongoing', () => {
    stubConclusionPageApis({ thesisStatus: 'final_exam', draft: null });
    visitConclusionPage();

    cy.contains(/Non idoneo|Not Eligible/i).should('be.visible');
    cy.contains(/Non sei idoneo|You are not eligible/i).should('be.visible');
    rightActionButton().should('not.exist');
  });

  it('completes authorize flow and submits successfully', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: AUTHORIZE_DRAFT,
      submitStatus: 201,
    });
    visitConclusionPage();

    cy.get('#title-original').should('exist');
    moveToSubmitStepWithAuthorizeFlow({ attachFreshThesis: true });

    rightActionButton()
      .contains(/Invia richiesta|Send request/i)
      .should('be.enabled')
      .click();
    confirmConclusionSubmit();

    cy.wait('@submitConclusion').its('response.statusCode').should('eq', 201);
    cy.contains(/Richiesta inviata con successo|Request submitted successfully/i).should('be.visible');
  });

  it('validates deny flow and required summary upload before submit', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: true,
      draft: DETAILS_ONLY_DRAFT,
      submitStatus: 201,
    });
    visitConclusionPage();

    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();

    cy.get('#authorization-deny').check({ force: true });
    rightActionButton().should('be.disabled');
    cy.get('input[name="embargo-period"]').first().check({ force: true });
    cy.get('input[name="embargo-period"]').first().should('be.checked');
    cy.get('.cr-section').find('input[type="checkbox"]').first().check({ force: true });
    cy.get('.cr-section').find('input[type="checkbox"]').first().should('be.checked');
    rightActionButton().should('be.enabled');

    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();

    cy.get('#summary-for-committee-pdf').should('exist');
    cy.get('#final-thesis-pdfa').should('exist');
    rightActionButton().should('be.disabled');

    attachPdf('#final-thesis-pdfa', 'tesi-definitiva.pdf');
    rightActionButton().should('be.disabled');
    attachPdf('#summary-for-committee-pdf', 'riassunto.pdf');
    rightActionButton().should('be.enabled');

    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();

    cy.get('#declaration-2').should('not.exist');
    checkDeclarations([1, 3, 4, 5, 6]);
    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();

    rightActionButton()
      .contains(/Invia richiesta|Send request/i)
      .should('be.enabled')
      .click();
    confirmConclusionSubmit();

    cy.wait('@submitConclusion').its('response.statusCode').should('eq', 201);
    cy.contains(/Richiesta inviata con successo|Request submitted successfully/i).should('be.visible');
  });

  it('shows error outcome when submit fails', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: AUTHORIZE_DRAFT,
      submitStatus: 500,
    });
    visitConclusionPage();

    moveToSubmitStepWithAuthorizeFlow({ attachFreshThesis: true });
    rightActionButton()
      .contains(/Invia richiesta|Send request/i)
      .should('be.enabled')
      .click();
    confirmConclusionSubmit();

    cy.wait('@submitConclusion').its('response.statusCode').should('eq', 500);
    cy.contains(/Errore durante l'invio della richiesta|Error submitting the request/i).should('be.visible');
  });

  it('supports draft file actions (open, download, remove) in uploads step', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: true,
      draft: DRAFT_WITH_FILES,
      submitStatus: 201,
    });
    cy.intercept('GET', '**/api/thesis/701/thesis', {
      statusCode: 200,
      body: 'thesis-file-content',
      headers: { 'content-type': 'application/pdf' },
    }).as('getDraftThesisFile');

    visitConclusionPage();
    cy.window().then(win => {
      cy.stub(win, 'open').as('windowOpen');
      cy.stub(win.URL, 'createObjectURL').returns('blob:test-url').as('createObjectUrl');
      cy.stub(win.URL, 'revokeObjectURL').as('revokeObjectUrl');
      cy.stub(win.HTMLAnchorElement.prototype, 'click').as('anchorClick');
    });

    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();
    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();

    cy.contains('.cr-file-name', 'thesis-draft.pdf')
      .parents('.cr-file-name-line')
      .within(() => {
        cy.get('button[aria-label="Apri file"], button[aria-label="Open file"]').click();
      });

    cy.wait('@getDraftThesisFile');
    cy.get('@windowOpen').should('have.been.calledOnce');

    cy.contains('.cr-file-name', 'thesis-draft.pdf')
      .parents('.cr-file-name-line')
      .within(() => {
        cy.get('button[aria-label="Scarica file"], button[aria-label="Download file"]').click();
      });

    cy.wait('@getDraftThesisFile');
    cy.get('@anchorClick').should('have.been.called');

    cy.contains('.cr-file-name', 'thesis-draft.pdf')
      .parents('.cr-file-name-line')
      .within(() => {
        cy.get('button[aria-label="Rimuovi file"], button[aria-label="Remove file"]').click();
      });

    cy.contains('.cr-file-name', 'thesis-draft.pdf').should('not.exist');
    rightActionButton().should('be.disabled');
  });

  it('supports english draft details and not-applicable sdg fallback through submit flow', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: ENGLISH_DRAFT_WITH_FALLBACKS,
      submitStatus: 201,
    });
    visitConclusionPage();

    cy.get('#title-original').should('have.value', 'English title');
    cy.get('#title-translation').should('not.exist');
    cy.get('#abstract-translation').should('not.exist');

    cy.get('.cr-sdg-toggle').click();
    cy.get('.cr-sdg-toggle').should('have.attr', 'aria-expanded', 'true');
    cy.get('.cr-sdg-toggle').click();
    cy.get('.cr-sdg-toggle').should('have.attr', 'aria-expanded', 'false');

    moveToSubmitStepWithAuthorizeFlow({ attachFreshThesis: true });
    cy.contains('.info-detail', '6 / 6').should('exist');

    rightActionButton()
      .contains(/Invia richiesta|Send request/i)
      .should('be.enabled')
      .click();
    confirmConclusionSubmit();

    cy.wait('@submitConclusion').its('response.statusCode').should('eq', 201);
    cy.contains(/Richiesta inviata con successo|Request submitted successfully/i).should('be.visible');
  });

  it('restores updated draft values after page reload', () => {
    let draftState = {
      ...AUTHORIZE_DRAFT,
      title: 'Titolo iniziale',
    };

    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: draftState,
      submitStatus: 201,
    });

    cy.intercept('GET', '**/api/thesis-conclusion/draft', req => {
      req.reply({ statusCode: 200, body: draftState });
    }).as('getDraft');

    cy.intercept('POST', '**/api/thesis-conclusion/draft', req => {
      draftState = {
        ...draftState,
        title: 'Titolo aggiornato',
      };
      req.reply({ statusCode: 201, body: { ok: true } });
    }).as('saveDraft');

    visitConclusionPage();
    cy.get('#title-original').clear();
    cy.get('#title-original').type('Titolo aggiornato');

    clickNextStep();
    cy.wait('@saveDraft').its('response.statusCode').should('eq', 201);
    waitForDraftSaveUiStability();

    cy.reload();
    cy.wait('@getDraft');
    cy.get('#title-original').should('have.value', 'Titolo aggiornato');
  });
});
