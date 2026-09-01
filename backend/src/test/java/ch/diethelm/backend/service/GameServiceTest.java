package ch.diethelm.backend.service;

import ch.diethelm.backend.model.Game;
import ch.diethelm.backend.repository.GameRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * White-Box Unit Tests für {@link GameService}.
 *
 * <p>Der Service wird isoliert getestet: Das {@link GameRepository} wird mit Mockito gemockt,
 * es läuft also keine echte Datenbank. Wir kennen die interne Struktur des Services und
 * präparieren die Rückgabewerte des Repositories gezielt pro Testfall (White-Box).</p>
 */
@ExtendWith(MockitoExtension.class)
class GameServiceTest {

    @Mock
    private GameRepository gameRepository;   // gemockte Abhängigkeit

    @InjectMocks
    private GameService gameService;         // zu testende Klasse, bekommt den Mock injiziert

    private Game zelda;
    private Game witcher;

    @BeforeEach
    void setUp() {
        zelda = Game.builder()
                .id(1L)
                .title("The Legend of Zelda: Breath of the Wild")
                .description("Open-World-Abenteuer in Hyrule")
                .imageUrl("https://example.com/zelda.jpg")
                .releaseDate(LocalDate.of(2017, 3, 3))
                .build();

        witcher = Game.builder()
                .id(2L)
                .title("The Witcher 3: Wild Hunt")
                .description("Rollenspiel")
                .imageUrl("https://example.com/witcher.jpg")
                .releaseDate(LocalDate.of(2015, 5, 19))
                .build();
    }

    // ---------------------------------------------------------------- getAllGames

    @Test
    @DisplayName("getAllGames() gibt die Liste zurück, die das Repository liefert")
    void getAllGames_returnsListFromRepository() {
        List<Game> expected = List.of(zelda, witcher);
        when(gameRepository.findAll()).thenReturn(expected);

        List<Game> result = gameService.getAllGames();

        assertEquals(expected, result);
        assertEquals(2, result.size());
        verify(gameRepository).findAll();
        verifyNoMoreInteractions(gameRepository);
    }

    @Test
    @DisplayName("getAllGames() gibt eine leere Liste zurück, wenn keine Spiele vorhanden sind")
    void getAllGames_returnsEmptyListWhenRepositoryIsEmpty() {
        when(gameRepository.findAll()).thenReturn(List.of());

        List<Game> result = gameService.getAllGames();

        assertTrue(result.isEmpty());
        verify(gameRepository).findAll();
    }

    // ---------------------------------------------------------------- getGameById

    @Test
    @DisplayName("getGameById(id) gibt das Spiel zurück, wenn es existiert")
    void getGameById_returnsGameWhenFound() {
        when(gameRepository.findById(1L)).thenReturn(Optional.of(zelda));

        Game result = gameService.getGameById(1L);

        assertSame(zelda, result);
        verify(gameRepository).findById(1L);
    }

    @Test
    @DisplayName("getGameById(id) wirft NoSuchElementException, wenn die ID nicht existiert")
    void getGameById_throwsWhenNotFound() {
        when(gameRepository.findById(99L)).thenReturn(Optional.empty());

        NoSuchElementException ex = assertThrows(NoSuchElementException.class,
                () -> gameService.getGameById(99L));

        assertTrue(ex.getMessage().contains("99"), "Fehlermeldung soll die gesuchte ID enthalten");
        verify(gameRepository).findById(99L);
    }

    // ---------------------------------------------------------------- createGame

    @Test
    @DisplayName("createGame(game) ruft repository.save(...) auf und gibt das gespeicherte Spiel zurück")
    void createGame_savesAndReturnsSavedGame() {
        Game newGame = Game.builder()
                .title("Stray")
                .description("Katzenabenteuer")
                .imageUrl("https://example.com/stray.jpg")
                .releaseDate(LocalDate.of(2022, 7, 19))
                .build();
        Game saved = Game.builder()
                .id(3L)   // die DB vergibt die ID -> simuliert durch den Mock
                .title("Stray")
                .description("Katzenabenteuer")
                .imageUrl("https://example.com/stray.jpg")
                .releaseDate(LocalDate.of(2022, 7, 19))
                .build();
        when(gameRepository.save(newGame)).thenReturn(saved);

        Game result = gameService.createGame(newGame);

        assertSame(saved, result);
        assertEquals(3L, result.getId());
        verify(gameRepository).save(newGame);
        verifyNoMoreInteractions(gameRepository);
    }

    // ---------------------------------------------------------------- updateGame

    @Test
    @DisplayName("updateGame(id, game) überschreibt alle Felder des bestehenden Spiels korrekt")
    void updateGame_overwritesAllFields() {
        Game update = Game.builder()
                .title("Zelda: Tears of the Kingdom")
                .description("Nachfolger von Breath of the Wild")
                .imageUrl("https://example.com/totk.jpg")
                .releaseDate(LocalDate.of(2023, 5, 12))
                .build();
        when(gameRepository.findById(1L)).thenReturn(Optional.of(zelda));
        // save() gibt genau das Objekt zurück, das es bekommt (wie JPA es auch tun würde)
        when(gameRepository.save(any(Game.class))).thenAnswer(inv -> inv.getArgument(0));

        Game result = gameService.updateGame(1L, update);

        // Es wurde das bestehende Objekt gespeichert, nicht ein neues
        ArgumentCaptor<Game> captor = ArgumentCaptor.forClass(Game.class);
        verify(gameRepository).save(captor.capture());
        Game savedGame = captor.getValue();
        assertSame(zelda, savedGame);

        // Alle vier Felder wurden überschrieben ...
        assertEquals("Zelda: Tears of the Kingdom", savedGame.getTitle());
        assertEquals("Nachfolger von Breath of the Wild", savedGame.getDescription());
        assertEquals("https://example.com/totk.jpg", savedGame.getImageUrl());
        assertEquals(LocalDate.of(2023, 5, 12), savedGame.getReleaseDate());
        // ... die ID bleibt aber die alte
        assertEquals(1L, savedGame.getId());

        assertSame(savedGame, result);
    }

    @Test
    @DisplayName("updateGame(id, game) wirft eine Exception, wenn die ID nicht existiert")
    void updateGame_throwsWhenNotFound() {
        when(gameRepository.findById(42L)).thenReturn(Optional.empty());

        assertThrows(NoSuchElementException.class, () -> gameService.updateGame(42L, witcher));

        // Bei unbekannter ID darf nichts gespeichert werden
        verify(gameRepository, never()).save(any());
    }

    // ---------------------------------------------------------------- deleteGame

    @Test
    @DisplayName("deleteGame(id) löscht das Spiel, wenn es existiert")
    void deleteGame_deletesWhenExists() {
        when(gameRepository.existsById(1L)).thenReturn(true);

        assertDoesNotThrow(() -> gameService.deleteGame(1L));

        verify(gameRepository).existsById(1L);
        verify(gameRepository).deleteById(1L);
        verifyNoMoreInteractions(gameRepository);
    }

    @Test
    @DisplayName("deleteGame(id) wirft eine Exception, wenn die ID nicht existiert")
    void deleteGame_throwsWhenNotFound() {
        when(gameRepository.existsById(99L)).thenReturn(false);

        NoSuchElementException ex = assertThrows(NoSuchElementException.class,
                () -> gameService.deleteGame(99L));

        assertTrue(ex.getMessage().contains("99"));
        // Bei unbekannter ID darf nicht gelöscht werden
        verify(gameRepository, never()).deleteById(anyLong());
    }

    // ---------------------------------------------------------------- searchByTitle

    @Test
    @DisplayName("searchByTitle(title) delegiert korrekt an findByTitleContainingIgnoreCase(...)")
    void searchByTitle_delegatesToRepository() {
        when(gameRepository.findByTitleContainingIgnoreCase("zelda")).thenReturn(List.of(zelda));

        List<Game> result = gameService.searchByTitle("zelda");

        assertEquals(List.of(zelda), result);
        // Der Suchbegriff wird unverändert weitergereicht, keine andere Repository-Methode wird benutzt
        verify(gameRepository).findByTitleContainingIgnoreCase("zelda");
        verifyNoMoreInteractions(gameRepository);
    }

    @Test
    @DisplayName("searchByTitle(title) gibt eine leere Liste zurück, wenn nichts gefunden wird")
    void searchByTitle_returnsEmptyListWhenNoMatch() {
        when(gameRepository.findByTitleContainingIgnoreCase("gibtsnicht")).thenReturn(List.of());

        List<Game> result = gameService.searchByTitle("gibtsnicht");

        assertTrue(result.isEmpty());
        verify(gameRepository).findByTitleContainingIgnoreCase("gibtsnicht");
    }
}
