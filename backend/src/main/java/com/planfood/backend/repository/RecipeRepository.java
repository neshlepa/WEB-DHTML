package com.planfood.backend.repository;

import com.planfood.backend.entity.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    // В будущем здесь можно будет добавить методы для поиска,;
}