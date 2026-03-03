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

const PROPOSAL_ID = 12345;

const BASE_PROPOSAL = {
  id: PROPOSAL_ID,
  topic: 'Proposta tesi su sistemi intelligenti',
  description: 'Descrizione della proposta',
  link: 'https://example.com/thesis-link',
  requiredSkills: 'JavaScript, React',
  additionalNotes: 'Note aggiuntive',
  supervisor: {
    id: 38485,
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'mario.rossi@polito.it',
  },
  internalCoSupervisors: [
    {
      id: 3019,
      firstName: 'Giulia',
      lastName: 'Bianchi',
      email: 'giulia.bianchi@polito.it',
    },
  ],
  externalCoSupervisors: 'Ing. Verdi, azienda partner',
  creationDate: '2026-01-01T08:00:00',
  expirationDate: '2026-12-31T23:59:59',
  isInternal: true,
  isAbroad: false,
  attachmentUrl: 'allegato.pdf',
  keywords: [
    { id: 1, keyword: 'AI' },
    { id: 2, keyword: 'ML' },
  ],
  types: [{ id: 1, type: 'Ricerca' }],
  company: {
    id: 1,
    corporateName: 'Reply S.p.A.',
  },
};

const setStableUiPreferences = win => {
  win.localStorage.setItem('language', 'it');
  win.localStorage.setItem('theme', 'light');
};

const stubAppShell = () => {
  cy.intercept('GET', '**/api/students', ALL_STUDENTS).as('getStudents');
  cy.intercept('GET', '**/api/students/logged-student', LOGGED_STUDENT).as('getLoggedStudent');
};

const stubProposalDetailApis = ({ eligible = true, available = true, submitStatus = 201, proposalStatus = 200 }) => {
  cy.intercept(
    {
      method: 'GET',
      url: /\/api\/thesis-proposals\/\d+(\?.*)?$/,
    },
    req => {
      req.reply({
        statusCode: proposalStatus,
        body: proposalStatus >= 400 ? { error: 'proposal not found' } : BASE_PROPOSAL,
      });
    },
  ).as('getProposalById');

  cy.intercept(
    {
      method: 'GET',
      url: /\/api\/thesis-proposals\/\d+\/availability(\?.*)?$/,
    },
    { available },
  ).as('getProposalAvailability');

  cy.intercept('GET', '**/api/thesis-applications/eligibility*', { eligible }).as('getEligibility');

  cy.intercept('POST', '**/api/thesis-applications', {
    statusCode: submitStatus,
    body: submitStatus >= 400 ? { error: 'submit failed' } : { id: 950 },
  }).as('createThesisApplication');
};

const visitProposalDetailPage = proposalId => {
  cy.visit(`/carriera/tesi/proposta_di_tesi/${proposalId}`, {
    onBeforeLoad: setStableUiPreferences,
  });
  cy.wait(['@getStudents', '@getLoggedStudent', '@getProposalById']);
};

describe('Thesis proposal detail - application flows', () => {
  it('submits application successfully from proposal detail page', () => {
    stubAppShell();
    stubProposalDetailApis({ eligible: true, available: true, submitStatus: 201, proposalStatus: 200 });
    visitProposalDetailPage(PROPOSAL_ID);
    cy.wait(['@getEligibility', '@getProposalAvailability']);

    cy.contains('button', /Candidatura|Apply/i)
      .should('be.enabled')
      .click();
    cy.get('.modal.show')
      .contains('button', /Invia|Apply|Prosegui|Proceed/i)
      .click();

    cy.wait('@createThesisApplication')
      .its('request.body')
      .should(body => {
        expect(body.thesisProposal.id).to.eq(PROPOSAL_ID);
        expect(body.topic).to.contain(BASE_PROPOSAL.topic);
      });

    cy.contains(/Richiesta inviata con successo|Request submitted successfully/i).should('be.visible');
  });

  it('shows error toast when application submission fails from proposal detail', () => {
    stubAppShell();
    stubProposalDetailApis({ eligible: true, available: true, submitStatus: 500, proposalStatus: 200 });
    visitProposalDetailPage(PROPOSAL_ID);
    cy.wait(['@getEligibility', '@getProposalAvailability']);

    cy.contains('button', /Candidatura|Apply/i)
      .should('be.enabled')
      .click();
    cy.get('.modal.show')
      .contains('button', /Invia|Apply|Prosegui|Proceed/i)
      .click();

    cy.wait('@createThesisApplication').its('response.statusCode').should('eq', 500);
    cy.contains(/Errore durante l'invio della richiesta|Error while submitting the request/i).should('be.visible');
  });

  it('disables application button when proposal is unavailable', () => {
    stubAppShell();
    stubProposalDetailApis({ eligible: true, available: false, submitStatus: 201, proposalStatus: 200 });
    visitProposalDetailPage(PROPOSAL_ID);
    cy.wait(['@getEligibility', '@getProposalAvailability']);

    cy.contains('button', /Candidatura|Apply/i).should('be.disabled');
  });

  it('renders fallback error badge when proposal load fails', () => {
    stubAppShell();
    stubProposalDetailApis({ eligible: false, available: false, submitStatus: 201, proposalStatus: 500 });
    visitProposalDetailPage(99999);

    cy.contains(/Errore durante il rendering della proposta di tesi|Error loading thesis proposal/i).should(
      'be.visible',
    );
  });
});
