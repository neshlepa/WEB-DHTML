package com.planfood.backend.repository;

import com.planfood.backend.entity.InteractionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InteractionHistoryRepository extends JpaRepository<InteractionHistory, Long> {
    // Позже здесь появится метод для алгоритма "Тиндера",
    // чтобы доставать все лайкнутые рецепты конкретного пользователя
}