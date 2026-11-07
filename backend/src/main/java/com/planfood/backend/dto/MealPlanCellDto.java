package com.planfood.backend.dto;

import com.planfood.backend.entity.MealType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MealPlanCellDto {
    private Integer dayNumber; // В какой день и в какой прием пищи стоит это блюдо
    private MealType mealType;

    // Вкладываем сюда уже готовую карточку рецепта (ту, которая используется в ленте)
    private RecipeCardDto recipe;
}