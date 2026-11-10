package com.planfood.backend.dto;

import com.planfood.backend.entity.Allergen;
import com.planfood.backend.entity.DietaryPreference;
import com.planfood.backend.entity.MealType; // Обязательно импортируем наш Enum
import lombok.Data;

import java.util.List;
import java.util.Set;

@Data
public class RecipeJsonDto {
    private String name;
    private String photoUrl;
    private Integer time;
    private Integer difficulty;
    private String instruction;
    private Set<DietaryPreference> dietaryPreferences;
    private Set<Allergen> allergens;

    // Множество тегов, для каких приемов пищи подходит рецепт
    private Set<MealType> mealTypes;

    private List<RecipeIngredientJsonDto> recipeIngredients;

    @Data
    public static class RecipeIngredientJsonDto {
        private String ingredientName;
        private Integer amountGrams;
    }
}