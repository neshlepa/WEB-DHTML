package com.planfood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

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
}