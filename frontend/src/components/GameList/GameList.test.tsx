import React from 'react';
import { render, screen } from '@testing-library/react';
import GameList from './GameList';
import { Game } from '../../types/Game';

/**
 * Unit-Tests für die GameList-Komponente.
 *
 * Geprüft werden die drei Zustände, die die Liste annehmen kann: Laden,
 * leere Liste und Liste mit Spielen.
 */
const spiele: Game[] = [
  { id: 1, title: 'Zelda', description: 'Abenteuer', imageUrl: '', releaseDate: '2017-03-03' },
  { id: 2, title: 'Stray', description: 'Katzenspiel', imageUrl: '', releaseDate: '2022-07-19' },
];

describe('GameList', () => {
  it('zeigt den Ladezustand an, solange loading true ist', () => {
    render(<GameList games={[]} loading={true} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('Loading Library...')).toBeInTheDocument();
  });

  it('zeigt "No Games Found", wenn die Liste leer ist', () => {
    render(<GameList games={[]} loading={false} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('No Games Found')).toBeInTheDocument();
  });

  it('rendert für jedes Spiel eine Karte', () => {
    render(<GameList games={spiele} loading={false} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('Zelda')).toBeInTheDocument();
    expect(screen.getByText('Stray')).toBeInTheDocument();
    expect(screen.queryByText('No Games Found')).not.toBeInTheDocument();
  });

  it('zeigt die Spiele nicht an, solange geladen wird', () => {
    render(<GameList games={spiele} loading={true} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.queryByText('Zelda')).not.toBeInTheDocument();
  });
});
