package com.planfood.backend.dto;

import com.planfood.backend.entity.MealType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MealPlanSaveRequestDto {

    // Список заполненных ячеек сетки
    private List<CellDto> cells;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CellDto {
        private Integer dayNumber;
        private MealType mealType;
        private Long recipeId;
    }
}