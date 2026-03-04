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

const TEST_APPLICATION = {
  id: 200,
  topic: 'Richiesta tesi da dashboard test',
  status: 'pending',
  submissionDate: '2026-02-10T09:00:00',
  student: { id: LOGGED_STUDENT.id, firstName: LOGGED_STUDENT.firstName, lastName: LOGGED_STUDENT.lastName },
  supervisor: { id: 38485, firstName: 'Mario', lastName: 'Rossi' },
  coSupervisors: [],
};

const TEST_THESIS = {
  id: 701,
  student_id: LOGGED_STUDENT.id,
  status: 'conclusion_approved',
};

const setStableUiPreferences = win => {
  win.localStorage.setItem('language', 'it');
  win.localStorage.setItem('theme', 'light');
};

const stubShellApis = () => {
  cy.intercept('GET', '**/api/students', ALL_STUDENTS).as('getStudents');
  cy.intercept('GET', '**/api/students/logged-student*', LOGGED_STUDENT).as('getLoggedStudent');
};

const closeAnyBlockingModal = () => {
  cy.get('body').then($body => {
    const blockingModal = $body.find('.modal.show:visible').last();
    if (blockingModal.length > 0) {
      const closeIconButton = blockingModal.find('button.btn-close, button[aria-label="Close"]').first();
      if (closeIconButton.length > 0) {
        cy.wrap(closeIconButton).click({ force: true });
        return;
      }

      const dismissButton = blockingModal.find('[data-bs-dismiss="modal"]').first();
      if (dismissButton.length > 0) {
        cy.wrap(dismissButton).click({ force: true });
        return;
      }

      const anyButton = blockingModal.find('button').first();
      if (anyButton.length > 0) {
        cy.wrap(anyButton).click({ force: true });
        return;
      }

      cy.get('body').type('{esc}', { force: true });
    }
  });
};

describe('API coverage flows (without unit tests)', () => {
  it('calls admin test APIs for applications and thesis status updates', () => {
    stubShellApis();
    cy.intercept('GET', '**/api/thesis-applications/all*', [TEST_APPLICATION]).as('getAllApplications');
    cy.intercept('GET', '**/api/thesis/all*', [TEST_THESIS]).as('getAllTheses');
    cy.intercept('PUT', '**/api/test/thesis-application', { statusCode: 200, body: { ok: true } }).as(
      'updateApplicationStatus',
    );
    cy.intercept('PUT', '**/api/test/thesis-conclusion', {
      statusCode: 200,
      body: { ...TEST_THESIS, status: 'almalaurea' },
    }).as('updateConclusionStatus');

    cy.visit('/servizi/test', { onBeforeLoad: setStableUiPreferences });
    cy.wait(['@getStudents', '@getLoggedStudent', '@getAllApplications', '@getAllTheses']);

    cy.contains('Application ID: 200')
      .closest('.card')
      .within(() => {
        cy.contains('button', /Approve/i).click({ force: true });
      });
    cy.get('.modal.show')
      .last()
      .contains('button', /Conferma|Confirm/i)
      .click({ force: true });
    cy.wait('@updateApplicationStatus')
      .its('request.body')
      .should('deep.include', { id: 200, old_status: 'pending', new_status: 'approved' });
    cy.wait('@getAllApplications');
    cy.wait('@getAllTheses');
    closeAnyBlockingModal();

    cy.contains('Thesis ID: 701')
      .closest('.card')
      .within(() => {
        cy.contains('button', /AlmaLaurea/i).click({ force: true });
      });
    cy.get('.modal.show')
      .last()
      .contains('button', /Conferma|Confirm/i)
      .click({ force: true });
    cy.wait('@updateConclusionStatus')
      .its('request.body')
      .should('deep.include', { thesisId: 701, conclusionStatus: 'almalaurea' });
  });

  it('covers admin fetch and update error branches in API layer', () => {
    stubShellApis();
    cy.intercept('GET', '**/api/thesis-applications/all*', { statusCode: 500, body: { error: 'fetch failed' } }).as(
      'getAllApplicationsError',
    );
    cy.intercept('GET', '**/api/thesis/all*', { statusCode: 500, body: { error: 'fetch failed' } }).as(
      'getAllThesesError',
    );

    cy.visit('/servizi/test', { onBeforeLoad: setStableUiPreferences });
    cy.wait(['@getStudents', '@getLoggedStudent', '@getAllApplicationsError', '@getAllThesesError']);
    cy.contains(/Application ID:/).should('not.exist');
    cy.contains(/Thesis ID:/).should('not.exist');

    cy.intercept('GET', '**/api/thesis-applications/all*', [TEST_APPLICATION]).as('getAllApplicationsOk');
    cy.intercept('GET', '**/api/thesis/all*', [TEST_THESIS]).as('getAllThesesOk');
    cy.intercept('PUT', '**/api/test/thesis-application', { statusCode: 500, body: { error: 'update failed' } }).as(
      'updateApplicationStatusError',
    );
    cy.intercept('PUT', '**/api/test/thesis-conclusion', { statusCode: 500, body: { error: 'update failed' } }).as(
      'updateConclusionStatusError',
    );

    cy.reload();
    cy.wait(['@getAllApplicationsOk', '@getAllThesesOk']);

    cy.contains('Application ID: 200')
      .closest('.card')
      .within(() => {
        cy.contains('button', /Approve/i).click({ force: true });
      });
    cy.get('.modal.show')
      .last()
      .contains('button', /Conferma|Confirm/i)
      .click({ force: true });
    cy.wait('@updateApplicationStatusError').its('response.statusCode').should('eq', 500);
    cy.wait('@getAllApplicationsOk');
    cy.wait('@getAllThesesOk');
    closeAnyBlockingModal();

    cy.contains('Thesis ID: 701')
      .closest('.card')
      .within(() => {
        cy.contains('button', /AlmaLaurea/i).click({ force: true });
      });
    cy.get('.modal.show')
      .last()
      .contains('button', /Conferma|Confirm/i)
      .click({ force: true });
    cy.wait('@updateConclusionStatusError').its('response.statusCode').should('eq', 500);
  });

  it('calls updateLoggedStudent from navbar in success and error cases', () => {
    let currentLoggedStudent = LOGGED_STUDENT;
    let updateCalls = 0;

    cy.intercept('GET', '**/api/students', ALL_STUDENTS).as('getStudents');
    cy.intercept('GET', '**/api/students/logged-student', req => {
      req.reply(currentLoggedStudent);
    }).as('getLoggedStudent');

    cy.intercept('PUT', '**/api/students/logged-student', req => {
      updateCalls += 1;
      if (updateCalls === 1) {
        currentLoggedStudent = SECOND_STUDENT;
        req.reply({ statusCode: 200, body: { ok: true } });
        return;
      }
      currentLoggedStudent = LOGGED_STUDENT;
      req.reply({ statusCode: 500, body: { error: 'update failed' } });
    }).as('updateLoggedStudent');

    cy.visit('/', { onBeforeLoad: setStableUiPreferences });
    cy.wait(['@getStudents', '@getLoggedStudent']);

    cy.get('#dropdown-icon').click();
    cy.contains('.dropdown-menu.show .dropdown-item', /Luca Barbato/i).click({ force: true });

    cy.wait('@updateLoggedStudent').its('request.body').should('deep.equal', { student_id: SECOND_STUDENT.id });

    cy.wait('@getLoggedStudent');
    cy.get('#dropdown-icon').click();
    cy.contains('.dropdown-menu.show .dropdown-item', /Daniele De Rossi/i).click({ force: true });
    cy.wait('@updateLoggedStudent').its('response.statusCode').should('eq', 500);
  });
});
