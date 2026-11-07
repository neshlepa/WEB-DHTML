package com.planfood.backend.repository;

import com.planfood.backend.entity.InteractionHistory;
import com.planfood.backend.entity.InteractionType;
import com.planfood.backend.entity.Recipe;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
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


    // Достаем рецепты конкретного юзера по типу реакции, сортируя от свежих к старым (пейджебл штука которая поможет не загружать в оперативку все рецепты, а только нужные)
    @Query("SELECT ih.recipe FROM InteractionHistory ih WHERE ih.user.email = :email AND ih.interactionType = :type ORDER BY ih.timestamp DESC")
    List<Recipe> findRecipesByEmailAndType(@Param("email") String email, @Param("type") InteractionType type, Pageable pageable);


    // Достаем все уникальные рецепты пользователя, у которых тип реакции входит в переданный список (LIKE, FAVORITE)
    // DISTINCT гарантирует, что если блюдо и лайкнуто, и в избранном, оно вернется ровно один раз
    @Query("SELECT DISTINCT ih.recipe FROM InteractionHistory ih " +
            "WHERE ih.user.email = :email AND ih.interactionType IN :types " +
            "ORDER BY ih.recipe.name ASC")
    List<Recipe> findDistinctRecipesByEmailAndTypes(
            @Param("email") String email,
            @Param("types") Collection<InteractionType> types
    );
}

