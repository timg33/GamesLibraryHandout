// ***********************************************************
// Globale, benutzerdefinierte Cypress-Commands für die
// GamesLibrary E2E-Tests.
// ***********************************************************

/**
 * Öffnet die Anwendung und wartet, bis der initiale
 * GET /api/games-Aufruf abgeschlossen ist (Spiele geladen).
 */
Cypress.Commands.add('visitApp', () => {
  cy.intercept('GET', '/api/games').as('getGames');
  cy.visit('/');
  cy.wait('@getGames');
});

/**
 * Öffnet das "Add Game"-Formular über den Header-Button.
 */
Cypress.Commands.add('openAddGameForm', () => {
  cy.get('.home-page__add-btn').click();
  cy.get('.game-form').should('be.visible');
});

/**
 * Füllt das Spiel-Formular mit den übergebenen Werten aus.
 * Felder, die nicht übergeben werden, bleiben unverändert.
 */
Cypress.Commands.add('fillGameForm', (game: {
  title?: string;
  description?: string;
  imageUrl?: string;
  releaseDate?: string;
}) => {
  if (game.title !== undefined) {
    cy.get('.game-form input[name="title"]').clear();
    if (game.title) cy.get('.game-form input[name="title"]').type(game.title);
  }
  if (game.description !== undefined) {
    cy.get('.game-form textarea[name="description"]').clear();
    if (game.description) cy.get('.game-form textarea[name="description"]').type(game.description);
  }
  if (game.imageUrl !== undefined) {
    cy.get('.game-form input[name="imageUrl"]').clear();
    if (game.imageUrl) cy.get('.game-form input[name="imageUrl"]').type(game.imageUrl);
  }
  if (game.releaseDate !== undefined) {
    cy.get('.game-form input[name="releaseDate"]').clear();
    if (game.releaseDate) cy.get('.game-form input[name="releaseDate"]').type(game.releaseDate);
  }
});

/**
 * Löscht ein Spiel anhand seines Titels direkt über die API.
 * Wird für die Aufräumarbeiten nach Tests verwendet, damit die
 * Datenbank zwischen Testläufen sauber bleibt.
 */
Cypress.Commands.add('deleteGameByTitle', (title: string) => {
  cy.request('GET', '/api/games').then((res) => {
    const match = (res.body as Array<{ id: number; title: string }>).find(
      (g) => g.title === title
    );
    if (match) {
      cy.request('DELETE', `/api/games/${match.id}`);
    }
  });
});

/* ===========================================================
 * Eigene Commands (Teil 3)
 * =========================================================== */

/**
 * Führt eine Suche über die SearchBar aus: Begriff eintippen und
 * den Such-Button klicken.
 *
 * Bewusst OHNE eigenes cy.intercept: So kann ein Test vorher selber ein
 * Intercept registrieren (z. B. einen 500er-Fehlerfall), ohne dass es von
 * diesem Command wieder überschrieben wird.
 * `parseSpecialCharSequences: false` sorgt dafür, dass Zeichen wie { oder }
 * als normale Zeichen getippt und nicht als Cypress-Tastenbefehle gedeutet werden.
 */
Cypress.Commands.add('searchFor', (term: string) => {
  cy.get('.search-bar__input').clear();
  if (term) {
    cy.get('.search-bar__input').type(term, { delay: 0, parseSpecialCharSequences: false });
  }
  cy.get('.search-bar__button').click();
});

/**
 * Führt gezielt eine leere Ergebnisliste herbei: sucht nach einem Begriff,
 * den es garantiert nicht gibt, und prüft, dass der Leer-Zustand erscheint.
 * Wird von mehreren Tests als Ausgangslage benötigt.
 */
Cypress.Commands.add('forceEmptyResult', () => {
  cy.intercept('GET', '/api/games/search*').as('emptyResultSearch');
  cy.searchFor(`KeinSpielMitDiesemNamen${Date.now()}`);
  cy.wait('@emptyResultSearch');
  cy.get('.game-list__status-title').should('contain.text', 'No Games Found');
  cy.get('.game-card').should('not.exist');
});

/**
 * Legt ein Spiel direkt über die API an, ohne den Umweg über die UI.
 * Das macht Tests schneller und unabhängig davon, ob das Formular funktioniert
 * (die Formular-Funktion wird in 04/05 bereits separat getestet).
 */
Cypress.Commands.add('createGameViaApi', (game: GamePayload) => {
  return cy
    .request('POST', '/api/games', {
      title: game.title,
      description: game.description ?? '',
      imageUrl: game.imageUrl ?? '',
      releaseDate: game.releaseDate,
    })
    .then((res) => {
      expect(res.status, 'Testdaten konnten angelegt werden').to.eq(201);
      return res.body as CreatedGame;
    });
});

/**
 * Prüft, dass das Fehler-Banner der Startseite sichtbar ist und den
 * erwarteten Text enthält.
 */
Cypress.Commands.add('expectHomePageError', (message: string) => {
  cy.get('.home-page__error').should('be.visible').and('contain.text', message);
});

/** Nutzlast für createGameViaApi */
interface GamePayload {
  title: string;
  description?: string;
  imageUrl?: string;
  releaseDate: string;
}

/** Vom Backend angelegtes Spiel (inkl. generierter ID) */
interface CreatedGame extends GamePayload {
  id: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      visitApp(): Chainable<void>;
      openAddGameForm(): Chainable<void>;
      fillGameForm(game: {
        title?: string;
        description?: string;
        imageUrl?: string;
        releaseDate?: string;
      }): Chainable<void>;
      deleteGameByTitle(title: string): Chainable<void>;
      /** Suchbegriff eingeben und Suche über den Button auslösen */
      searchFor(term: string): Chainable<void>;
      /** Sucht nach einem nicht existierenden Titel und prüft den Leer-Zustand */
      forceEmptyResult(): Chainable<void>;
      /** Legt ein Spiel direkt über die API an und gibt es zurück */
      createGameViaApi(game: GamePayload): Chainable<CreatedGame>;
      /** Prüft das Fehler-Banner der Startseite */
      expectHomePageError(message: string): Chainable<void>;
    }
  }
}

export {};
