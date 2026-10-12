package com.planfood.backend.repository;

import com.planfood.backend.entity.RecipeIngredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecipeIngredientRepository extends JpaRepository<RecipeIngredient, Long> {

    // Метод вернет все строчки-связки продуктов для конкретного блюда
    List<RecipeIngredient> findByRecipeId(Long recipeId);

}

