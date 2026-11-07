package com.planfood.backend.service;

import com.planfood.backend.dto.MealPlanCellDto;
import com.planfood.backend.dto.MealPlanSaveRequestDto;
import com.planfood.backend.dto.RecipeCardDto;
import com.planfood.backend.dto.SuggestRecipeRequestDto;
import com.planfood.backend.entity.MealPlan;
import com.planfood.backend.entity.Recipe;
import com.planfood.backend.entity.User;
import com.planfood.backend.repository.MealPlanRepository;
import com.planfood.backend.repository.RecipeRepository;
import com.planfood.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MealPlanService {

    private final MealPlanRepository mealPlanRepository;
    private final RecipeService recipeService; // чтобы переиспользовать методы для подсчета кбжу
    private final UserRepository userRepository;
    private final RecipeRepository recipeRepository;

    public MealPlanService(MealPlanRepository mealPlanRepository,
                           RecipeService recipeService,
                           UserRepository userRepository,
                           RecipeRepository recipeRepository) {
        this.mealPlanRepository = mealPlanRepository;
        this.recipeService = recipeService;
        this.userRepository = userRepository;
        this.recipeRepository = recipeRepository;
    }


    // Метод получения текущего плана пользователя
    public List<MealPlanCellDto> getCurrentPlan(String email) {

        // Достаем все записи (все ячейки) из базы данных для текущего юзера
        List<MealPlan> plans = mealPlanRepository.findByUserEmail(email);

        // Превращаем список сущностей БД (MealPlan) в список DTO для фронтенда (MealPlanCellDto)
        return plans.stream().map(plan -> {
            MealPlanCellDto dto = new MealPlanCellDto();
            dto.setDayNumber(plan.getDayNumber()); // Перекладываем номер дня
            dto.setMealType(plan.getMealType());   // Перекладываем тип приема пищи

            // Вызываем публичный метод из RecipeService, который сам посчитает КБЖУ и соберет карточку рецепта
            dto.setRecipe(recipeService.mapToRecipeCardDto(plan.getRecipe()));

            return dto;
        }).collect(Collectors.toList()); // Собираем обратно в список
    }


    // Сохранение нового плана питания
    @Transactional // Гарантирует атомарность: либо сохранится весь план, либо ничего
    public void saveMealPlan(String email, MealPlanSaveRequestDto requestDto) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        // Удаляем старый план (так как у пользователя хранится ровно один актуальный план)
        mealPlanRepository.deleteByUserEmail(email);

        // Если пришел пустой список ячеек, просто завершаем выполнение
        if (requestDto.getCells() == null || requestDto.getCells().isEmpty()) {
            return;
        }

        // Создаем список новых записей для БД
        List<MealPlan> newPlanEntries = new ArrayList<>();

        for (MealPlanSaveRequestDto.CellDto cell : requestDto.getCells()) {
            // Находим рецепт по его ID
            Recipe recipe = recipeRepository.findById(cell.getRecipeId())
                    .orElseThrow(() -> new RuntimeException("Рецепт с ID " + cell.getRecipeId() + " не найден"));

            MealPlan mealPlan = new MealPlan();
            mealPlan.setUser(user);
            mealPlan.setRecipe(recipe);
            mealPlan.setDayNumber(cell.getDayNumber());
            mealPlan.setMealType(cell.getMealType());

            newPlanEntries.add(mealPlan);
        }

        // сохраняем все записи плана в таблицу meal_plans
        mealPlanRepository.saveAll(newPlanEntries);
    }


    // Метод для полного сброса плана питания (при нажатии "Пересоздать план")
    @Transactional // Гарантирует, что удаление пройдет безопасно
    public void deleteCurrentPlan(String email) {
        mealPlanRepository.deleteByUserEmail(email);
    }


    // Метод для автогенерации одного подходящего блюда (с учетом скипов и типа приема пищи)
    public RecipeCardDto suggestRecipe(String email, SuggestRecipeRequestDto request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        // Достаем все рецепты
        List<Recipe> allRecipes = recipeRepository.findAll();

        // Оставляем только те рецепты, у которых в списке тегов mealTypes есть нужный нам тип (например, BREAKFAST)
        if (request.getMealType() != null) {
            allRecipes = allRecipes.stream()
                    .filter(recipe -> recipe.getMealTypes() != null && recipe.getMealTypes().contains(request.getMealType()))
                    .collect(Collectors.toList());
        }

        // Отсеиваем те рецепты, которые пользователь уже скипнул в этой ячейке
        if (request.getSkippedRecipeIds() != null && !request.getSkippedRecipeIds().isEmpty()) {
            allRecipes = allRecipes.stream()
                    .filter(recipe -> !request.getSkippedRecipeIds().contains(recipe.getId()))
                    .collect(Collectors.toList());
        }

        // Отсеиваем рецепты с аллергенами пользователя (жесткий фильтр)
        allRecipes = allRecipes.stream()
                .filter(recipe -> Collections.disjoint(
                        recipe.getAllergens() != null ? recipe.getAllergens() : Collections.emptySet(),
                        user.getAllergens() != null ? user.getAllergens() : Collections.emptySet()
                ))
                .collect(Collectors.toList());

        // Если рецепты закончились
        if (allRecipes.isEmpty()) {
            throw new RuntimeException("Больше нет подходящих рецептов для этого приема пищи");
        }

        // Перемешиваем список, чтобы при одинаковых совпадениях выдача была случайной
        Collections.shuffle(allRecipes);

        // Сортируем по диетическим предпочтениям (мягкий фильтр)
        if (user.getPreferences() != null && !user.getPreferences().isEmpty()) {
            allRecipes.sort((r1, r2) -> {
                long matchCount1 = r1.getPreferences().stream().filter(user.getPreferences()::contains).count();
                long matchCount2 = r2.getPreferences().stream().filter(user.getPreferences()::contains).count();
                return Long.compare(matchCount2, matchCount1);
            });
        }

        // Возвращаем лучший вариант, конвертируя его в карточку
        Recipe bestMatch = allRecipes.get(0);
        return recipeService.mapToRecipeCardDto(bestMatch);
    }
}