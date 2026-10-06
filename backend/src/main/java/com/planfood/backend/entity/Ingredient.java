package com.planfood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "ingredients")
public class Ingredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Уникальный номер продукта

    @Column(nullable = false) // Название обязательно
    private String name;

    // Блок базового КБЖУ (из расчета на 100 грамм) (Double для точных расчетов)

    @Column(nullable = false)
    private Double calories; // Калорийность

    @Column(nullable = false)
    private Double protein; // Белки

    @Column(nullable = false)
    private Double fat; // Жиры

    @Column(nullable = false)
    private Double carbohydrates; // Углеводы

    @Column(nullable = false, name = "base_price")
    private Double basePrice; // Средняя цена продукта за 100 грамм
}