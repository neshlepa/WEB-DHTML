package com.planfood.backend.controller;

import com.planfood.backend.dto.MealPlanCellDto;
import com.planfood.backend.dto.MealPlanSaveRequestDto;
import com.planfood.backend.dto.RecipeCardDto;
import com.planfood.backend.dto.SuggestRecipeRequestDto;
import com.planfood.backend.service.MealPlanService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController // Класс принимает HTTP-запросы и отдает ответы в формате JSON
@RequestMapping("/api/meal-plans") // Базовый адрес для всех эндпоинтов плана питания
public class MealPlanController {

    private final MealPlanService mealPlanService;

    public MealPlanController(MealPlanService mealPlanService) {
        this.mealPlanService = mealPlanService;
    }


    @GetMapping // Эндпоинт сработает при GET-запросе на адрес /api/meal-plans
    public ResponseEntity<?> getMealPlan(Principal principal) {

        // только авторизованные пользователи с JWT-токеном могут запрашивать план
        if (principal == null) {
            return ResponseEntity.status(401).body("Доступно только авторизованным пользователям");
        }

        // Достаем email из токена пользователя
        String email = principal.getName();

        // Идем в сервис и просим собрать план питания
        List<MealPlanCellDto> currentPlan = mealPlanService.getCurrentPlan(email);

        return ResponseEntity.ok(currentPlan);
    }


    // Эндпоинт сохранения готового плана питания
    @PostMapping
    public ResponseEntity<?> saveMealPlan(@RequestBody MealPlanSaveRequestDto requestDto, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Доступно только авторизованным пользователям");
        }
        try {
            mealPlanService.saveMealPlan(principal.getName(), requestDto);
            return ResponseEntity.ok("План питания успешно сохранен");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }


    // Эндпоинт для сброса/удаления плана (кнопка "Пересоздать план")
    @DeleteMapping
    public ResponseEntity<?> deleteMealPlan(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Доступно только авторизованным пользователям");
        }
        try {
            mealPlanService.deleteCurrentPlan(principal.getName());
            return ResponseEntity.ok("План питания успешно удален");
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body("Ошибка при удалении плана: " + e.getMessage());
        }
    }


    // Эндпоинт для генерации/замены блюда в ячейке (с учетом скипнутых рецептов)
    @PostMapping("/suggest")
    public ResponseEntity<?> suggestRecipe(@RequestBody SuggestRecipeRequestDto request, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Доступно только авторизованным пользователям");
        }

        try {
            // Возвращаем готовую карточку одного сгенерированного блюда
            RecipeCardDto suggestedRecipe = mealPlanService.suggestRecipe(principal.getName(), request);
            return ResponseEntity.ok(suggestedRecipe);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}