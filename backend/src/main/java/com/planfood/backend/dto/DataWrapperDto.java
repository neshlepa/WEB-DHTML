package com.planfood.backend.dto;

import com.planfood.backend.entity.Ingredient;
import lombok.Data;
import java.util.List;

// Этот класс описывает самую верхнюю структуру файла recipes.json

@Data
public class DataWrapperDto {
    private List<Ingredient> ingredients;
    private List<RecipeJsonDto> recipes;
}