package com.planfood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "interaction_history")
public class InteractionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne // у одного User может быть много записей в истории, но эта конкретная запись принадлежит только одному User
    @JoinColumn(name = "user_id", nullable = false) // В БД будет создана колонка user_id, которая будет ссылаться на таблицу users
    private User user;

    @ManyToOne // Много действий к Одному рецепту
    @JoinColumn(name = "recipe_id", nullable = false)
    private Recipe recipe;

    @Enumerated(EnumType.STRING) // сохраняем не порядковый номер статуса (0, 1, 2), а само слово ("LIKE", "DISLIKE")
    @Column(nullable = false)
    private InteractionType interactionType; // Тип действия: Лайк / Дизлайк / Избранное

    @Column(nullable = false)
    private LocalDateTime timestamp; // Точная дата и время действия
}