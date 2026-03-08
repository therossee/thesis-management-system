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

const setStableUiPreferences = win => {
  win.localStorage.setItem('language', 'it');
  win.localStorage.setItem('theme', 'light');
};

const stubAppShell = () => {
  cy.intercept('GET', '**/api/students', ALL_STUDENTS).as('getStudents');
  cy.intercept('GET', '**/api/students/logged-student*', LOGGED_STUDENT).as('getLoggedStudent');
};

describe('General UI Tests', () => {
  it('covers Searchbar desktop behaviors and BaseCard favorite toggle', () => {
    stubAppShell();
    cy.visit('/', { onBeforeLoad: setStableUiPreferences });
    cy.wait(['@getStudents', '@getLoggedStudent']);

    cy.get('input[aria-label="Search"]:visible').first().type('car');
    cy.get('.custom-list-group').should('be.visible');
    cy.contains('.custom-list-group-item', /Carriera/i).click();
    cy.url().should('include', '/carriera');

    cy.get('input[aria-label="Search"]:visible').first().type('help');
    cy.get('.custom-list-group').should('be.visible');
    cy.get('body').click(0, 0, { force: true });
    cy.get('.custom-list-group').should('not.exist');
    cy.get('input[aria-label="Search"]:visible').first().should('have.value', '');

    cy.get('.roundCard', { timeout: 10000 }).should('have.length.greaterThan', 0);
    cy.get('.roundCard').first().as('firstCard');
    cy.get('@firstCard').find('.star, .star-fill').should('have.length.greaterThan', 0);

    cy.get('@firstCard').then($card => {
      const activeSelector = $card.find('.star-fill').length > 0 ? '.star-fill' : '.star';
      cy.wrap($card).find(activeSelector).first().click({ force: true });
    });

    cy.get('@firstCard').then($card => {
      const activeSelector = $card.find('.star-fill').length > 0 ? '.star-fill' : '.star';
      cy.wrap($card).find(activeSelector).first().click({ force: true });
    });

    cy.get('@firstCard').find('.star, .star-fill').should('have.length.greaterThan', 0);
  });

  it('covers Searchbar mobile branch with sidebar modal close on selection', () => {
    stubAppShell();
    cy.viewport(390, 844);
    cy.visit('/', { onBeforeLoad: setStableUiPreferences });
    cy.wait(['@getStudents', '@getLoggedStudent']);

    cy.get('.sidebar-modal-toggler').click();
    cy.get('.modal.show').should('be.visible');
    cy.get('.modal.show').find('input[aria-label="Search"]').type('help');
    cy.contains('.modal.show .custom-list-group-item', /^Help$/i).click();

    cy.url().should('include', '/help');
    cy.get('.modal.show').should('not.exist');
  });

  it('covers PillButtonGroup tab switching in thesis page', () => {
    stubAppShell();
    cy.intercept('GET', '**/api/thesis-applications', {
      id: 500,
      topic: 'Richiesta pending',
      status: 'pending',
      supervisor: { id: 1, firstName: 'Mario', lastName: 'Rossi' },
      coSupervisors: [],
      submissionDate: '2026-03-01T09:00:00',
    }).as('getLastApplication');
    cy.intercept('GET', '**/api/thesis-applications/eligibility*', { eligible: true }).as('getEligibility');
    cy.intercept('GET', '**/api/thesis-conclusion/deadlines*', {
      graduationSession: { id: 1, sessionName: 'Marzo/Aprile 2026', sessionNameEn: 'March/April 2026' },
      deadlines: [{ deadlineType: 'thesis_request', deadlineDate: '2026-03-30T23:59:59', graduationSessionId: 1 }],
    }).as('getDeadlines');
    cy.intercept('GET', '**/api/thesis-proposals/targeted*', {
      thesisProposals: [],
      count: 0,
      totalPages: 0,
    }).as('getTargetedProposals');
    cy.intercept('GET', '**/api/thesis-proposals*', {
      thesisProposals: [],
      count: 0,
      totalPages: 0,
    }).as('getAllProposals');

    cy.visit('/carriera/tesi', { onBeforeLoad: setStableUiPreferences });
    cy.wait(['@getStudents', '@getLoggedStudent', '@getLastApplication', '@getEligibility', '@getDeadlines']);

    cy.contains('.pill-button-light', /Proposte di tesi|Thesis proposals/i).click();
    cy.wait('@getTargetedProposals');
    cy.url().should('include', '/carriera/tesi/proposte_di_tesi');
    cy.contains('.pill-button-light.active', /Proposte di tesi|Thesis proposals/i).should('exist');
  });

  it('covers CustomBadge application-status branches in /servizi/test page', () => {
    stubAppShell();
    cy.intercept('GET', '**/api/thesis-applications/all*', [
      { id: 1, status: 'pending', student: LOGGED_STUDENT, supervisor: { firstName: 'Mario', lastName: 'Rossi' } },
      { id: 2, status: 'approved', student: LOGGED_STUDENT, supervisor: { firstName: 'Mario', lastName: 'Rossi' } },
      { id: 3, status: 'rejected', student: LOGGED_STUDENT, supervisor: { firstName: 'Mario', lastName: 'Rossi' } },
      { id: 4, status: 'cancelled', student: LOGGED_STUDENT, supervisor: { firstName: 'Mario', lastName: 'Rossi' } },
      { id: 5, status: 'mystery', student: LOGGED_STUDENT, supervisor: { firstName: 'Mario', lastName: 'Rossi' } },
    ]).as('getAllApplications');
    cy.intercept('GET', '**/api/thesis/all*', [{ id: 701, student_id: LOGGED_STUDENT.id, status: 'mystery' }]).as(
      'getAllTheses',
    );

    cy.visit('/servizi/test', { onBeforeLoad: setStableUiPreferences });
    cy.wait(['@getStudents', '@getLoggedStudent', '@getAllApplications', '@getAllTheses']);
    cy.contains(/Application ID:\s*1/i, { timeout: 10000 }).should('be.visible');
    cy.contains(/Thesis ID:\s*701/i, { timeout: 10000 }).should('be.visible');

    cy.contains(/Candidatura inviata|Application under review|In valutazione|PENDING/i).should('be.visible');
    cy.contains(/Candidatura approvata|Application approved|Approvata/i).should('be.visible');
    cy.contains(/Candidatura respinta|Application rejected|Rifiutata/i).should('be.visible');
    cy.contains(/Candidatura ritirata|Application withdrawn|Cancellata/i).should('be.visible');
    cy.contains(/Badge non valid|Invalid badge/i).should('be.visible');
  });
});
