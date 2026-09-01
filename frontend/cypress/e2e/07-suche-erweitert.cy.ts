/// <reference types="cypress" />

/**
 * E2E-Tests: Suche mit Sonderfällen
 *
 * Warum ist das testenswert?
 * 
 * Die Suche ist eine der wichtigsten features dieser App. Es kann schnell passieren, dass
 * ein User ein sonderzeichen eingibt oder ausversehen etwas falsches/sehr langes rein
 * kopiert. Wenn die App dabei abstürzt oder hängenbleibt oder sonst etwas unerwartetes
 * passiert, dann haben wir ein problem. Und auch das eingeben einzelner Zeichen in die
 * Suche sollte natürlich nicht jedesmal eine  neue Suche abfeuern.
 * 
 */
describe('Suche mit Sonderzeichen, langen Eingaben und Auslöse-Verhalten', () => {
  beforeEach(() => {
    cy.visitApp();
  });

  it('verarbeitet Sonderzeichen und Umlaute, ohne abzustürzen', () => {
    const specialTerms = ['%', '<script>alert(1)</script>', 'A & B', 'Öl Mühle Süd'];

    specialTerms.forEach((term, i) => {
      cy.intercept('GET', '/api/games/search*').as(`search${i}`);
      cy.searchFor(term);

      // Das Backend muss die Anfrage sauber beantworten (kein 500er)
      cy.wait(`@search${i}`).its('response.statusCode').should('eq', 200);

      // Kein Fehler-Banner und die Suchleiste ist weiterhin bedienbar
      cy.get('.home-page__error').should('not.exist');
      cy.get('.search-bar__input').should('be.visible');

      cy.get('.home-page__main').then(($main) => {
        const hasCards = $main.find('.game-card').length > 0;
        const hasEmptyState = $main.find('.game-list__status-title').length > 0;
        expect(
          hasCards || hasEmptyState,
          `Für den Suchbegriff "${term}" wird eine Trefferliste oder "No Games Found" angezeigt`
        ).to.eq(true);
      });
    });
  });

  it('verarbeitet einen sehr langen Suchbegriff (> 200 Zeichen) ohne hängenden Request', () => {
    const longTerm = 'Lorem'.repeat(50);
    expect(longTerm.length).to.be.greaterThan(200);

    cy.intercept('GET', '/api/games/search*').as('longSearch');
    cy.searchFor(longTerm);

    cy.wait('@longSearch').then((interception) => {
      expect(interception.request.url, 'Suchbegriff wird als Query-Parameter gesendet').to.include('title=');
      expect(interception.response?.statusCode, 'Backend antwortet mit 200').to.eq(200);
    });

    // Kein hängender Request: der Ladezustand ist wieder verschwunden
    cy.get('.game-list__spinner').should('not.exist');
    cy.get('.home-page__error').should('not.exist');

    // So ein Begriff kann es nicht geben -> Leer-Zustand statt Absturz
    cy.get('.game-list__status-title').should('contain.text', 'No Games Found');
  });

  it('löst die Suche NICHT bei jedem Tastendruck aus, sondern erst per Button oder Enter', () => {
    let searchRequests = 0;
    cy.intercept('GET', '/api/games/search*', (req) => {
      searchRequests += 1;
      req.continue();
    }).as('search');

    cy.get('.search-bar__input').type('Zelda', { delay: 0 });
    // Bewusstes kurzes Warten: in dieser Zeit darf keine Suchanfrage entstehen
    cy.wait(500);
    cy.then(() => {
      expect(searchRequests, 'Anfragen während des reinen Tippens').to.eq(0);
    });

    // Erst der Klick auf den Button löst die Suche aus
    cy.get('.search-bar__button').click();
    cy.wait('@search');
    cy.then(() => {
      expect(searchRequests, 'Anfragen nach Klick auf den Such-Button').to.eq(1);
    });

    // Enter im Suchfeld löst die Suche ebenfalls aus
    cy.get('.search-bar__input').clear();
    cy.get('.search-bar__input').type('Witcher{enter}', { delay: 0 });
    cy.wait('@search');
    cy.then(() => {
      expect(searchRequests, 'Anfragen nach Enter im Suchfeld').to.eq(2);
    });
  });
});
