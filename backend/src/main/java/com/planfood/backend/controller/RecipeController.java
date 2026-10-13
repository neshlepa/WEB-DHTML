package com.planfood.backend.controller;

import com.planfood.backend.dto.ReactionRequestDto;
import com.planfood.backend.dto.RecipeCardDto;
import com.planfood.backend.service.RecipeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController // Означает, что все ответы будут уходить в формате JSON
@RequestMapping("/api/recipes")
public class RecipeController {

    private final RecipeService recipeService;

    public RecipeController(RecipeService recipeService) {
        this.recipeService = recipeService;
    }


    // эндпоинт получения ленты (доступен всем пользователям, даже без авторизации)
    @GetMapping("/feed")
    public ResponseEntity<List<RecipeCardDto>> getFeed(Principal principal) {

        // Если гость (нет токена), то principal == null.
        // Передаем в сервис null, чтобы он не пытался фильтровать просмотренное
        String email = (principal != null) ? principal.getName() : null;

        // Получаем готовый список карточек от сервиса
        List<RecipeCardDto> feed = recipeService.getFeed(email);

        return ResponseEntity.ok(feed); // Отдаем статус 200 и JSON
    }

    // эндпоинт сохранения реации на рецепт
    // {id} - это переменная пути. Фронтенд подставит сюда ID рецепта
    @PostMapping("/{id}/react")
    public ResponseEntity<?> reactToRecipe(@PathVariable Long id, @RequestBody ReactionRequestDto reactionDto, Principal principal) {
        // @RequestBody берет сырой JSON из входящего запроса и автоматически конвертирует его в Java-объект ReactionRequestDto

        if (principal == null) { // защита от неавторизированного пользователя
            return ResponseEntity.status(401).body("Гости не могут сохранять реакции");
        }

        try {
            // Передаем почту, ID рецепта из URL и сам тип реакции из JSON
            recipeService.saveReaction(principal.getName(), id, reactionDto.getReaction());
            return ResponseEntity.ok("Реакция сохранена");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}