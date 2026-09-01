/// <reference types="cypress" />

/**
 * E2E-Tests: Bearbeiten abbrechen und Bild-Darstellung
 *
 * Warum ist das testenswert?
 * 
 * 1) Abbrechen ist dafür gedacht, dass keine der eingegebenen änderungen übernommen werden,
 *    daher wäre es sehr schlecht, wenn beim abbrechen originaldaten verändert werden.
 *    Zudem würde man das gar nicht direkt merken, wenn es passiert. Darum ist einen test
 *    dafür zu haben sehr wichtig.
 * 2) Bild-URLs zeigen gerne mal ins nichts. Und wie die meisten informatiker wissen, sinnd
 *    die standard bild-platzhalter nicht sehr schön... daher ist dieser test nötig, um
 *    sicherzustellen, dass ein anständiger platzhalter angezeigt wird.
 */
describe('Bearbeiten abbrechen und Bild-Fallbacks', () => {
  const suffix = () => Date.now().toString();
  const angelegteTitel: string[] = [];

  afterEach(() => {
    // Testdaten wieder entfernen, damit jeder Test unabhängig wiederholbar ist
    angelegteTitel.forEach((titel) => cy.deleteGameByTitle(titel));
    angelegteTitel.length = 0;
  });

  it('macht beim Abbrechen des Bearbeitens keine Änderungen an den Originaldaten', () => {
    const s = suffix();
    const titel = `Cypress Abbrechen Original ${s}`;
    const beschreibung = `Originalbeschreibung ${s} - darf sich nicht ändern`;
    const geaenderterTitel = `Cypress Abbrechen VERWORFEN ${s}`;

    cy.createGameViaApi({ title: titel, description: beschreibung, releaseDate: '2020-05-05' });
    angelegteTitel.push(titel, geaenderterTitel);

    cy.visitApp();

    // Ist-Zustand VOR dem Öffnen des Formulars festhalten
    cy.contains('.game-card', titel).find('.game-card__title').invoke('text').as('titelVorher');
    cy.contains('.game-card', titel).find('.game-card__description').invoke('text').as('beschreibungVorher');

    // Edit-Modus öffnen und beide Felder überschreiben
    cy.contains('.game-card', titel).find('.game-card__btn--edit').click();
    cy.get('.game-form__title').should('contain.text', 'Edit Game');
    cy.get('.game-form input[name="title"]').should('have.value', titel);
    cy.fillGameForm({
      title: geaenderterTitel,
      description: 'Diese Änderung darf NICHT gespeichert werden',
    });

    // Abbrechen
    cy.get('.game-form__btn--cancel').click();
    cy.get('.game-form').should('not.exist');

    // Vergleich mit den vorher festgehaltenen Werten (nicht nur "Formular zu")
    cy.get('@titelVorher').then((titelVorher) => {
      cy.contains('.game-card', titel)
        .find('.game-card__title')
        .should('have.text', String(titelVorher));
    });
    cy.get('@beschreibungVorher').then((beschreibungVorher) => {
      cy.contains('.game-card', titel)
        .find('.game-card__description')
        .should('have.text', String(beschreibungVorher));
    });
    cy.contains('.game-card__title', geaenderterTitel).should('not.exist');

    // Gegenprobe nach einem Reload: es wurde auch serverseitig nichts gespeichert
    cy.visitApp();
    cy.contains('.game-card__title', titel).should('be.visible');
    cy.contains('.game-card__title', geaenderterTitel).should('not.exist');
  });

  it('zeigt "No Image" und entfernt das <img>, wenn die Bild-URL kaputt ist (onError-Fallback)', () => {
    const s = suffix();
    const titel = `Cypress Kaputtes Bild ${s}`;
    const kaputteUrl = `/kaputtes-bild-${s}.png`;

    // Der Bildaufruf wird gezielt zum Scheitern gebracht
    cy.intercept('GET', `**/kaputtes-bild-${s}.png`, { forceNetworkError: true }).as('kaputtesBild');

    cy.createGameViaApi({
      title: titel,
      description: 'Bild-URL zeigt ins Leere',
      imageUrl: kaputteUrl,
      releaseDate: '2021-01-01',
    });
    angelegteTitel.push(titel);

    cy.visitApp();

    cy.contains('.game-card', titel).within(() => {
      // Der onError-Handler hat den Platzhalter eingesetzt
      cy.get('.game-card__no-image').should('contain.text', 'No Image');
      // das kaputte <img> ist aus dem DOM entfernt worden
      cy.get('img.game-card__image').should('not.exist');
      cy.get('img').should('not.exist');
      // Nebeneffekt der dabei entdeckt wurde: der onError-Handler überschreibt
      // den ganzen Wrapper per innerHTML, dadurch verschwindet auch der datum badge.
      // kein Absturz aber nicht so schön -> Punkt für TESTREPORT.
      cy.get('.game-card__badge').should('not.exist');
    });
  });

  it('zeigt "No Image", wenn gar keine Bild-URL angegeben wurde (React-Fallback)', () => {
    const s = suffix();
    const titel = `Cypress Ohne Bild ${s}`;

    cy.createGameViaApi({
      title: titel,
      description: 'Spiel ganz ohne Bild-URL',
      imageUrl: '',
      releaseDate: '2019-09-09',
    });
    angelegteTitel.push(titel);

    cy.visitApp();

    cy.contains('.game-card', titel).within(() => {
      cy.get('.game-card__no-image').should('contain.text', 'No Image');
      cy.get('img').should('not.exist');
      // Unterschied zum onError-Fall: hier rendert React den Platzhalter von Anfang an,
      // es entsteht gar nie ein img tag und der datum badge bleibt darum erhalten
      cy.get('.game-card__badge').should('exist');
    });
  });

  it('Bonus: das Formular lässt sich ohne Maus per Tastatur ausfüllen und mit Enter abschicken', () => {
    const titel = `Cypress Tastatur ${suffix()}`;
    angelegteTitel.push(titel);

    cy.visitApp();
    cy.openAddGameForm();

    cy.get('.game-form input[name="title"]').focus().should('have.focus');
    cy.focused().type(titel, { delay: 0 });
    cy.get('.game-form input[name="releaseDate"]').focus().should('have.focus');
    cy.focused().type('2020-02-02');

    cy.intercept('POST', '/api/games').as('createGame');
    cy.get('.game-form input[name="title"]').focus();
    cy.focused().type('{enter}');

    cy.wait('@createGame').its('response.statusCode').should('eq', 201);
    cy.get('.game-form').should('not.exist');
    cy.contains('.game-card__title', titel).should('be.visible');
  });
});
