package com.planfood.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ShoppingListDto {

    private List<ShoppingItemDto> items; // Массив сгруппированных покупок
    private Double totalPrice;           // Итоговая сумма всего чека

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ShoppingItemDto {
        private String ingredientName; // Название продукта
        private Integer totalGrams;    // Суммарный требуемый вес для всего плана
        private Double estimatedPrice; // Рассчитанная стоимость конкретно этой позиции
    }
}