package com.planfood.backend.repository;

import com.planfood.backend.entity.MealPlan;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MealPlanRepository extends JpaRepository<MealPlan, Long> {

    // все строчки в таблице meal_plans, где email пользователя совпадает с переданным
    List<MealPlan> findByUserEmail(String email);


    // Удаляет все записи плана питания конкретного пользователя
    @Modifying // аннотации, которые говорят, что метод будет изменять бд
    @Transactional
    @Query("DELETE FROM MealPlan mp WHERE mp.user.email = :email")
    void deleteByUserEmail(@Param("email") String email);

}