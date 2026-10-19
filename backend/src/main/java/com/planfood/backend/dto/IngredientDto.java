package com.planfood.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Этот класс описывает один ингредиент внутри карточки рецепта

@Data
@AllArgsConstructor
@NoArgsConstructor
public class IngredientDto {
    private String name; // Название ингредиента
    private Integer amountGrams; // Сколько граммов нужно именно для этого блюда
}