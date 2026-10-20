package com.planfood.backend.component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.planfood.backend.dto.DataWrapperDto;
import com.planfood.backend.dto.RecipeJsonDto;
import com.planfood.backend.entity.Ingredient;
import com.planfood.backend.entity.Recipe;
import com.planfood.backend.entity.RecipeIngredient;
import com.planfood.backend.repository.IngredientRepository;
import com.planfood.backend.repository.RecipeIngredientRepository;
import com.planfood.backend.repository.RecipeRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.Optional;

@Component
public class DataLoader implements CommandLineRunner {

    private final IngredientRepository ingredientRepository;
    private final RecipeRepository recipeRepository;
    private final RecipeIngredientRepository recipeIngredientRepository;
    private final ObjectMapper objectMapper;

    public DataLoader(IngredientRepository ingredientRepository,
                      RecipeRepository recipeRepository,
                      RecipeIngredientRepository recipeIngredientRepository) { // <-- Убрали ObjectMapper отсюда!

        this.ingredientRepository = ingredientRepository;
        this.recipeRepository = recipeRepository;
        this.recipeIngredientRepository = recipeIngredientRepository;

        // класс-переводчик между текстовым форматом JSON и Java-объектами
        this.objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
    }


    @Override
    public void run(String... args) throws Exception {
        // Проверяем, пустая ли база. Если в базе уже есть рецепты - ничего не делаем,
        // чтобы не дублировать данные при каждом перезапуске сервера.
        if (recipeRepository.count() > 0) {
            System.out.println("База данных уже заполнена. Пропуск загрузки.");
            return;
        }

        System.out.println("Начинаем загрузку данных из recipes.json...");

        // Читаем файл recipes.json из папки src/main/resources
        ClassPathResource resource = new ClassPathResource("recipes.json");

        try (InputStream inputStream = resource.getInputStream()) {
            // (библиотека Jackson) превращаем весь JSON в Java-объект DataWrapperDto
            DataWrapperDto dataWrapper = objectMapper.readValue(inputStream, DataWrapperDto.class);

            // Сохраняем все ингредиенты в базу
            if (dataWrapper.getIngredients() != null) {
                ingredientRepository.saveAll(dataWrapper.getIngredients());
                System.out.println("Ингредиенты успешно сохранены!");
            }

            // Проходим по каждому рецепту из JSON
            if (dataWrapper.getRecipes() != null) {
                for (RecipeJsonDto recipeDto : dataWrapper.getRecipes()) {

                    // Создаем сущность Recipe
                    Recipe recipe = new Recipe();
                    recipe.setName(recipeDto.getName());
                    recipe.setPhotoUrl(recipeDto.getPhotoUrl());
                    recipe.setTime(recipeDto.getTime());
                    recipe.setDifficulty(recipeDto.getDifficulty());
                    recipe.setInstruction(recipeDto.getInstruction());
                    recipe.setAllergens(recipeDto.getAllergens());
                    recipe.setPreferences(recipeDto.getDietaryPreferences());

                    // Сначала сохраняем сам рецепт, чтобы получить его ID из базы
                    Recipe savedRecipe = recipeRepository.save(recipe);

                    // Обрабатываем состав блюда (recipeIngredients)
                    if (recipeDto.getRecipeIngredients() != null) {
                        for (RecipeJsonDto.RecipeIngredientJsonDto riDto : recipeDto.getRecipeIngredients()) {

                            // Ищем ингредиент в базе по его названию
                            Optional<Ingredient> optionalIngredient = ingredientRepository.findByName(riDto.getIngredientName());

                            if (optionalIngredient.isPresent()) {
                                // Создаем связующую сущность
                                RecipeIngredient recipeIngredient = new RecipeIngredient();
                                recipeIngredient.setRecipe(savedRecipe);
                                recipeIngredient.setIngredient(optionalIngredient.get());
                                recipeIngredient.setAmountGrams(riDto.getAmountGrams());

                                // Сохраняем связь в таблицу
                                recipeIngredientRepository.save(recipeIngredient);
                            } else {
                                System.err.println("Внимание: Ингредиент не найден в базе - " + riDto.getIngredientName());
                            }
                        }
                    }
                }
                System.out.println("Рецепты успешно сохранены!");
            }
        } catch (Exception e) {
            System.err.println("Ошибка при загрузке данных: " + e.getMessage());
        }
    }
}