/// <reference types="cypress" />

describe('Thesis proposal details page', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
    cy.viewport(1920, 1080);
  });

  it('should navigate from the thesis proposals page to the thesis proposal details page', () => {
    // Step 1: Navigate to the thesis proposals page
    cy.get('a[href="/carriera"]').should('be.visible').click();

    // Step 2: Click on the first thesis proposal
    cy.visit('/carriera/tesi/proposte_di_tesi');
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);
    cy.get('.roundCard .card-footer .btn').first().click();

    // Step 3: Check the page breadcrumb
    cy.get('.breadcrumb-item').should('have.length', 3);
    cy.get('.breadcrumb-item').eq(0).should('contain', 'Carriera');
    cy.get('.breadcrumb-item').eq(1).should('contain', 'Tesi');
    cy.get('.breadcrumb-item')
      .eq(2)
      .invoke('text')
      .should('match', /Dettagli proposta|Proposal details/i);

    // Step 4 Click on the breadcrumb of the thesis proposals details page
    cy.get('.breadcrumb-item').contains('Dettagli proposta').click();

    // Step 5: Click on the breadcrumb of the thesis proposals page
    cy.get('.breadcrumb-item').contains('Tesi').click();

    // Step 6: Check the page breadcrumb
    cy.get('.breadcrumb-item').should('have.length', 2);
    cy.get('.breadcrumb-item').eq(0).should('contain', 'Carriera');
    cy.get('.breadcrumb-item').eq(1).should('contain', 'Tesi');
  });

  it('should see thesis proposal details page (not abroad)', () => {
    // Step 1: Navigate to the thesis proposals page
    cy.get('a[href="/carriera"]').should('be.visible').click();
    cy.visit('/carriera/tesi/proposte_di_tesi');

    // Step 2: Click on the first available thesis proposal
    cy.get('.proposals-container .card-container .roundCard')
      .should('have.length.greaterThan', 0)
      .first()
      .find('.card-footer .btn')
      .click();

    // Step 3: Check the page breadcrumb
    cy.get('.breadcrumb-item').should('have.length', 3);
    cy.get('.breadcrumb-item').eq(0).should('contain', 'Carriera');
    cy.get('.breadcrumb-item').eq(1).should('contain', 'Tesi');
    cy.get('.breadcrumb-item')
      .eq(2)
      .invoke('text')
      .should('match', /Dettagli proposta|Proposal details/i);

    // Step 4: Reduce sidebar
    cy.get(
      '#root > div > div.custom-sidebar.py-2.d-none.d-sm-block.reduced.col-lg-1.col-md-1 > div > div.d-none.d-lg-block.nav-item > a',
    ).click();

    // Step 5: Check the thesis proposal details
    cy.get('h3.thesis-topic').should('be.visible');
    cy.get('.info-detail').should('be.visible');
    cy.get('.badge[class*="teacher_"]').should('be.visible');
    cy.contains('.badge', /tesi in italia|italy thesis/i).should('be.visible');
  });

  it('should see thesis proposal details page (abroad)', () => {
    cy.visit('http://localhost:3000/carriera/tesi/proposta_di_tesi/3593');

    // Step 1: Check the page breadcrumb
    cy.get('.breadcrumb-item').should('have.length', 3);
    cy.get('.breadcrumb-item').eq(0).should('contain', 'Carriera');
    cy.get('.breadcrumb-item').eq(1).should('contain', 'Tesi');
    cy.get('.breadcrumb-item').eq(2).should('contain', 'Dettagli proposta');

    // Step 2: Check the thesis proposal details
    cy.get('h3.thesis-topic').should('be.visible');
    cy.get('.info-detail').should('be.visible');
    cy.get('.badge[class*="teacher_"]').should('be.visible');
    cy.get('.fa-earth-americas').should('be.visible');
    cy.contains('.badge', /tesi all'estero|abroad thesis/i).should('be.visible');
  });

  it('should see thesis proposal details page with attachment if present', () => {
    cy.visit('http://localhost:3000/carriera/tesi/proposta_di_tesi/13923');

    // Step 1: Check the page breadcrumb
    cy.get('.breadcrumb-item').should('have.length', 3);
    cy.get('.breadcrumb-item').eq(0).should('contain', 'Carriera');
    cy.get('.breadcrumb-item').eq(1).should('contain', 'Tesi');
    cy.get('.breadcrumb-item').eq(2).should('contain', 'Dettagli proposta');

    // Step 2: Check the thesis proposal details
    cy.get('h3.thesis-topic').should('be.visible');
    cy.get('.info-detail').should('be.visible');
    cy.get('.badge[class*="teacher_"]').should('be.visible');
    cy.get('.title-container').contains('Allegato').should('be.visible');
  });

  it('should see expired thesis proposal details page', () => {
    cy.visit('http://localhost:3000/carriera/tesi/proposta_di_tesi/13356');

    // Step 1: Check the page breadcrumb
    cy.get('.breadcrumb-item').should('have.length', 3);
    cy.get('.breadcrumb-item').eq(0).should('contain', 'Carriera');
    cy.get('.breadcrumb-item').eq(1).should('contain', 'Tesi');
    cy.get('.breadcrumb-item').eq(2).should('contain', 'Dettagli proposta');

    // Step 2: Check the thesis proposal details
    cy.get('h3.thesis-topic').should('be.visible');
    cy.get('.info-detail').should('be.visible');
    cy.get('.badge[class*="teacher_"]').should('be.visible');

    // Step 3: Check the expired badge
    cy.contains('.badge', 'Scaduta').should('be.visible');
  });
});

describe('Thesis proposal details page - responsiveness', () => {
  beforeEach(() => {
    // Reduce the viewport to mobile sizes
    cy.viewport('iphone-x');
    cy.visit('http://localhost:3000');
  });

  it('should see thesis proposal details page on mobile', () => {
    // Step 1: open the sidebar modal
    cy.get('.sidebar-modal-toggler').click();

    // Step 2: Navigate to the thesis proposals page
    cy.get('.modal-menu a[href="/carriera"]').should('be.visible').click();
    cy.visit('/carriera/tesi/proposte_di_tesi');

    // Step 3: Click on the first thesis proposal
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);
    cy.get('.roundCard .card-footer .btn').first().click();

    // Step 4: Check navigation to details page (breadcrumb can be hidden on mobile)
    cy.url().should('include', '/carriera/tesi/proposta_di_tesi/');

    // Step 5: Check the thesis proposal details
    cy.get('h3.thesis-topic').should('be.visible');
    cy.get('.info-detail').should('be.visible');
    cy.get('.badge[class*="teacher_"]').should('be.visible');

    // Step 6: Check the responsiveness
    cy.viewport('iphone-6');
    cy.get('h3.thesis-topic').should('be.visible');
    cy.get('.info-detail').should('be.visible');
    cy.get('.badge[class*="teacher_"]').should('be.visible');

    // Step 7: Go back to thesis proposals list using CustomHeader back button
    cy.get('button').filter(':has(svg)').first().click();
    cy.url().should('include', '/carriera/tesi/proposte_di_tesi');
  });
});
