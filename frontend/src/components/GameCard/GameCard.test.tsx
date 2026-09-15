import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameCard from './GameCard';
import { Game } from '../../types/Game';

/**
 * Unit-Tests für die GameCard-Komponente.
 *
 * Die Komponente wird isoliert getestet: Es läuft kein Backend, die Callbacks
 * onEdit und onDelete werden durch Jest-Mocks ersetzt. Geprüft wird nur, was
 * die Komponente aus ihren Props macht.
 */
const spiel: Game = {
  id: 1,
  title: 'The Witcher 3',
  description: 'Ein Rollenspiel',
  imageUrl: 'https://example.com/bild.jpg',
  releaseDate: '2015-05-19',
};

describe('GameCard', () => {
  it('zeigt Titel und Beschreibung des Spiels an', () => {
    render(<GameCard game={spiel} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('The Witcher 3')).toBeInTheDocument();
    expect(screen.getByText('Ein Rollenspiel')).toBeInTheDocument();
  });

  it('zeigt das Erscheinungsdatum im Schweizer Format an', () => {
    render(<GameCard game={spiel} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('19.5.2015')).toBeInTheDocument();
  });

  it('zeigt "No Image", wenn keine Bild-URL vorhanden ist', () => {
    render(<GameCard game={{ ...spiel, imageUrl: '' }} onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('No Image')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('ruft onEdit mit dem Spiel auf, wenn Edit geklickt wird', async () => {
    const onEdit = jest.fn();
    render(<GameCard game={spiel} onEdit={onEdit} onDelete={jest.fn()} />);

    await userEvent.click(screen.getByText('Edit'));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(spiel);
  });

  it('ruft onDelete mit der ID auf, wenn Delete geklickt wird', async () => {
    const onDelete = jest.fn();
    render(<GameCard game={spiel} onEdit={jest.fn()} onDelete={onDelete} />);

    await userEvent.click(screen.getByText('Delete'));

    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
