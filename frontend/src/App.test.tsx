import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

/**
 * Unit-Test der Root-Komponente.
 *
 * Die API-Schicht wird gemockt, damit der Test ohne laufendes Backend
 * funktioniert und immer dasselbe Ergebnis liefert.
 *
 * Wichtig: Hier stehen bewusst normale Funktionen statt jest.fn(). Create React App
 * setzt in seiner Jest-Konfiguration resetMocks: true. Dadurch würde die
 * Implementierung eines jest.fn() vor jedem Test entfernt und der Aufruf
 * undefined zurückgeben.
 */
jest.mock('./api/gameApi', () => ({
  getAllGames: () => Promise.resolve([]),
  getGameById: () => Promise.resolve(undefined),
  searchGames: () => Promise.resolve([]),
  createGame: () => Promise.resolve(undefined),
  updateGame: () => Promise.resolve(undefined),
  deleteGame: () => Promise.resolve(undefined),
}));

test('rendert den Titel der Anwendung', async () => {
  render(<App />);

  expect(await screen.findByText('Games Library')).toBeInTheDocument();
  expect(screen.getByText('Your Personal Gaming Universe')).toBeInTheDocument();
});

test('zeigt den Leer-Zustand, wenn das Backend keine Spiele liefert', async () => {
  render(<App />);

  expect(await screen.findByText('No Games Found')).toBeInTheDocument();
});
