package com.planfood.backend.controller;

import com.planfood.backend.dto.ReactionRequestDto;
import com.planfood.backend.dto.RecipeCardDto;
import com.planfood.backend.entity.InteractionType;
import com.planfood.backend.service.RecipeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.security.Principal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecipeControllerTest {

    @Mock RecipeService recipeService;
    @InjectMocks RecipeController controller;

    private final Principal principal = () -> "u@mail.ru";

    private ReactionRequestDto reaction(InteractionType type) {
        ReactionRequestDto dto = new ReactionRequestDto();
        dto.setReaction(type);
        return dto;
    }

    @Test
    @DisplayName("GET /feed: гость (principal == null) → в сервис уходит null, ответ 200")
    void feed_guest_passesNull() {
        List<RecipeCardDto> cards = List.of(new RecipeCardDto());
        when(recipeService.getFeed(null)).thenReturn(cards);

        ResponseEntity<List<RecipeCardDto>> resp = controller.getFeed(null);

        assertEquals(200, resp.getStatusCode().value());
        assertSame(cards, resp.getBody());
    }

    @Test
    @DisplayName("GET /feed: авторизованный → в сервис уходит email из токена")
    void feed_authorized_passesEmail() {
        when(recipeService.getFeed("u@mail.ru")).thenReturn(List.of());

        ResponseEntity<List<RecipeCardDto>> resp = controller.getFeed(principal);

        assertEquals(200, resp.getStatusCode().value());
        verify(recipeService).getFeed("u@mail.ru");
    }

    @Test
    @DisplayName("POST /react: без авторизации → 401, сервис не вызывается")
    void react_guest_returns401() {
        ResponseEntity<?> resp = controller.reactToRecipe(1L, reaction(InteractionType.LIKE), null);

        assertEquals(401, resp.getStatusCode().value());
        verify(recipeService, never()).saveReaction(any(), anyLong(), any());
    }

    @Test
    @DisplayName("POST /react: успех → 200, в сервис передаются email, id рецепта и тип реакции")
    void react_success() {
        ResponseEntity<?> resp = controller.reactToRecipe(5L, reaction(InteractionType.FAVORITE), principal);

        assertEquals(200, resp.getStatusCode().value());
        assertEquals("Реакция сохранена", resp.getBody());
        verify(recipeService).saveReaction("u@mail.ru", 5L, InteractionType.FAVORITE);
    }

    @Test
    @DisplayName("POST /react: рецепт не найден → 400 с текстом ошибки")
    void react_serviceError_returns400() {
        doThrow(new RuntimeException("рецепт не найден"))
                .when(recipeService).saveReaction("u@mail.ru", 999L, InteractionType.LIKE);

        ResponseEntity<?> resp = controller.reactToRecipe(999L, reaction(InteractionType.LIKE), principal);

        assertEquals(400, resp.getStatusCode().value());
        assertEquals("рецепт не найден", resp.getBody());
    }
}
