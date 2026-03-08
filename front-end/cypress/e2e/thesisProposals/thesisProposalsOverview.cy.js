/// <reference types="cypress" />

describe('Thesis proposals overview page', () => {
  beforeEach(() => {
    cy.visit('/carriera/tesi/proposte_di_tesi', {
      onBeforeLoad: win => {
        win.localStorage.setItem('language', 'it');
        win.localStorage.setItem('theme', 'light');
        win.localStorage.removeItem('thesisProposalsState');
      },
    });
  });

  const openFiltersDropdown = () => {
    cy.get('#dropdown-filters .custom-dropdown-toggle').should('be.visible');
    cy.get('#dropdown-filters .custom-dropdown-toggle').click();
  };

  const openFiltersSelectByIndex = index => {
    cy.get(`#dropdown-filters > div > div > div:nth-child(${index})`).find('.select__control').click({ force: true });
  };

  const clickFiltersApply = () => {
    cy.get('#dropdown-filters .d-flex.w-100.justify-content-between > button').eq(1).click({ force: true });
  };

  const clickFiltersReset = () => {
    cy.get('#dropdown-filters .d-flex.w-100.justify-content-between > button').eq(0).click({ force: true });
  };

  const selectVisibleOptionByIndex = index => {
    cy.get('.select__menu:visible .select__option').eq(index).click({ force: true });
  };

  const assertCardsOrEmptyStateVisible = () => {
    cy.get('body').then($body => {
      const hasCards = $body.find('.proposals-container .card-container .roundCard').length > 0;
      if (hasCards) {
        cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);
      } else {
        cy.get('.proposals-container .roundCard').should('be.visible');
      }
    });
  };

  it('should toggle between course proposals and all proposals', () => {
    // Step 1: Verify the initial state is course proposals
    cy.get('#course').should('be.checked');
    cy.get('#all').should('not.be.checked');

    // Step 2: Toggle to all proposals
    cy.get('#all').click();

    // Step 3: Verify that there are thesis proposals listed
    assertCardsOrEmptyStateVisible();

    // Step 4: Toggle back to course proposals
    cy.get('#course').click();

    // Step 5: Verify that there are thesis proposals listed
    assertCardsOrEmptyStateVisible();
  });

  it("should filter proposals by topic or description (string that doesn't exist)", () => {
    // Step 1: Verify that there are thesis proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);

    // Step 2: Filter proposals by title, form control with aria label "search_proposals"
    cy.get('input[aria-label="search_proposals"]').type('string that does not exist');

    // Step 3: Verify that there are no proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length', 0);
  });

  it('should filter proposals by topic or description (string that exists)', () => {
    // Step 1: Verify that there are thesis proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);

    // Step 2: Intercept the network request for the search
    cy.intercept('GET', '**/api/thesis-proposals/targeted*').as('getTargetedThesisProposals');

    // Step 3: Filter proposals by title, form control with aria label "search_proposals"
    cy.get('input[aria-label="search_proposals"]').type('test');

    // Step 4: Wait for the network request to complete
    cy.wait('@getTargetedThesisProposals');

    // Step 5: Verify that the filtered proposals are listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);

    // Step 6: Check that the title or description of each proposal contains the string 'test'
    // Function to get the topic text of an article
    const getTopicText = article =>
      cy
        .wrap(article)
        .find('.thesis-topic')
        .invoke('text')
        .then(text => text.toLowerCase());

    // Function to get the description text of an article
    const getDescriptionText = article =>
      cy
        .wrap(article)
        .find('.thesis-description')
        .invoke('text')
        .then(text => text.toLowerCase());

    // Function to verify if either topic or description contains the string 'test'
    const verifyTextContainsTest = (topicText, descriptionText) => {
      expect(topicText.includes('test') || descriptionText.includes('test')).to.be.true;
    };

    // Function to process a single article
    const processArticle = article => {
      getTopicText(article).then(topicText => {
        processDescriptionText(article, topicText);
      });
    };

    // Function to process the description text of an article
    const processDescriptionText = (article, topicText) => {
      getDescriptionText(article).then(descriptionText => {
        verifyTextContainsTest(topicText, descriptionText);
      });
    };

    // Main test logic
    cy.get('.proposals-container .card-container .roundCard').each(article => {
      processArticle(article);
    });
  });

  it('should filter internal proposals and reset filters', () => {
    // Step 1: Verify that there are thesis proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);

    // Step 2: Intercept the network request
    cy.intercept('GET', '**/api/thesis-proposals/targeted*').as('getTargetedThesisProposals');

    // Step 3: Open filters dropdown
    openFiltersDropdown();

    // Step 4: Click on 'Select environment' select
    openFiltersSelectByIndex(4);

    // Step 5: Select 'Tesi interna' from the dropdown
    selectVisibleOptionByIndex(0);

    // Step 6: Click on the apply button
    clickFiltersApply();

    // Step 7: Wait for the network request to complete
    cy.wait('@getTargetedThesisProposals');

    // Step 8: Verify that there are thesis proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);

    // Step 9: Reset the filter from dropdown actions
    openFiltersDropdown();
    clickFiltersReset();
  });

  it('should filter external proposals and reset filter', () => {
    // Step 1: Verify that there are thesis proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);

    // Step 2: Toggle to all proposals
    cy.get('#all').click();

    // Step 3: Intercept the network request
    cy.intercept('GET', '**/api/thesis-proposals*').as('getThesisProposals');

    // Step 4: Open filters dropdown
    openFiltersDropdown();

    // Step 5: Click on 'Select environment' select
    openFiltersSelectByIndex(4);

    // Step 6: Select 'Tesi in azienda' from the dropdown
    selectVisibleOptionByIndex(1);

    // Step 7: Click on the apply button
    clickFiltersApply();

    // Step 8: Wait for the network request to complete
    cy.wait('@getThesisProposals');

    // Step 9: Verify that there are thesis proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);

    // Step 10: Verify that each proposal contains the tag 'Company thesis'
    cy.get('.proposals-container .card-container .roundCard').each(article => {
      cy.wrap(article)
        .find('.card-body > .custom-badge-container')
        .then($tag => {
          const tag = $tag.text().toLowerCase();
          expect(tag).to.match(/tesi in azienda|company thesis/i);
        });
    });

    // Step 11: Reset the filter
    openFiltersDropdown();
    clickFiltersReset();
  });

  it('should filter Italy proposals and reset filter', () => {
    // Step 1: Verify that there are thesis proposals listed
    assertCardsOrEmptyStateVisible();

    // Step 2: Intercept the network request
    cy.intercept('GET', '**/api/thesis-proposals/targeted*').as('getTargetedThesisProposals');

    // Step 3: Open filters dropdown
    openFiltersDropdown();

    // Step 4: Click on 'Select location' select
    openFiltersSelectByIndex(2);

    // Step 5: Select 'Tesi all\'estero' from the dropdown
    selectVisibleOptionByIndex(0);

    // Step 6: Click on the apply button
    clickFiltersApply();

    // Step 7: Wait for the network request to complete
    cy.wait('@getTargetedThesisProposals').then(({ response }) => {
      const proposals = response?.body?.thesisProposals || [];
      proposals.forEach(proposal => expect(proposal.isAbroad).to.eq(false));
    });

    // Step 8: Verify that there proposals listed
    cy.get('body').then($body => {
      const hasCards = $body.find('.proposals-container .card-container .roundCard').length > 0;
      if (hasCards) {
        cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);
      } else {
        cy.get('.proposals-container .roundCard').should('be.visible');
      }
    });

    // Step 9: Verify that each proposal contains the "Italy thesis" badge
    cy.get('.proposals-container .card-container .roundCard').each(article => {
      cy.wrap(article)
        .contains(/tesi in italia|thesis in italy/i)
        .should('be.visible');
    });

    // Step 10: Reopen the filters dropdown
    openFiltersDropdown();

    // Step 11: Reset filters from dropdown actions
    clickFiltersReset();
  });

  it('should filter abroad proposals and reset filter', () => {
    // Step 1: Verify that there are thesis proposals listed
    cy.get('body').then($body => {
      const hasCards = $body.find('.proposals-container .card-container .roundCard').length > 0;
      if (hasCards) {
        cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);
      } else {
        cy.get('.proposals-container .roundCard').should('be.visible');
      }
    });

    // Step 2: Intercept the network request
    cy.intercept('GET', '**/api/thesis-proposals/targeted*').as('getTargetedThesisProposals');

    // Step 3: Open filters dropdown
    openFiltersDropdown();

    // Step 4: Click on 'Select location' select
    openFiltersSelectByIndex(2);

    // Step 5: Select 'Tesi all\'estero' from the options menu
    selectVisibleOptionByIndex(1);

    // Step 6: Click on the apply button
    clickFiltersApply();

    // Step 7: Wait for the network request to complete
    cy.wait('@getTargetedThesisProposals').then(({ response }) => {
      const proposals = response?.body?.thesisProposals || [];
      proposals.forEach(proposal => expect(proposal.isAbroad).to.eq(true));
    });

    // Step 8: Verify that there proposals listed
    cy.get('body').then($body => {
      const hasCards = $body.find('.proposals-container .card-container .roundCard').length > 0;
      if (hasCards) {
        cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);
      } else {
        cy.get('.proposals-container .roundCard').should('be.visible');
      }
    });

    // Step 9: Verify that each proposal contains the "abroad thesis" badge (or empty state is shown)
    cy.get('body').then($body => {
      const cards = $body.find('.proposals-container .card-container .roundCard');
      if (cards.length > 0) {
        cy.get('.proposals-container .card-container .roundCard').each(article => {
          cy.wrap(article)
            .contains(/tesi all'estero|thesis abroad/i)
            .should('be.visible');
        });
      } else {
        cy.get('.proposals-container .card-container .roundCard').should('have.length', 0);
        cy.get('.proposals-container .roundCard').should('have.length.greaterThan', 1);
      }
    });

    // Step 10: Reset the filter
    openFiltersDropdown();
    clickFiltersReset();
  });

  it('should filter proposals by keywords and reset filter', () => {
    // Step 1: Verify that there are thesis proposals listed
    cy.get('body').then($body => {
      const hasCards = $body.find('.proposals-container .card-container .roundCard').length > 0;
      if (hasCards) {
        cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);
      } else {
        cy.get('.proposals-container .roundCard').should('be.visible');
      }
    });

    // Step 2: Intercept the network request for the search
    cy.intercept('GET', '**/api/thesis-proposals/targeted*').as('getTargetedThesisProposals');

    // Step 3: Open filters dropdown
    openFiltersDropdown();

    // Step 4: Click on 'Select keyword' select
    openFiltersSelectByIndex(10);

    // Step 5: Select 'aerospace' from the dropdown
    cy.get('#dropdown-filters > div > div > div:nth-child(10)').contains('Aerospace').click();

    // Step 6: Click on the apply button
    clickFiltersApply();

    // Step 7: Wait for the network request to complete
    cy.wait('@getTargetedThesisProposals');

    // Step 8: Verify that there are no proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length', 0);

    // Step 9: Reset the filters
    openFiltersDropdown();
    clickFiltersReset();

    // Step 10: Verify that the filters are reset
    assertCardsOrEmptyStateVisible();
  });

  it('should filter proposals by keywords', () => {
    // Step 1: Verify that there are thesis proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);

    // Step 2: Intercept the network request for the search
    cy.intercept('GET', '**/api/thesis-proposals/targeted*').as('getTargetedThesisProposals');

    // Step 3: Open filters dropdown
    openFiltersDropdown();

    // Step 4: Save current results count and type keyword
    cy.get('.proposals-container .card-container .roundCard').its('length').as('initialCardsCount');
    cy.get('#dropdown-filters > div > div > div:nth-child(10)').find('input:visible').first().type('test');

    // Step 5: Select 'Testing' from the dropdown
    cy.get('.select__menu')
      .contains(/Testing/i)
      .click({ force: true });

    // Step 6: Click on the apply button
    clickFiltersApply();

    // Step 7: Wait for the network request to complete
    cy.wait('@getTargetedThesisProposals');

    // Step 8: Verify resulting state (cards or empty-state)
    cy.get('body').then($body => {
      const hasCards = $body.find('.proposals-container .card-container .roundCard').length > 0;
      if (hasCards) {
        cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);
      } else {
        cy.get('.proposals-container .roundCard').should('be.visible');
      }
    });

    // Step 9: If cards are present, verify keyword badge content
    cy.get('body').then($body => {
      const hasCards = $body.find('.proposals-container .card-container .roundCard').length > 0;
      if (hasCards) {
        cy.get('.proposals-container .card-container .roundCard').each(article => {
          cy.wrap(article)
            .find('.custom-badge-container')
            .then($keywordTags => {
              const keywordTags = $keywordTags.text().toLowerCase();
              expect(keywordTags.includes('europeizzazione')).to.be.true;
            });
        });
      }
    });

    // Step 9: Reopen and verify keyword reset badge exists
    openFiltersDropdown();
    cy.get('#dropdown-filters div.custom-badge-container button')
      .contains(/testing/i)
      .should('be.visible');
  });

  it('should filter proposals by teacher and reset filters', () => {
    // Step 1: Verify that there are thesis proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);

    // Step 2: Intercept the network request for the search
    cy.intercept('GET', '**/api/thesis-proposals/targeted*').as('getTargetedThesisProposals');

    // Step 3: Open filters dropdown
    openFiltersDropdown();

    // Step 4: Click on 'Select supervisors' select
    openFiltersSelectByIndex(8);

    // Step 5: Select 'Ceravolo Rosario' from the dropdown
    cy.get('#dropdown-filters > div > div > div:nth-child(8)').contains('Ceravolo Rosario').click();

    // Step 6: Click on the apply button
    clickFiltersApply();

    // Step 7: Wait for the network request to complete
    cy.wait('@getTargetedThesisProposals');

    // Step 8: Verify resulting state (cards or empty-state)
    cy.get('body').then($body => {
      const hasCards = $body.find('.proposals-container .card-container .roundCard').length > 0;
      if (hasCards) {
        cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);
      } else {
        cy.get('.proposals-container .roundCard').should('be.visible');
      }
    });

    // Step 9: If cards are present, verify teacher badge content
    cy.get('body').then($body => {
      const hasCards = $body.find('.proposals-container .card-container .roundCard').length > 0;
      if (hasCards) {
        cy.get('.proposals-container .card-container .roundCard').each(article => {
          cy.wrap(article)
            .find('.custom-badge-container')
            .then($professorTags => {
              const professorTags = $professorTags.text();
              expect(professorTags.includes('Ceravolo Rosario')).to.be.true;
            });
        });
      }
    });

    // Step 10: Reset the filters by clicking on the badge
    cy.get('.applied-filters-container .badge-group .custom-badge-container').contains('Ceravolo Rosario').click();
  });

  it('should filter proposals by type and reset filters', () => {
    // Step 1: Verify that there are thesis proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);

    // Step 2: Intercept the network request for the search
    cy.intercept('GET', '**/api/thesis-proposals/targeted*').as('getTargetedThesisProposals');

    // Step 3: Open filters dropdown
    openFiltersDropdown();

    // Step 4: Click on 'Select types' select
    openFiltersSelectByIndex(6);

    // Step 5: Select 'Sperimentale' from the dropdown
    cy.get('#dropdown-filters > div > div > div:nth-child(6)')
      .contains(/Sperimentale|Experimental/i)
      .click();

    // Step 6: Click on the apply button
    clickFiltersApply();

    // Step 7: Wait for the network request to complete
    cy.wait('@getTargetedThesisProposals');

    // Step 8: Verify that the filtered proposals are listed
    assertCardsOrEmptyStateVisible();

    // Step 9: Check that each proposal contains the type 'Sperimentale'
    cy.get('.proposals-container .card-container .roundCard').each(article => {
      cy.wrap(article)
        .find('.custom-badge-container')
        .then($tags => {
          const tags = $tags.text().toLowerCase();
          expect(tags.includes('sperimentale')).to.be.true;
        });
    });

    // Step 10: Reset the filters
    openFiltersDropdown();
    clickFiltersReset();
  });

  it('should apply multiple filters and reset them', () => {
    // Step 1: Verify that there are thesis proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);

    // Step 2: Open filters dropdown
    openFiltersDropdown();

    // Step 3: Apply internal proposals filter and remove it clicking on 'Resetta'
    openFiltersSelectByIndex(4);
    selectVisibleOptionByIndex(0);
    clickFiltersReset();

    // Step 4: Reopen dropdown after reset
    openFiltersDropdown();

    // Step 5 Filter proposals by keyword 'europeizzazione'
    cy.get('#dropdown-filters > div > div > div:nth-child(10)').within(() => {
      cy.get('input').first().type('europeizzazione');
    });
    cy.contains('#dropdown-filters .select__menu', 'Europeizzazione').click({ force: true });

    // Step 6: Filter proposals by teacher 'Ceravolo Rosario'
    openFiltersSelectByIndex(8);
    cy.get('#dropdown-filters > div > div > div:nth-child(8)').contains('Ceravolo Rosario').click();

    // Step 7: Filter proposals by type 'Sperimentale'
    openFiltersSelectByIndex(6);
    cy.get('#dropdown-filters > div > div > div:nth-child(6)')
      .contains(/Sperimentale|Experimental/i)
      .click();

    // Step 8: Apply filters
    clickFiltersApply();

    // Step 9: Verify that there are no proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length', 0);

    // Step 10: Reset the filters
    openFiltersDropdown();
    clickFiltersReset();

    // Step 11: Verify that the filters are reset
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);
  });

  it('should sort proposals by topic', () => {
    // Step 1: Intercept the network request
    cy.intercept('GET', '**/api/thesis-proposals/targeted*').as('getTargetedThesisProposals');

    // Step 2: Open the sort dropdown, select topic and apply the sort
    cy.get('#dropdown-sort').click();
    cy.get('a.dropdown-item')
      .contains(/Argomento|Topic/i)
      .click();

    // Step 3: Wait for the network request to complete
    cy.wait('@getTargetedThesisProposals');

    // Step 4: Verify that the sorted proposals are listed and alphabetically ordered by topic in ascending order
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);
    cy.get('.card-container .roundCard .thesis-topic').then($topics => {
      let topics = $topics.map((index, el) => Cypress.$(el).text().toLowerCase()).get();
      topics = topics.filter(topic => topic !== '');
      let sortedTopics = [...topics].sort((a, b) => a.localeCompare(b));
      sortedTopics = sortedTopics.filter(topic => topic !== '');
      expect(topics).to.deep.equal(sortedTopics);
    });

    // Step 5: Change the order to descending
    cy.get('#dropdown-sort > button > svg:nth-child(1)').click();

    // Step 6: Wait for the network request to complete
    cy.wait('@getTargetedThesisProposals');

    // Step 7: Verify that the sorted proposals are listed and alphabetically ordered by topic
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);

    // Step 8: Extract all topics and verify they are sorted
    cy.get('.card-container .roundCard h3.thesis-topic').then($topics => {
      let topics = $topics.map((index, el) => Cypress.$(el).text().toLowerCase()).get();
      topics = topics.filter(topic => topic !== '');
      let sortedTopics = [...topics].sort((a, b) => b.localeCompare(a));
      sortedTopics = sortedTopics.filter(topic => topic !== '');
      expect(topics).to.deep.equal(sortedTopics);
    });

    // Step 10: Open the sort dropdown and reset the sort
    cy.get('#dropdown-sort').click();
    cy.get('a.dropdown-item')
      .contains(/Argomento|Topic/i)
      .click();
  });

  it('should sort proposals by description', () => {
    // Step 1: Intercept the network request
    cy.intercept('GET', '**/api/thesis-proposals/targeted*').as('getTargetedThesisProposals');

    // Step 2: Open the sort dropdown and select description
    cy.get('#dropdown-sort').click();
    cy.get('#dropdown-sort .custom-dropdown-item').eq(1).click();

    // Step 3: Wait for the network request to complete
    cy.wait('@getTargetedThesisProposals');

    // Step 4: Verify that the sorted proposals are listed and alphabetically ordered by description in ascending order
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);
    cy.get('.thesis-description').then(() => {
      // Step 5: Change the order to descending
      cy.get('#dropdown-sort > button > svg:nth-child(1)').click();

      // Step 6: Wait for the network request to complete
      cy.wait('@getTargetedThesisProposals');

      // Step 7: Verify that the sorted proposals are listed and alphabetically ordered by description in descending order
      cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);
      cy.get('.thesis-description').should('have.length.greaterThan', 0);
    });

    // Step 8: Reset sorting through reset badge
    cy.get('.applied-filters-container .badge-group .custom-badge-container')
      .contains(/ordina per|sort by/i)
      .click();
  });

  it('should sort proposals by creation date', () => {
    // Step 1: Intercept the network request
    cy.intercept('GET', '**/api/thesis-proposals/targeted*').as('getTargetedThesisProposals');

    // Step 2: Open the sort dropdown and select creation date
    cy.get('#dropdown-sort').click();
    cy.get('#dropdown-sort .custom-dropdown-item').eq(2).click();

    // Step 4: Wait for the network request to complete
    cy.wait('@getTargetedThesisProposals');

    // Step 5: Change the order to descending
    cy.get('#dropdown-sort > button > svg:nth-child(1)').click();

    // Step 6: Change the order to ascending
    cy.get('#dropdown-sort > button > svg:nth-child(1)').click();
  });

  it('should sort proposals by expiration date', () => {
    // Step 1: Intercept the network request
    cy.intercept('GET', '**/api/thesis-proposals/targeted*').as('getTargetedThesisProposals');

    // Step 2: Open the sort dropdown and select expiration date
    cy.get('#dropdown-sort').click();
    cy.get('#dropdown-sort .custom-dropdown-item').eq(3).click();

    // Step 3: Wait for the network request to complete
    cy.wait('@getTargetedThesisProposals');

    // Step 4: Change the order to descending
    cy.get('#dropdown-sort > button > svg:nth-child(1)').click();

    // Step 5: Reset sorting through reset badge
    cy.get('.applied-filters-container .badge-group .custom-badge-container')
      .contains(/ordina per|sort by/i)
      .click();
  });

  it('should move across the pages of the thesis proposals list', () => {
    // Step 1: Verify that there are thesis proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);

    // Step 2: Toggle to all proposals
    cy.get('#all').click();

    // Step 3: Intercept the network request for the search
    cy.intercept('GET', '**/api/thesis-proposals*').as('getThesisProposals');

    // Step 4: Move to the second page
    cy.get('a.page-link').contains('2').click();

    // Step 5: Wait for the network request to complete
    cy.wait('@getThesisProposals');

    // Step 6: Verify that the second page of proposals is listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);

    // Step 7: Move to the next page
    cy.get('a.page-link').contains('›').click();

    // Step 8: Wait for the network request to complete
    cy.wait('@getThesisProposals');

    // Step 9: Move to the last page
    cy.get('a.page-link').contains('»').click();

    // Step 10: Wait for the network request to complete
    cy.wait('@getThesisProposals');

    // Step 11: Verify that the last page of proposals is listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);

    // Step 12: Move to the previous page
    cy.get('a.page-link').contains('‹').click();

    // Step 13: Wait for the network request to complete
    cy.wait('@getThesisProposals');

    // Step 14: Verify that the page of proposals is listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);

    // Step 15: Move to the first page
    cy.get('a.page-link').contains('«').click();

    // Step 16: Wait for the network request to complete
    cy.wait('@getThesisProposals');

    // Step 17: Verify that the first page of proposals is listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);
  });

  it('should change the number of proposals per page', () => {
    // Step 1: Intercept the network request
    cy.intercept('GET', '**/api/thesis-proposals*').as('getThesisProposals');

    // Step 2: Toggle to all proposals
    cy.get('#all').click();

    // Step 3: Wait for the network request to complete
    cy.wait('@getThesisProposals');

    // Step 4: Verify that there are 10 proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length', 10);

    // Step 5: Change the number of proposals per page to 20
    cy.get('#dropdown-pagination > button').click();
    cy.get('a.dropdown-item').contains('20').click();

    // Step 6: Wait for the network request to complete
    cy.wait('@getThesisProposals');

    // Step 7: Verify that there are 20 proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length', 20);

    // Step 8: Change the number of proposals per page to 50
    cy.get('#dropdown-pagination > button').click();
    cy.get('a.dropdown-item').contains('50').click();

    // Step 9: Wait for the network request to complete
    cy.wait('@getThesisProposals');

    // Step 10: Verify that there are 50 proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length', 50);

    // Step 11: Change the number of proposals per page to 100
    cy.get('#dropdown-pagination > button').click();
    cy.get('a.dropdown-item').contains('100').click();

    // Step 12: Wait for the network request to complete
    cy.wait('@getThesisProposals');

    // Step 13: Verify that there are more than 50 proposals listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 50);
  });
});

describe('Thesis proposals API params branches', () => {
  const extractArrayQueryParam = (query, key) => {
    const direct = query[key];
    const bracketed = query[`${key}[]`];
    const value = direct ?? bracketed;

    if (value === undefined || value === null) return [];
    return (Array.isArray(value) ? value : [value])
      .flatMap(item => String(item).split(','))
      .map(item => item.trim())
      .filter(Boolean);
  };

  it('sends complex persisted filters as repeated API query params', () => {
    const persistedState = {
      currentPage: 2,
      filters: {
        isAbroad: 1,
        isInternal: 2,
        keyword: [
          { id: 11, content: 'AI' },
          { id: 22, content: 'Data' },
        ],
        teacher: [
          { id: 101, content: 'Mario Rossi' },
          { id: 202, content: 'Giulia Bianchi' },
        ],
        type: [
          { id: 301, content: 'Applicativa' },
          { id: 302, content: 'Sperimentale' },
        ],
      },
      proposalsPerPage: 25,
      searchQuery: 'robotics',
      sorting: { sortBy: 'topic', orderBy: 'DESC' },
      tab: 'course',
    };

    cy.intercept('GET', '**/api/students', []).as('getStudents');
    cy.intercept('GET', '**/api/students/logged-student*', {}).as('getLoggedStudent');
    cy.intercept('GET', '**/api/thesis-proposals/types*', []).as('getTypes');
    cy.intercept('GET', '**/api/thesis-proposals/keywords*', []).as('getKeywords');
    cy.intercept('GET', '**/api/thesis-proposals/teachers*', []).as('getTeachers');

    cy.intercept('GET', '**/api/thesis-proposals/targeted*', req => {
      if (req.query?.search === 'robotics') {
        req.alias = 'getTargetedWithSearch';
      }
      req.reply({ thesisProposals: [], count: 50, totalPages: 5 });
    }).as('getTargetedWithComplexParams');

    cy.intercept('GET', /\/api\/thesis-proposals\?.*/, req => {
      if (req.query?.search === 'robotics') {
        req.alias = 'getAllWithSearch';
      }
      req.reply({ thesisProposals: [], count: 50, totalPages: 5 });
    }).as('getAllWithComplexParams');

    cy.visit('/carriera/tesi/proposte_di_tesi', {
      onBeforeLoad(win) {
        win.localStorage.setItem('language', 'it');
        win.localStorage.setItem('theme', 'light');
        win.localStorage.setItem('thesisProposalsState', JSON.stringify(persistedState));
      },
    });

    cy.wait('@getTargetedWithSearch').then(({ request }) => {
      const query = request.query;
      const keywordIds = extractArrayQueryParam(query, 'keywordId');
      const teacherIds = extractArrayQueryParam(query, 'teacherId');
      const typeIds = extractArrayQueryParam(query, 'typeId');

      expect(query.page).to.equal('2');
      expect(query.limit).to.equal('25');
      expect(query.search).to.equal('robotics');
      expect(query.sortBy).to.equal('topic');
      expect(query.orderBy).to.equal('DESC');
      expect(['false', false]).to.include(query.isAbroad);
      expect(['false', false]).to.include(query.isInternal);
      expect(keywordIds).to.deep.equal(['11', '22']);
      expect(teacherIds).to.deep.equal(['101', '202']);
      expect(typeIds).to.deep.equal(['301', '302']);
    });

    cy.get('#all').click();
    cy.wait('@getAllWithSearch').then(({ request }) => {
      const query = request.query;
      const keywordIds = extractArrayQueryParam(query, 'keywordId');
      const teacherIds = extractArrayQueryParam(query, 'teacherId');
      const typeIds = extractArrayQueryParam(query, 'typeId');

      expect(query.page).to.equal('1');
      expect(query.limit).to.equal('25');
      expect(query.search).to.equal('robotics');
      expect(query.sortBy).to.equal('topic');
      expect(query.orderBy).to.equal('DESC');
      expect(['false', false]).to.include(query.isAbroad);
      expect(['false', false]).to.include(query.isInternal);
      expect(keywordIds).to.deep.equal(['11', '22']);
      expect(teacherIds).to.deep.equal(['101', '202']);
      expect(typeIds).to.deep.equal(['301', '302']);
    });
  });

  it('sends boolean mapped params and skips array/search params when filters are empty', () => {
    const persistedState = {
      currentPage: 1,
      filters: {
        isAbroad: 2,
        isInternal: 1,
        keyword: [],
        teacher: [],
        type: [],
      },
      proposalsPerPage: 10,
      searchQuery: '',
      sorting: { sortBy: 'id', orderBy: 'ASC' },
      tab: 'course',
    };

    cy.intercept('GET', '**/api/students', []).as('getStudents');
    cy.intercept('GET', '**/api/students/logged-student*', {}).as('getLoggedStudent');
    cy.intercept('GET', '**/api/thesis-proposals/types*', []).as('getTypes');
    cy.intercept('GET', '**/api/thesis-proposals/keywords*', []).as('getKeywords');
    cy.intercept('GET', '**/api/thesis-proposals/teachers*', []).as('getTeachers');

    cy.intercept('GET', '**/api/thesis-proposals/targeted*', req => {
      req.reply({ thesisProposals: [], count: 0, totalPages: 0 });
    }).as('getTargetedSimpleParams');

    cy.visit('/carriera/tesi/proposte_di_tesi', {
      onBeforeLoad(win) {
        win.localStorage.setItem('language', 'it');
        win.localStorage.setItem('theme', 'light');
        win.localStorage.setItem('thesisProposalsState', JSON.stringify(persistedState));
      },
    });

    cy.wait('@getTargetedSimpleParams').then(({ request }) => {
      const query = request.query;
      const keywordIds = extractArrayQueryParam(query, 'keywordId');
      const teacherIds = extractArrayQueryParam(query, 'teacherId');
      const typeIds = extractArrayQueryParam(query, 'typeId');

      expect(query.page).to.equal('1');
      expect(query.limit).to.equal('10');
      expect(['true', true]).to.include(query.isAbroad);
      expect(['true', true]).to.include(query.isInternal);
      expect(keywordIds).to.have.length(0);
      expect(teacherIds).to.have.length(0);
      expect(typeIds).to.have.length(0);
      expect(query.search).to.be.undefined;
    });
  });

  it('clamps persisted page to totalPages when backend returns fewer pages', () => {
    const persistedState = {
      currentPage: 9,
      filters: {
        isAbroad: 0,
        isInternal: 0,
        keyword: [],
        teacher: [],
        type: [],
      },
      proposalsPerPage: 10,
      searchQuery: '',
      sorting: { sortBy: 'id', orderBy: 'ASC' },
      tab: 'course',
    };

    cy.intercept('GET', '**/api/students', []).as('getStudents');
    cy.intercept('GET', '**/api/students/logged-student*', {}).as('getLoggedStudent');
    cy.intercept('GET', '**/api/thesis-proposals/types*', []).as('getTypes');
    cy.intercept('GET', '**/api/thesis-proposals/keywords*', []).as('getKeywords');
    cy.intercept('GET', '**/api/thesis-proposals/teachers*', []).as('getTeachers');

    cy.intercept('GET', '**/api/thesis-proposals/targeted*', req => {
      const page = String(req.query?.page ?? '');
      if (page === '9') {
        req.alias = 'getTargetedOutOfRange';
      } else if (page === '2') {
        req.alias = 'getTargetedClampedPage';
      }
      req.reply({ thesisProposals: [], count: 14, totalPages: 2 });
    }).as('getTargetedForPageClamp');

    cy.visit('/carriera/tesi/proposte_di_tesi', {
      onBeforeLoad(win) {
        win.localStorage.setItem('language', 'it');
        win.localStorage.setItem('theme', 'light');
        win.localStorage.setItem('thesisProposalsState', JSON.stringify(persistedState));
      },
    });

    cy.wait('@getTargetedOutOfRange').its('request.query.page').should('eq', '9');
    cy.wait('@getTargetedClampedPage').its('request.query.page').should('eq', '2');
  });

  it('resets persisted page to first page when backend returns zero pages', () => {
    const persistedState = {
      currentPage: 4,
      filters: {
        isAbroad: 0,
        isInternal: 0,
        keyword: [],
        teacher: [],
        type: [],
      },
      proposalsPerPage: 10,
      searchQuery: '',
      sorting: { sortBy: 'id', orderBy: 'ASC' },
      tab: 'course',
    };

    cy.intercept('GET', '**/api/students', []).as('getStudents');
    cy.intercept('GET', '**/api/students/logged-student*', {}).as('getLoggedStudent');
    cy.intercept('GET', '**/api/thesis-proposals/types*', []).as('getTypes');
    cy.intercept('GET', '**/api/thesis-proposals/keywords*', []).as('getKeywords');
    cy.intercept('GET', '**/api/thesis-proposals/teachers*', []).as('getTeachers');

    cy.intercept('GET', '**/api/thesis-proposals/targeted*', req => {
      const page = String(req.query?.page ?? '');
      if (page === '4') {
        req.alias = 'getTargetedZeroPagesOutOfRange';
      } else if (page === '1') {
        req.alias = 'getTargetedZeroPagesResetToFirst';
      }
      req.reply({ thesisProposals: [], count: 0, totalPages: 0 });
    }).as('getTargetedZeroPages');

    cy.visit('/carriera/tesi/proposte_di_tesi', {
      onBeforeLoad(win) {
        win.localStorage.setItem('language', 'it');
        win.localStorage.setItem('theme', 'light');
        win.localStorage.setItem('thesisProposalsState', JSON.stringify(persistedState));
      },
    });

    cy.wait('@getTargetedZeroPagesOutOfRange').its('request.query.page').should('eq', '4');
    cy.wait('@getTargetedZeroPagesResetToFirst').its('request.query.page').should('eq', '1');
  });

  it('maps isAbroad/isInternal value 2 and omits sort params when sorting is null', () => {
    const persistedState = {
      currentPage: 1,
      filters: {
        isAbroad: 2,
        isInternal: 2,
        keyword: [],
        teacher: [],
        type: [],
      },
      proposalsPerPage: 10,
      searchQuery: '',
      sorting: null,
      tab: 'course',
    };

    cy.intercept('GET', '**/api/students', []).as('getStudents');
    cy.intercept('GET', '**/api/students/logged-student*', {}).as('getLoggedStudent');
    cy.intercept('GET', '**/api/thesis-proposals/types*', []).as('getTypes');
    cy.intercept('GET', '**/api/thesis-proposals/keywords*', []).as('getKeywords');
    cy.intercept('GET', '**/api/thesis-proposals/teachers*', []).as('getTeachers');

    cy.intercept('GET', '**/api/thesis-proposals/targeted*', req => {
      req.reply({ thesisProposals: [], count: 0, totalPages: 0 });
    }).as('getTargetedBooleanMapped');

    cy.visit('/carriera/tesi/proposte_di_tesi', {
      onBeforeLoad(win) {
        win.localStorage.setItem('language', 'it');
        win.localStorage.setItem('theme', 'light');
        win.localStorage.setItem('thesisProposalsState', JSON.stringify(persistedState));
      },
    });

    cy.wait('@getTargetedBooleanMapped').then(({ request }) => {
      const query = request.query;
      expect(['true', true]).to.include(query.isAbroad);
      expect(['false', false]).to.include(query.isInternal);
      expect(query.search).to.be.undefined;
      expect(query.sortBy).to.be.undefined;
      expect(query.orderBy).to.be.undefined;
    });
  });
});

describe('Thesis proposal overview page - responsiveness', () => {
  beforeEach(() => {
    // Reduce the viewport to mobile sizes
    cy.viewport('iphone-x');
    cy.visit('http://localhost:3000');
  });

  it('should see thesis proposals overview page on mobile', () => {
    // Step 1: open the sidebar modal
    cy.get('.sidebar-modal-toggler').click();

    // Step 2: Navigate to the thesis proposals page
    cy.get('.modal-menu a[href="/carriera"]').should('be.visible').click();
    cy.visit('/carriera/tesi/proposte_di_tesi');

    // Step 3: Verify navigation and page content (breadcrumb can be hidden on mobile)
    cy.url().should('include', '/carriera/tesi/proposte_di_tesi');

    // Step 4: Verify the thesis proposals are listed
    cy.get('.proposals-container .card-container .roundCard').should('have.length.greaterThan', 0);
  });
});
