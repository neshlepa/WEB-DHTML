package com.planfood.backend.dto;

import com.planfood.backend.entity.MealType;
import lombok.Data;

import java.util.List;
// это дто для замены карточки рецепта при создание плана питания
@Data
public class SuggestRecipeRequestDto {
    private MealType mealType;
    // Список ID рецептов, которые фронтенд просит больше не предлагать в этот раз
    private List<Long> skippedRecipeIds;
}