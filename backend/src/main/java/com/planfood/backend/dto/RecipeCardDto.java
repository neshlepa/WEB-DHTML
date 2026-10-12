package com.planfood.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

// Главная карточка, которая полетит на фронтенд для показа главной страницы сайта

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RecipeCardDto {
    private Long id; // Нужен фронтенду, чтобы потом отправить нам лайк/дизлайк на этот ID
    private String name;
    private String photoUrl;
    private Integer time;
    private Integer difficulty;
    private String instruction;

    // Суммарное КБЖУ (заранее посчитано на сервере)
    private Double totalCalories;
    private Double totalProtein;
    private Double totalFat;
    private Double totalCarbohydrates;

    // Вложенный список продуктов, необходимых для блюда
    private List<IngredientDto> ingredients;
}