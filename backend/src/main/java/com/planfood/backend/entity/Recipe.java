package com.planfood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.util.HashSet;
import java.util.Set;

@Data
@Entity
@Table(name = "recipes")
public class Recipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Уникальный номер блюда

    @Column(nullable = false)
    private String name; // Название рецепта

    @Column(name = "photo_url")
    private String photoUrl; // Ссылка на картинку для интерфейса

    @Column(name = "cooking_time")
    private Integer time; // Время приготовления (в минутах)

    @Column(nullable = false)
    private Integer difficulty; // Уровень сложности от 1 до 5 (по ТЗ будут отображаться звездочки)

    // По умолчанию String в базе данных превращается в тип VARCHAR(255) с лимитом в 255 символов.
    // Рецепт точно будет длиннее, поэтому мы принудительно говорим БД использовать безлимитный тип TEXT.
    @Column(columnDefinition = "TEXT")
    private String instruction; // Текстовая инструкция

    // Список аллергенов, которые содержатся в этом рецепте
    @ElementCollection(targetClass = Allergen.class)
    @Enumerated(EnumType.STRING)
    @CollectionTable(
            name = "recipe_allergens",
            joinColumns = @JoinColumn(name = "recipe_id")
    )
    @Column(name = "allergen")
    private Set<Allergen> allergens = new HashSet<>();

    // Список диет, которым соответствует этот рецепт (например, VEGAN, HIGH_PROTEIN)
    @ElementCollection(targetClass = DietaryPreference.class)
    @Enumerated(EnumType.STRING)
    @CollectionTable(
            name = "recipe_preferences",
            joinColumns = @JoinColumn(name = "recipe_id")
    )
    @Column(name = "preference")
    private Set<DietaryPreference> preferences = new HashSet<>();
}