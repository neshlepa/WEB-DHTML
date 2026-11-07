package com.planfood.backend.controller;

import com.planfood.backend.dto.*;
import com.planfood.backend.service.MealPlanService;
import com.planfood.backend.service.PdfExportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController // Класс принимает HTTP-запросы и отдает ответы в формате JSON
@RequestMapping("/api/meal-plans") // Базовый адрес для всех эндпоинтов плана питания
public class MealPlanController {

    private final MealPlanService mealPlanService;
    private final PdfExportService pdfExportService;

    public MealPlanController(MealPlanService mealPlanService, PdfExportService pdfExportService) {
        this.mealPlanService = mealPlanService;
        this.pdfExportService = pdfExportService;
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


    // Эндпоинт для получения сводного списка покупок (JSON) для модального окна
    @GetMapping("/shopping-list")
    public ResponseEntity<?> getShoppingList(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Доступно только авторизованным пользователям");
        }
        try {
            // Вызываем сервис, который сгруппирует продукты и посчитает цену
            ShoppingListDto shoppingList = mealPlanService.getShoppingList(principal.getName());
            return ResponseEntity.ok(shoppingList);
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body("Ошибка при формировании списка покупок: " + e.getMessage());
        }
    }


    // Эндпоинт для скачивания Плана Питания в формате PDF
    @GetMapping("/export/pdf")
    public ResponseEntity<?> exportMealPlanPdf(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Доступно только авторизованным пользователям");
        }

        try {
            String email = principal.getName();
            // Получаем данные плана из уже существующего метода
            List<MealPlanCellDto> currentPlan = mealPlanService.getCurrentPlan(email);

            // Генерируем массив байтов PDF файла
            byte[] pdfBytes = pdfExportService.generateMealPlanPdf(currentPlan);

            // Настраиваем заголовки, чтобы браузер понял, что это файл на скачивание
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            // Задаем имя файла
            headers.setContentDispositionFormData("attachment", "MealPlan.pdf");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfBytes);

        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка при генерации PDF: " + e.getMessage());
        }
    }


    // Эндпоинт для скачивания Списка Покупок в формате PDF
    @GetMapping("/shopping-list/export/pdf")
    public ResponseEntity<?> exportShoppingListPdf(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Доступно только авторизованным пользователям");
        }

        try {
            String email = principal.getName();
            // Получаем данные списка покупок из уже существующего метода
            ShoppingListDto shoppingList = mealPlanService.getShoppingList(email);

            // Генерируем массив байтов PDF файла
            byte[] pdfBytes = pdfExportService.generateShoppingListPdf(shoppingList);

            // Настраиваем заголовки
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF); // Информирует получателя о формате бинарного потока в теле ответа.
            // "attachment" принудительно активирует скачивание файла на компьютер пользователя
            headers.setContentDispositionFormData("attachment", "ShoppingList.pdf");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfBytes);

        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка при генерации PDF: " + e.getMessage());
        }
    }
}