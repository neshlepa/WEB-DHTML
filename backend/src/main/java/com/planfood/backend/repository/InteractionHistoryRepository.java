package com.planfood.backend.repository;

import com.planfood.backend.entity.InteractionHistory;
import com.planfood.backend.entity.InteractionType;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InteractionHistoryRepository extends JpaRepository<InteractionHistory, Long> {

    // Достать только ID рецептов из истории взаимодействий, где ID пользователя совпадает с переданным
    // квери это аннотация из библиотеки Spring Data JPA, она говорит не парсить имя метода, а просто выполнить
    // переданый запрос
    @Query("SELECT ih.recipe.id FROM InteractionHistory ih WHERE ih.user.id = :userId")
    List<Long> findViewedRecipeIdsByUserId(@Param("userId") Long userId); // парам подставляет значение userid в запрос

    @Modifying // аннотации, которые говорят, что метод будет изменять бд
    @Transactional
    @Query("DELETE FROM InteractionHistory ih WHERE ih.interactionType IN :types")
    void deleteByInteractionTypeIn(@Param("types") List<InteractionType> types);


}

