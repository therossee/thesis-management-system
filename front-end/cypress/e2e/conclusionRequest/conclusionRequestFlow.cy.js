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

const ITALIAN_DRAFT_MISSING_TRANSLATIONS = {
  ...AUTHORIZE_DRAFT,
  language: 'it',
  title: 'Titolo in italiano',
  abstract: 'Abstract in italiano',
  titleEng: '',
  abstractEng: '',
};

const LONG_ITALIAN_DRAFT = {
  ...AUTHORIZE_DRAFT,
  language: 'it',
  title: `Titolo molto lungo ${'A'.repeat(160)}`,
  titleEng: `Very long english title ${'B'.repeat(160)}`,
  abstract: `Abstract molto lungo ${'C'.repeat(260)}`,
  abstractEng: `Very long english abstract ${'D'.repeat(260)}`,
};

const LEGACY_MIXED_DRAFT = {
  ...BASE_DRAFT_DETAILS,
  language: 'it',
  title: 'Titolo legacy',
  titleEng: '',
  abstract: 'Abstract legacy',
  abstractEng: '',
  keywords: [
    '  Cloud  ',
    { value: 2 },
    { id: 0, value: 'Edge AI' },
    { id: 'legacy', keyword: 'Fallback keyword' },
    { id: 999, label: 'Keyword da label' },
  ],
  sdgs: [
    { goal_id: 18, level: 'primary' },
    { goal_id: 18, level: 'secondary' },
  ],
  embargo: {
    duration: '6_months',
    motivations: [{ motivation_id: 7, other_motivation: 'Motivazione legacy personalizzata' }],
  },
  coSupervisors: [TEACHERS[1]],
  thesisDraftDate: null,
  thesisFilePath: '/uploads/draft/legacy-thesis.pdf',
};

const AUTHORIZE_DRAFT_WITH_LICENSE_FALLBACKS = {
  ...AUTHORIZE_DRAFT,
  licenseId: 999,
  keywords: [],
  coSupervisors: [],
};

const DENY_DRAFT_WITH_UNKNOWN_EMBARGO_MOTIVATION = {
  ...DETAILS_ONLY_DRAFT,
  licenseId: null,
  embargo: {
    duration: '12_months',
    motivations: [{ motivationId: 999 }],
  },
};

const DRAFT_WITH_INVALID_COSUP_AND_TRAILING_PATHS = {
  ...AUTHORIZE_DRAFT,
  thesisDraftDate: '2026-02-20T10:00:00',
  coSupervisors: [
    {
      id: 'abc',
      firstName: 'Ghost',
      lastName: 'Teacher',
      email: 'ghost.teacher@example.com',
    },
  ],
  thesisFilePath: '/uploads/draft/',
  thesisSummaryPath: '/uploads/draft/',
  additionalZipPath: '/uploads/draft/',
};

const DRAFT_WITH_NON_ARRAY_KEYWORDS_AND_SDGS = {
  ...AUTHORIZE_DRAFT,
  keywords: { keyword: 'invalid-keyword-shape' },
  sdgs: null,
};

const DRAFT_WITHOUT_AUTHORIZATION = {
  ...DETAILS_ONLY_DRAFT,
  licenseId: null,
  embargo: null,
};

const setStableUiPreferences = (win, language = 'it') => {
  win.localStorage.setItem('language', language);
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

const attachFile = (selector, fileName, mimeType, contents = 'mock-file-content') => {
  cy.get(selector).selectFile(
    {
      contents: Cypress.Buffer.from(contents),
      fileName,
      mimeType,
    },
    { force: true },
  );
};

const toggleExpandableSummaryBlock = labelRegex => {
  cy.contains('.title-container', labelRegex)
    .closest('.info-container, .text-container')
    .within(() => {
      cy.contains('button', /Mostra di pi[uù]|Show more/i).click({ force: true });
      cy.contains('button', /Mostra( di)? meno|Show less/i).click({ force: true });
    });
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
  thesisOverride = {},
}) => {
  cy.intercept('GET', '**/api/students', ALL_STUDENTS).as('getStudents');
  cy.intercept('GET', '**/api/students/logged-student', LOGGED_STUDENT).as('getLoggedStudent');

  cy.intercept('GET', '**/api/thesis', {
    ...BASE_THESIS,
    status: thesisStatus,
    ...thesisOverride,
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

const visitConclusionPage = (language = 'it') => {
  cy.visit('/carriera/tesi/conclusione_tesi', {
    onBeforeLoad: win => setStableUiPreferences(win, language),
  });
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

const clearSdgByIndex = index => {
  cy.get('.cr-sdg-sticky-selects .select-sdg', { timeout: 10000 })
    .eq(index)
    .find('.select__clear-indicator')
    .should('exist')
    .click({ force: true });
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

const moveToUploadsStepWithAuthorizeFlow = () => {
  clickNextStep();
  cy.wait('@saveDraft');
  waitForDraftSaveUiStability();

  cy.get('#authorization-authorize').should('be.checked');
  clickNextStep();
  cy.wait('@saveDraft');
  waitForDraftSaveUiStability();
};

const moveToSubmitStepWithDenyFlow = ({ attachFreshThesis = true } = {}) => {
  clickNextStep();
  cy.wait('@saveDraft');
  waitForDraftSaveUiStability();

  cy.get('#authorization-deny').should('be.checked');
  rightActionButton().should('be.enabled');
  clickNextStep();
  cy.wait('@saveDraft');
  waitForDraftSaveUiStability();

  if (attachFreshThesis) {
    attachPdf('#final-thesis-pdfa', 'tesi-definitiva.pdf');
  }
  clickNextStep();
  cy.wait('@saveDraft');
  waitForDraftSaveUiStability();

  checkDeclarations([1, 3, 4, 5, 6]);
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

  it('shows not-eligible state also with auto theme preference', () => {
    stubConclusionPageApis({ thesisStatus: 'final_exam', draft: null });
    cy.visit('/carriera/tesi/conclusione_tesi', {
      onBeforeLoad: win => {
        setStableUiPreferences(win, 'it');
        win.localStorage.setItem('theme', 'auto');
      },
    });
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

    cy.contains(/Non idoneo|Not Eligible/i).should('be.visible');
    cy.contains(/Non idoneo|Not Eligible/i)
      .closest('.roundCard')
      .find('button')
      .filter(':visible')
      .should('have.length.at.least', 1);
  });

  it('shows bootstrap fallback when thesis payload is null', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: AUTHORIZE_DRAFT,
      submitStatus: 201,
    });
    cy.intercept('GET', '**/api/thesis', { statusCode: 200, body: null }).as('getThesis');

    visitConclusionPage();
    cy.contains(/Non idoneo|Not Eligible/i).should('be.visible');
  });

  it('keeps details step usable when teachers bootstrap API fails', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: AUTHORIZE_DRAFT,
      submitStatus: 201,
    });
    cy.intercept('GET', '**/api/thesis-proposals/teachers*', {
      statusCode: 500,
      body: { error: 'teachers unavailable' },
    }).as('getTeachers');

    visitConclusionPage();
    cy.get('#title-original').should('be.visible');
    nextStepButton().should('be.enabled');
  });

  it('keeps authorization unselected when draft has neither license nor embargo', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: DRAFT_WITHOUT_AUTHORIZATION,
      submitStatus: 201,
    });
    visitConclusionPage();

    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();

    cy.get('#authorization-authorize').should('not.be.checked');
    cy.get('#authorization-deny').should('not.be.checked');
    rightActionButton().should('be.disabled');
  });

  it('requires english translations when draft language is italian', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: ITALIAN_DRAFT_MISSING_TRANSLATIONS,
      submitStatus: 201,
    });
    visitConclusionPage();

    cy.get('#title-original').should('have.value', 'Titolo in italiano');
    cy.get('#title-translation').should('exist');
    cy.get('#abstract-translation').should('exist');
    nextStepButton().should('be.disabled');

    cy.get('#title-translation').clear();
    cy.get('#title-translation').type('English title from cypress');
    cy.get('#abstract-translation').clear();
    cy.get('#abstract-translation').type('English abstract from cypress');
    nextStepButton().should('be.enabled');

    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();
    cy.get('#authorization-authorize').should('be.visible');
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

    cy.get('input[name="embargo-period"]').eq(1).check({ force: true });
    cy.get('input[name="embargo-period"]').eq(1).should('be.checked');
    cy.get('.cr-section').find('input[type="checkbox"]').eq(1).check({ force: true });
    const embargoReasonSelector = 'input[placeholder*="motivo"], input[placeholder*="reason"]';
    cy.get(embargoReasonSelector).should('be.enabled');
    cy.get(embargoReasonSelector).clear();
    cy.get(embargoReasonSelector).type('Motivazione embargo personalizzata da Cypress');
    rightActionButton().should('be.enabled');

    cy.get('input[name="embargo-period"]').eq(2).check({ force: true });
    cy.get('input[name="embargo-period"]').eq(2).should('be.checked');
    cy.get('input[name="embargo-period"]').eq(3).check({ force: true });
    cy.get('input[name="embargo-period"]').eq(3).should('be.checked');
    cy.get('input[name="embargo-period"]').eq(0).check({ force: true });
    cy.get('input[name="embargo-period"]').eq(0).should('be.checked');
    cy.get('.cr-section').find('input[type="checkbox"]').eq(0).check({ force: true });

    cy.get('#authorization-authorize').check({ force: true });
    cy.get('#license-choice-1').check({ force: true });
    cy.get('#authorization-deny').check({ force: true });
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

  it('disables deny flow progression again when an embargo motivation is unchecked', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: DETAILS_ONLY_DRAFT,
      submitStatus: 201,
    });
    visitConclusionPage();

    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();

    cy.get('#authorization-deny').check({ force: true });
    cy.get('input[name="embargo-period"]').eq(0).check({ force: true });
    cy.get('.cr-section').find('input[type="checkbox"]').eq(0).check({ force: true });
    rightActionButton().should('be.enabled');

    cy.get('.cr-section').find('input[type="checkbox"]').eq(0).uncheck({ force: true });
    rightActionButton().should('be.disabled');
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

    cy.contains('.cr-file-name', 'summary-draft.pdf')
      .parents('.cr-file-name-line')
      .within(() => {
        cy.get('button[aria-label="Apri file"], button[aria-label="Open file"]').click();
      });
    cy.wait('@getDraftSummaryBlob');
    cy.get('@windowOpen').should('have.callCount', 2);

    cy.contains('.cr-file-name', 'summary-draft.pdf')
      .parents('.cr-file-name-line')
      .within(() => {
        cy.get('button[aria-label="Scarica file"], button[aria-label="Download file"]').click();
      });
    cy.wait('@getDraftSummaryBlob');

    cy.contains('.cr-file-name', 'summary-draft.pdf')
      .parents('.cr-file-name-line')
      .within(() => {
        cy.get('button[aria-label="Rimuovi file"], button[aria-label="Remove file"]').click();
      });
    cy.contains('.cr-file-name', 'summary-draft.pdf').should('not.exist');

    cy.contains('.cr-file-name', 'additional-draft.zip')
      .parents('.cr-file-name-line')
      .within(() => {
        cy.get('button[aria-label="Scarica file"], button[aria-label="Download file"]').click();
      });
    cy.wait('@getDraftAdditionalBlob');

    cy.contains('.cr-file-name', 'additional-draft.zip')
      .parents('.cr-file-name-line')
      .within(() => {
        cy.get('button[aria-label="Rimuovi file"], button[aria-label="Remove file"]').click();
      });
    cy.contains('.cr-file-name', 'additional-draft.zip').should('not.exist');

    rightActionButton().should('be.disabled');
  });

  it('does not trigger draft file fetch actions when thesis id is missing', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: true,
      draft: DRAFT_WITH_FILES,
      submitStatus: 201,
      thesisOverride: {
        id: null,
      },
    });
    visitConclusionPage();
    moveToUploadsStepWithAuthorizeFlow();

    cy.contains('.cr-file-name', 'thesis-draft.pdf')
      .parents('.cr-file-name-line')
      .within(() => {
        cy.get('button[aria-label="Apri file"], button[aria-label="Open file"]').click({ force: true });
      });

    cy.get('@getDraftThesisBlob.all').should('have.length', 0);
  });

  it('submits using draft files when file responses have no content-type header', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: DRAFT_WITH_FILES,
      submitStatus: 201,
    });

    cy.intercept('GET', '**/api/thesis/701/thesis', {
      statusCode: 200,
      body: 'raw-thesis-data',
    }).as('getDraftThesisRaw');
    cy.intercept('GET', '**/api/thesis/701/summary', {
      statusCode: 200,
      body: 'raw-summary-data',
    }).as('getDraftSummaryRaw');
    cy.intercept('GET', '**/api/thesis/701/additional', {
      statusCode: 200,
      body: 'raw-additional-data',
    }).as('getDraftAdditionalRaw');

    visitConclusionPage();
    moveToSubmitStepWithAuthorizeFlow({ attachFreshThesis: false });

    rightActionButton()
      .contains(/Invia richiesta|Send request/i)
      .should('be.enabled')
      .click();
    confirmConclusionSubmit();

    cy.wait('@getDraftThesisRaw').its('response.statusCode').should('eq', 200);
    cy.wait('@getDraftSummaryRaw').its('response.statusCode').should('eq', 200);
    cy.wait('@getDraftAdditionalRaw').its('response.statusCode').should('eq', 200);
    cy.wait('@submitConclusion').its('response.statusCode').should('eq', 201);
  });

  it('shows download error toast when a draft upload fetch fails', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: true,
      draft: DRAFT_WITH_FILES,
      submitStatus: 201,
    });
    cy.intercept('GET', '**/api/thesis/701/summary', {
      statusCode: 500,
      body: { error: 'summary download failed' },
    }).as('getDraftSummaryFail');

    visitConclusionPage();
    moveToUploadsStepWithAuthorizeFlow();

    cy.contains('.cr-file-name', 'summary-draft.pdf')
      .parents('.cr-file-name-line')
      .within(() => {
        cy.get('button[aria-label="Apri file"], button[aria-label="Open file"]').click({ force: true });
      });

    cy.wait('@getDraftSummaryFail').its('response.statusCode').should('eq', 500);
    cy.contains(/Errore durante il download|Download error/i).should('be.visible');
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

  it('uses snake_case co_supervisors fallback and tolerates null reference lists', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: AUTHORIZE_DRAFT,
      submitStatus: 201,
      thesisOverride: {
        coSupervisors: undefined,
        co_supervisors: [TEACHERS[1]],
      },
    });

    cy.intercept('GET', '**/api/thesis-proposals/teachers*', {
      statusCode: 200,
      body: null,
    }).as('getTeachers');
    cy.intercept('GET', '**/api/thesis-conclusion/licenses*', {
      statusCode: 200,
      body: null,
    }).as('getLicenses');
    cy.intercept('GET', '**/api/thesis-conclusion/sdgs*', {
      statusCode: 200,
      body: null,
    }).as('getSdgs');
    cy.intercept('GET', '**/api/thesis-conclusion/embargo-motivations*', {
      statusCode: 200,
      body: null,
    }).as('getEmbargoMotivations');
    cy.intercept('GET', '**/api/thesis-proposals/keywords*', {
      statusCode: 200,
      body: null,
    }).as('getKeywords');
    cy.intercept('GET', '**/api/students/required-summary', {
      statusCode: 200,
      body: null,
    }).as('getRequiredSummary');

    visitConclusionPage();

    cy.get('.select-cosupervisors')
      .should('contain.text', TEACHERS[1].lastName)
      .and('contain.text', TEACHERS[1].firstName);
    cy.get('#title-original').should('be.visible');
  });

  it('renders authorization motivations and licenses in english', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: DETAILS_ONLY_DRAFT,
      submitStatus: 201,
    });
    visitConclusionPage('en');

    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();

    cy.get('#authorization-deny').check({ force: true });
    cy.contains(/Need to avoid disclosure of results/i).should('be.visible');
    cy.contains(/Other/i).should('be.visible');

    cy.get('#authorization-authorize').check({ force: true });
    cy.contains(/Attribution - NonCommercial-NoDerivs CC BY-NC-ND/i).should('be.visible');
    cy.contains(/License description/i).should('be.visible');
  });

  it('shows supervisor fallback and clears SDG selections from details step', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: AUTHORIZE_DRAFT,
      submitStatus: 201,
      thesisOverride: {
        supervisor: null,
        coSupervisors: [],
      },
    });
    visitConclusionPage();

    cy.get('.cr-supervisor-field .custom-badge-text')
      .should('be.visible')
      .invoke('text')
      .then(supervisorText => {
        const normalizedSupervisorText = supervisorText.trim();
        expect(normalizedSupervisorText).to.have.length.greaterThan(0);
        expect(normalizedSupervisorText).to.not.equal(`${TEACHERS[0].lastName} ${TEACHERS[0].firstName}`);
      });

    clearSdgByIndex(0);
    clearSdgByIndex(1);
    clearSdgByIndex(2);
    nextStepButton().should('be.disabled');
  });

  it('shows submit summary fallbacks for missing co-supervisors, keywords and unknown license id', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: AUTHORIZE_DRAFT_WITH_LICENSE_FALLBACKS,
      submitStatus: 201,
    });
    visitConclusionPage();

    moveToSubmitStepWithAuthorizeFlow({ attachFreshThesis: true });

    cy.contains('.title-container', /Co-relatori|Co-supervisors/i)
      .closest('.info-container, .text-container')
      .find('.info-detail')
      .should('contain.text', '-');

    cy.contains('.title-container', /Keywords/i)
      .closest('.info-container, .text-container')
      .find('.info-detail')
      .should('contain.text', '-');

    cy.contains('.title-container', /Licenza|License/i)
      .closest('.info-container, .text-container')
      .find('.info-detail')
      .should('contain.text', '-');
  });

  it('goes back to previous step and closes submit confirmation modal without submitting', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: AUTHORIZE_DRAFT,
      submitStatus: 201,
    });
    visitConclusionPage();

    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();

    cy.get('.cr-steps-actions-left button').should('be.visible').click({ force: true });
    cy.get('#title-original').should('be.visible');

    moveToSubmitStepWithAuthorizeFlow({ attachFreshThesis: true });
    rightActionButton()
      .contains(/Invia richiesta|Send request/i)
      .should('be.enabled')
      .click();
    cy.get('.modal.show')
      .last()
      .contains('button', /Annulla|Cancel/i)
      .click({ force: true });
    cy.get('.modal.show').should('not.exist');
  });

  it('shows deny summary fallback when embargo motivations cannot be mapped', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: DENY_DRAFT_WITH_UNKNOWN_EMBARGO_MOTIVATION,
      submitStatus: 201,
    });
    visitConclusionPage();

    moveToSubmitStepWithDenyFlow({ attachFreshThesis: true });

    cy.contains('.title-container', /Autorizzazione|Authorization/i)
      .closest('.info-container, .text-container')
      .find('.info-detail')
      .invoke('text')
      .should('match', /Non autorizzo|Do not authorize/i);

    cy.contains('.title-container', /Motivazioni embargo|Embargo/i)
      .closest('.info-container, .text-container')
      .find('.info-detail')
      .should('contain.text', '-');

    cy.contains('.title-container', /Durata embargo|Embargo duration/i)
      .closest('.info-container, .text-container')
      .find('.info-detail')
      .invoke('text')
      .then(text => {
        expect(text.trim()).to.not.equal('-');
      });
  });

  it('removes local summary replacement together with existing draft summary when summary is required', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: true,
      draft: DRAFT_WITH_FILES,
      submitStatus: 201,
    });
    visitConclusionPage();

    moveToUploadsStepWithAuthorizeFlow();

    attachPdf('#summary-for-committee-pdf', 'riassunto-locale.pdf');
    cy.get('#summary-for-committee-pdf')
      .closest('.cr-upload-card')
      .find('.cr-file-name')
      .should('contain', 'riassunto-locale.pdf');

    cy.get('#summary-for-committee-pdf')
      .closest('.cr-upload-card')
      .within(() => {
        cy.get('button[aria-label="Rimuovi file"], button[aria-label="Remove file"]').click({ force: true });
      });

    cy.get('#summary-for-committee-pdf')
      .closest('.cr-upload-card')
      .contains(/Nessun file selezionato|No file selected/i)
      .should('be.visible');
    rightActionButton().should('be.disabled');
  });

  it('saves draft after removing all server draft files and replacing required uploads locally', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: true,
      draft: DRAFT_WITH_FILES,
      submitStatus: 201,
    });
    visitConclusionPage();

    moveToUploadsStepWithAuthorizeFlow();

    cy.contains('.cr-file-name', 'thesis-draft.pdf')
      .parents('.cr-file-name-line')
      .within(() => {
        cy.get('button[aria-label="Rimuovi file"], button[aria-label="Remove file"]').click({ force: true });
      });
    cy.contains('.cr-file-name', 'summary-draft.pdf')
      .parents('.cr-file-name-line')
      .within(() => {
        cy.get('button[aria-label="Rimuovi file"], button[aria-label="Remove file"]').click({ force: true });
      });
    cy.contains('.cr-file-name', 'additional-draft.zip')
      .parents('.cr-file-name-line')
      .within(() => {
        cy.get('button[aria-label="Rimuovi file"], button[aria-label="Remove file"]').click({ force: true });
      });

    attachPdf('#final-thesis-pdfa', 'tesi-sostitutiva.pdf');
    attachPdf('#summary-for-committee-pdf', 'riassunto-sostitutivo.pdf');
    rightActionButton().should('be.enabled');

    clickNextStep();
    cy.wait('@saveDraft').its('response.statusCode').should('eq', 201);
    waitForDraftSaveUiStability();

    cy.contains('.cr-file-name', 'thesis-draft.pdf').should('not.exist');
    cy.contains('.cr-file-name', 'summary-draft.pdf').should('not.exist');
    cy.contains('.cr-file-name', 'additional-draft.zip').should('not.exist');
  });

  it('ignores invalid co-supervisor payload mapping and empty trailing draft file paths', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: true,
      draft: DRAFT_WITH_INVALID_COSUP_AND_TRAILING_PATHS,
      submitStatus: 201,
    });
    visitConclusionPage();

    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();

    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();

    cy.get('#summary-for-committee-pdf')
      .closest('.cr-upload-card')
      .contains(/Nessun file selezionato|No file selected/i)
      .should('be.visible');
    cy.get('#final-thesis-pdfa')
      .closest('.cr-upload-card')
      .contains(/Nessun file selezionato|No file selected/i)
      .should('be.visible');
    cy.get('#supplementary-zip')
      .closest('.cr-upload-card')
      .contains(/Nessun file selezionato|No file selected/i)
      .should('be.visible');
    rightActionButton().should('be.disabled');
  });

  it('removes local optional supplementary upload and restores empty state', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: AUTHORIZE_DRAFT,
      submitStatus: 201,
    });
    visitConclusionPage();

    moveToUploadsStepWithAuthorizeFlow();

    attachFile('#supplementary-zip', 'materiale.zip', 'application/zip');
    cy.get('#supplementary-zip').closest('.cr-upload-card').find('.cr-file-name').should('contain', 'materiale.zip');

    cy.get('#supplementary-zip')
      .closest('.cr-upload-card')
      .within(() => {
        cy.get('button[aria-label="Rimuovi file"], button[aria-label="Remove file"]').click({ force: true });
      });

    cy.get('#supplementary-zip')
      .closest('.cr-upload-card')
      .contains(/Nessun file selezionato|No file selected/i)
      .should('be.visible');
  });

  it('submits using already uploaded draft files when no new files are selected', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: DRAFT_WITH_FILES,
      submitStatus: 201,
    });
    visitConclusionPage();

    moveToSubmitStepWithAuthorizeFlow({ attachFreshThesis: false });

    rightActionButton()
      .contains(/Invia richiesta|Send request/i)
      .should('be.enabled')
      .click();
    confirmConclusionSubmit();

    cy.wait('@getDraftThesisBlob').its('response.statusCode').should('eq', 200);
    cy.wait('@getDraftSummaryBlob').its('response.statusCode').should('eq', 200);
    cy.wait('@getDraftAdditionalBlob').its('response.statusCode').should('eq', 200);
    cy.wait('@submitConclusion').its('response.statusCode').should('eq', 201);
    cy.contains(/Richiesta inviata con successo|Request submitted successfully/i).should('be.visible');
  });

  it('normalizes legacy draft payload shapes through details and authorization steps', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: LEGACY_MIXED_DRAFT,
      submitStatus: 201,
    });
    visitConclusionPage();

    cy.get('#title-original').should('have.value', 'Titolo legacy');
    cy.get('#title-translation').should('exist');
    cy.get('#title-translation').should('have.value', '');
    nextStepButton().should('be.disabled');

    cy.get('#title-translation').type('Legacy english title');
    cy.get('#abstract-translation').type('Legacy english abstract');
    nextStepButton().should('be.enabled');

    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();

    cy.get('#authorization-deny').should('be.checked');
    cy.get('input[placeholder*="motivo"], input[placeholder*="reason"]').should(
      'have.value',
      'Motivazione legacy personalizzata',
    );

    cy.get('#authorization-authorize').check({ force: true });
    rightActionButton().should('be.enabled');
    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();

    cy.contains('.cr-file-name', 'legacy-thesis.pdf').should('be.visible');
    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();

    checkDeclarations([1, 2, 3, 4, 5, 6]);
    clickNextStep();
    cy.wait('@saveDraft');
    waitForDraftSaveUiStability();

    rightActionButton()
      .contains(/Invia richiesta|Send request/i)
      .should('be.enabled');
  });

  it('handles non-array draft keywords and sdgs by keeping details step invalid', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: DRAFT_WITH_NON_ARRAY_KEYWORDS_AND_SDGS,
      submitStatus: 201,
    });
    visitConclusionPage();

    cy.get('#title-original').should('have.value', AUTHORIZE_DRAFT.title);
    cy.get('.cr-sdg-sticky-selects .select__single-value').should('not.exist');
    nextStepButton().should('be.disabled');
  });

  it('shows draft save failed toast when manual save trigger fails', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: AUTHORIZE_DRAFT,
      submitStatus: 201,
    });
    cy.intercept('POST', '**/api/thesis-conclusion/draft', {
      statusCode: 500,
      body: { error: 'save failed' },
    }).as('saveDraft');

    visitConclusionPage();
    cy.contains('button', /Salva bozza|Save draft/i)
      .should('be.visible')
      .click({ force: true });
    cy.wait('@saveDraft').its('response.statusCode').should('eq', 500);
    cy.contains(/Salvataggio bozza non riuscito|Failed to save draft/i).should('be.visible');
  });

  it('covers details selectors and submit expand/collapse branches', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: LONG_ITALIAN_DRAFT,
      submitStatus: 201,
    });
    visitConclusionPage();

    cy.get('#title-translation').should('exist');
    cy.get('#abstract-translation').should('exist');

    cy.get('#abstract').clear();
    cy.get('#abstract').type(`Abstract aggiornato ${'E'.repeat(220)}`);

    moveToSubmitStepWithAuthorizeFlow({ attachFreshThesis: true });

    toggleExpandableSummaryBlock(/Titolo originale|Original title/i);
    toggleExpandableSummaryBlock(/Titolo inglese|English title/i);
    toggleExpandableSummaryBlock(/Abstract originale|Original abstract/i);
    toggleExpandableSummaryBlock(/Abstract inglese|English abstract/i);

    rightActionButton()
      .contains(/Invia richiesta|Send request/i)
      .should('be.enabled');
  });

  it('trims long upload filenames and handles local remove reset', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: AUTHORIZE_DRAFT,
      submitStatus: 201,
    });
    visitConclusionPage();

    moveToUploadsStepWithAuthorizeFlow();

    attachFile('#final-thesis-pdfa', 'nomefilemoltolungosenzapunto'.repeat(3), 'application/pdf');
    cy.get('#final-thesis-pdfa')
      .closest('.cr-upload-card')
      .find('.cr-file-name')
      .invoke('text')
      .then(fileName => {
        const trimmed = fileName.trim();
        expect(trimmed.endsWith('...')).to.eq(true);
        expect(trimmed.length).to.eq(50);
      });

    attachFile('#supplementary-zip', `tiny.${'x'.repeat(70)}`, 'application/zip');
    cy.get('#supplementary-zip')
      .closest('.cr-upload-card')
      .find('.cr-file-name')
      .invoke('text')
      .then(fileName => {
        const trimmed = fileName.trim();
        expect(trimmed.startsWith('...')).to.eq(true);
        expect(trimmed.length).to.eq(50);
      });

    attachFile('#final-thesis-pdfa', `${'nomebase'.repeat(12)}.pdf`, 'application/pdf');
    cy.get('#final-thesis-pdfa')
      .closest('.cr-upload-card')
      .find('.cr-file-name')
      .invoke('text')
      .then(fileName => {
        const trimmed = fileName.trim();
        expect(trimmed.endsWith('...pdf')).to.eq(true);
        expect(trimmed.length).to.eq(50);
      });

    cy.get('#final-thesis-pdfa')
      .closest('.cr-upload-card')
      .within(() => {
        cy.get('button[aria-label="Rimuovi file"], button[aria-label="Remove file"]').click({ force: true });
      });
    cy.get('#final-thesis-pdfa')
      .closest('.cr-upload-card')
      .contains(/Nessun file selezionato|No file selected/i)
      .should('exist');
  });

  it('removes both local and draft thesis file when a replacement is deleted', () => {
    stubConclusionPageApis({
      thesisStatus: 'ongoing',
      requiredSummary: false,
      draft: DRAFT_WITH_FILES,
      submitStatus: 201,
    });
    visitConclusionPage();

    moveToUploadsStepWithAuthorizeFlow();
    attachPdf('#final-thesis-pdfa', 'tesi-locale.pdf');

    cy.get('#final-thesis-pdfa').closest('.cr-upload-card').find('.cr-file-name').should('contain', 'tesi-locale.pdf');

    cy.get('#final-thesis-pdfa')
      .closest('.cr-upload-card')
      .within(() => {
        cy.get('button[aria-label="Rimuovi file"], button[aria-label="Remove file"]').click({ force: true });
      });

    cy.get('#final-thesis-pdfa')
      .closest('.cr-upload-card')
      .contains(/Nessun file selezionato|No file selected/i)
      .should('be.visible');
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
