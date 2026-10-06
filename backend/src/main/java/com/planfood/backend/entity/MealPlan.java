package com.planfood.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "meal_plans")
public class MealPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne // Рацион принадлежит конкретному пользователю
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne // Какое именно блюдо запланировано
    @JoinColumn(name = "recipe_id", nullable = false)
    private Recipe recipe;

    @Column(name = "plan_date", nullable = false)
    private LocalDate date; // На какой день запланировано блюдо (только дата, без времени)

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", nullable = false)
    private MealType mealType; // Завтрак, обед, перекус или ужин
}