import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from './SearchBar';

/**
 * Unit-Tests für die SearchBar-Komponente.
 *
 * Getestet wird das Verhalten der Suchleiste isoliert: wann onSearch und wann
 * onReset aufgerufen wird. Beide Callbacks sind Jest-Mocks.
 */
describe('SearchBar', () => {
  it('löst die Suche NICHT beim Tippen aus, sondern erst beim Absenden', async () => {
    const onSearch = jest.fn();
    render(<SearchBar onSearch={onSearch} onReset={jest.fn()} />);

    await userEvent.type(screen.getByPlaceholderText('Search games...'), 'Zelda');
    expect(onSearch).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(onSearch).toHaveBeenCalledWith('Zelda');
  });

  it('entfernt Leerzeichen am Rand des Suchbegriffs', async () => {
    const onSearch = jest.fn();
    render(<SearchBar onSearch={onSearch} onReset={jest.fn()} />);

    await userEvent.type(screen.getByPlaceholderText('Search games...'), '  Mario  ');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).toHaveBeenCalledWith('Mario');
  });

  it('ruft onReset auf, wenn das Feld geleert wird', async () => {
    const onReset = jest.fn();
    render(<SearchBar onSearch={jest.fn()} onReset={onReset} />);

    const feld = screen.getByPlaceholderText('Search games...');
    await userEvent.type(feld, 'abc');
    await userEvent.clear(feld);

    expect(onReset).toHaveBeenCalled();
  });

  it('ruft onReset statt onSearch auf, wenn leer abgesendet wird', async () => {
    const onSearch = jest.fn();
    const onReset = jest.fn();
    render(<SearchBar onSearch={onSearch} onReset={onReset} />);

    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).not.toHaveBeenCalled();
    expect(onReset).toHaveBeenCalled();
  });
});
