package com.planfood.backend.repository;

import com.planfood.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository // подсказывает Spring, что этот интерфейс отвечает за общение с базой данных

// Мы наследуем JpaRepository. В угловых скобках указываем <с какой сущностью работаем, тип первичного ключа>
public interface UserRepository extends JpaRepository<User, Long> {

    // Spring Data JPA умеет сам писать SQL-запросы просто по названию метода!
    // Мы пишем "findByEmail", и Spring автоматически переведет это в:
    // SELECT * FROM users WHERE email = ?

    /* Возвращаемое значение Optional<User>. Optional — это специальная "коробка", которая говорит
    внутри может лежать пользователь, а если пользователя с такой почтой в базе нет, то внутри пусто
    */
    Optional<User> findByEmail(String email);

    // Этот метод переведется в запрос: SELECT COUNT(*) > 0 FROM users WHERE email = ?
    // Мы будем использовать его при регистрации. Если он вернет true,
    // значит почта уже занята, и нужно выдать клиенту ошибку.
    boolean existsByEmail(String email); // проверка занята ли почта
}