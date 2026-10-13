package com.planfood.backend.service;

import com.planfood.backend.dto.IngredientDto;
import com.planfood.backend.dto.RecipeCardDto;
import com.planfood.backend.entity.*;
import com.planfood.backend.repository.*;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service // Говорим спрингу, что это класс бизнес-логики
public class RecipeService {

    // Подключаем все нужные репозитории для работы с таблицами
    private final RecipeRepository recipeRepository;
    private final RecipeIngredientRepository recipeIngredientRepository;
    private final InteractionHistoryRepository interactionHistoryRepository;
    private final UserRepository userRepository;

    // Конструктор для внедрения зависимостей
    public RecipeService(RecipeRepository recipeRepository,
                         RecipeIngredientRepository recipeIngredientRepository,
                         InteractionHistoryRepository interactionHistoryRepository,
                         UserRepository userRepository) {
        this.recipeRepository = recipeRepository;
        this.recipeIngredientRepository = recipeIngredientRepository;
        this.interactionHistoryRepository = interactionHistoryRepository;
        this.userRepository = userRepository;
    }



    // Метод для получения ленты рецептов
    public List<RecipeCardDto> getFeed(String userEmail) {

        // Выгружаем абсолютно все рецепты из базы данных
        List<Recipe> allRecipes = recipeRepository.findAll();

        // Если email передан, значит пришел авторизованный пользователь с токеном
        if (userEmail != null) {
            Optional<User> optionalUser = userRepository.findByEmail(userEmail);

            if (optionalUser.isEmpty()) {
                throw new RuntimeException("Пользователь не найден");
            }
            User user = optionalUser.get();

            // Достаем из таблицы истории только список числовых ID тех рецептов, которые этот юзер уже свайпал
            List<Long> viewedIds = interactionHistoryRepository.findViewedRecipeIdsByUserId(user.getId());

            // Фильтруем коллекцию рецептов с помощью Stream API:
            allRecipes = allRecipes.stream()
                    // Убираем то, что уже видели
                    .filter(recipe -> !viewedIds.contains(recipe.getId()))

                    // Убираем аллергены: Collections.disjoint вернет true, только если
                    // между аллергенами юзера и рецепта НЕТ ни одного совпадения
                    .filter(recipe -> Collections.disjoint(
                            recipe.getAllergens() != null ? recipe.getAllergens() : Collections.emptySet(),
                            user.getAllergens() != null ? user.getAllergens() : Collections.emptySet()
                    ))
                    .collect(Collectors.toList());

            // сортировка по предпочтениям
            // Если у пользователя выбраны какие-то диеты/предпочтения
            if (user.getPreferences() != null && !user.getPreferences().isEmpty()) {

                // Сортируем список так, чтобы рецепты с наибольшим совпадением предпочтений оказались первыми
                allRecipes.sort((recipe1, recipe2) -> {
                    // Считаем, сколько тегов предпочтений совпало у первого рецепта
                    long matchCount1 = recipe1.getPreferences().stream()
                            .filter(user.getPreferences()::contains)
                            .count();

                    // Считаем, сколько тегов совпало у второго рецепта
                    long matchCount2 = recipe2.getPreferences().stream()
                            .filter(user.getPreferences()::contains)
                            .count();

                    // Сравниваем в обратном порядке (по убыванию), чтобы большие совпадения были наверху
                    return Long.compare(matchCount2, matchCount1);
                });
            }
        } else {
            // этап для гостей
            // просто перемешиваем все рецепты, чтобы при каждом заходе лента была разной
            Collections.shuffle(allRecipes);
        }

        // Превращаем оставшиеся рецепты из сущностей базы данных в DTO-карточки с расчетом КБЖУ:
        // берем каждый Recipe, пропускаем через метод mapToRecipeCardDto и собираем в итоговый List<RecipeCardDto>
        return allRecipes.stream()
                .map(this::mapToRecipeCardDto)
                .limit(10) // Отдаем фронтенду только первые 10 карточек за один запрос (пачками)
                .collect(Collectors.toList());
    }


    // метод для сохранения свайпов
    public void saveReaction(String userEmail, Long recipeId, InteractionType type) {

        Optional<User> optionalUser = userRepository.findByEmail(userEmail);
        if (optionalUser.isEmpty()) {
            throw new RuntimeException("Пользователь не найден");
        }
        User user = optionalUser.get();

        // Ищем рецепт, на который поставили лайк/дизлайк
        Optional<Recipe> optionalRecipe = recipeRepository. findById(recipeId);
        if (optionalRecipe.isEmpty()){
            throw new RuntimeException("рецепт не найден");
        }
        Recipe recipe = optionalRecipe.get();

        // Создаем новую запись для таблицы interaction_history
        InteractionHistory history = new InteractionHistory();
        history.setUser(user);
        history.setRecipe(recipe);
        history.setInteractionType(type);
        history.setTimestamp(LocalDateTime.now()); // ставим точное время

        interactionHistoryRepository.save(history);
    }


    // метод для подсчета кбжу и конвертации в нужный дто
    private RecipeCardDto mapToRecipeCardDto(Recipe recipe) {

        // Достаем все строчки из связующей таблицы recipe_ingredients для данного рецепта
        List<RecipeIngredient> recipeIngredients = recipeIngredientRepository.findByRecipeId(recipe.getId());

        // Заводим счетчики для суммарного КБЖУ
        double totalCalories = 0.0;
        double totalProtein = 0.0;
        double totalFat = 0.0;
        double totalCarbohydrates = 0.0;

        // Заводим пустой список для DTO ингредиентов
        List<IngredientDto> ingredientDtos = new ArrayList<>();

        // Проходимся циклом по каждому продукту в рецепте
        for (RecipeIngredient ri : recipeIngredients) {
            Ingredient ingredient = ri.getIngredient(); // Достаем сам продукт (например, Курицу)

            // В базе КБЖУ указано на 100 грамм
            // Если в рецепте нужно 250 грамм, мы делим 250 на 100 = 2.5 (это наш множитель factor)
            double factor = ri.getAmountGrams() / 100.0;

            // Умножаем базовое КБЖУ на множитель и прибавляем к общей сумме
            totalCalories += ingredient.getCalories() * factor;
            totalProtein += ingredient.getProtein() * factor;
            totalFat += ingredient.getFat() * factor;
            totalCarbohydrates += ingredient.getCarbohydrates() * factor;

            // Добавляем название и граммовку в итоговый список для фронтенда
            ingredientDtos.add(new IngredientDto(ingredient.getName(), ri.getAmountGrams()));
        }

        // Собираем и возвращаем готовую карточку
        // Используем Math.round(val * 10.0) / 10.0 для округления до 1 знака после запятой
        return new RecipeCardDto(
                recipe.getId(),
                recipe.getName(),
                recipe.getPhotoUrl(),
                recipe.getTime(),
                recipe.getDifficulty(),
                recipe.getInstruction(),
                Math.round(totalCalories * 10.0) / 10.0,
                Math.round(totalProtein * 10.0) / 10.0,
                Math.round(totalFat * 10.0) / 10.0,
                Math.round(totalCarbohydrates * 10.0) / 10.0,
                ingredientDtos
        );
    }
}