/// <reference types="cypress" />

/**
 * E2E-Tests: Fehlerbehandlung bei Server- und Netzwerkproblemen
 *
 * Warum ist das testenswert?
 * 
 * Beim lokalen entwicjeln kommen diese fälle, wie Wlan absturz oder ähnliches
 * selten vor. Aber in der produktion/realität kann es schnell mal dazu kommen. Und wenn
 * für solche fälle keine Fehlerbehandlung existiert kann das bei den end usern
 * für frust sorgen, denn sie wissen nicht was das problem ist, denn es könnte
 * ihr gerät, das backend oder das Wlan sein. Damit das nciht vorkommt, sollte man
 * tests dafür haben.
 * 
 */
describe('Fehlerbehandlung bei Server- und Netzwerkfehlern', () => {
  const aufraeumTitel: string[] = [];

  afterEach(() => {
    aufraeumTitel.forEach((titel) => cy.deleteGameByTitle(titel));
    aufraeumTitel.length = 0;
  });

  it('zeigt eine Fehlermeldung, wenn das initiale Laden mit Status 500 fehlschlägt', () => {
    cy.intercept('GET', '/api/games', {
      statusCode: 500,
      body: { message: 'Interner Serverfehler (simuliert)' },
    }).as('getGamesFehler');

    // cy.visit statt cy.visitApp: sonst wird ein neues Intercept auf dieselbe Route gemacht und wir verlieren den Fehlerfall.
    cy.visit('/');
    cy.wait('@getGamesFehler');

    cy.expectHomePageError('Fehler beim Laden der Spiele.');
    cy.get('.game-card').should('not.exist');

    // Die App bleibt bedienbar - kein weisser Bildschirm
    cy.get('.home-page__headline').should('be.visible');
    cy.get('.search-bar__input').should('be.visible');
    cy.get('.home-page__add-btn').should('be.visible');
  });

  it('zeigt eine sinnvolle Fehlermeldung, wenn die Suche mit Status 500 fehlschlägt', () => {
    cy.visitApp();

    cy.get('.game-card').its('length').then((anzahlVorher) => {
      cy.intercept('GET', '/api/games/search*', {
        statusCode: 500,
        body: { message: 'Suche kaputt (simuliert)' },
      }).as('sucheFehler');

      cy.searchFor('Zelda');
      cy.wait('@sucheFehler');

      cy.expectHomePageError('Fehler bei der Suche.');

      // Beobachteter IST-Zustand: die zuvor geladene Liste bleibt stehen, weil im
      // Fehlerfall kein setGames kommt. Der Bildschirm ist
      // nicht leer -sondern User sehen weiterhin die Inhalte und die Meldung.
      cy.get('.game-card').should('have.length', anzahlVorher);
      cy.get('.game-list__spinner').should('not.exist');
    });
  });

  it('legt kein Spiel an und meldet den Fehler, wenn POST /api/games am Netzwerk scheitert', () => {
    const titel = `Cypress Netzwerkfehler ${Date.now()}`;
    aufraeumTitel.push(titel);

    cy.visitApp();
    cy.openAddGameForm();
    cy.fillGameForm({
      title: titel,
      description: 'Dieses Spiel darf nicht gespeichert werden',
      releaseDate: '2020-03-03',
    });

    cy.intercept('POST', '/api/games', { forceNetworkError: true }).as('anlegenFehler');
    cy.get('.game-form__btn--submit').click();
    cy.wait('@anlegenFehler');

    // Fehlermeldung im Banner
    cy.expectHomePageError('Fehler beim Erstellen des Spiels.');

    // Keine optimistische Anzeige: das Spiel taucht nicht in der Liste auf
    cy.contains('.game-card__title', titel).should('not.exist');

    /*
     * BEOBACHTETER IST-ZUSTAND (Grundlage für Fehlerdiskussion in Teil 5/6):
     * Das Formular schliesst sich trotz dem Fehler. Weil in HomePage.tsx:
     * handleFormSubmit ruft nach await immer setShowForm(false) auf und
     * addGame in useGames.ts fängt den Fehler intern ab, anstatt ihn weiterzuwerfen.
     */
    cy.get('.game-form').should('not.exist');

    // Gegenprobe, dass der Datensatz wirklich nicht existiert
    cy.request('GET', '/api/games').then((res) => {
      const vorhanden = (res.body as Array<{ title: string }>).some((g) => g.title === titel);
      expect(vorhanden, 'Spiel darf nach dem Netzwerkfehler nicht in der Datenbank sein').to.eq(false);
    });
  });

  it('Bonus: zeigt während einer langsamen Antwort einen sichtbaren Ladezustand an', () => {
    // Antwort künstlich verzögern, damit der Ladezustand überhaupt prüfbar ist
    cy.intercept('GET', '/api/games', (req) => {
      req.continue((res) => {
        res.setDelay(1500);
      });
    }).as('langsameAntwort');

    cy.visit('/');

    // Während der Wartezeit: Spinner und Lade indikation sichtbar
    cy.get('.game-list__spinner').should('be.visible');
    cy.get('.game-list__status-title').should('contain.text', 'Loading Library');
    // Die Statistik zeigt währenddessen einen Platzhalter statt einer Zahl
    cy.get('.home-page__stat-value').first().should('contain.text', '–');

    cy.wait('@langsameAntwort');

    // Danach ist der Ladezustand weg und die Spiele sind da
    cy.get('.game-list__spinner').should('not.exist');
    cy.get('.game-card').should('have.length.greaterThan', 0);
  });
});
