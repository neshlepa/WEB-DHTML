package com.planfood.backend.entity;

import jakarta.persistence.*; // инструменты Jakarta Persistence API (стандарт Java для баз данных)
import lombok.Data; // чтобы не писать технический код руками
import java.util.HashSet;
import java.util.Set;

@Data // Lombok: автоматически создаст скрытые методы (геттеры, сеттеры), чтобы мы могли писать user.getEmail() и user.setEmail()
@Entity // Главная аннотация Hibernate. (говорим, что этот класс - это чертеж для таблицы)
@Table(name = "users") // Явно задаем имя таблицы в БД

public class User {

    @Id // Указывает, что это поле будет Первичным ключом (Primary Key). По нему БД отличает пользователей друг от друга
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Говорит PostgreSQL выдавать айди по порядку
    private Long id;

    @Column(unique = true, nullable = false) // unique = true (запрещает дубликаты), nullable = false (поле не может быть пустым)
    private String email;

    @Column(nullable = false) // будет храниться не пароль, а его хэш
    private String passwordHash;

    // Блок биометрии
    // У этих полей нет nullable = false, так как при первой регистрации пользователь их еще не знает/не ввел

    @Column(name = "gender")
    private String gender;

    @Column(name = "age")
    private Integer age;

    @Column(name = "height")
    private Integer height;

    @Column(name = "weight")
    private Double weight; // дабл, потому что вес мб дробный

    // Список аллергенов пользователя
    // указывает JPA, что это не отдельная независимая сущность со своим ID,
    // а коллекция простых значений, полностью принадлежащих пользователю
    @ElementCollection(targetClass = Allergen.class)
    @Enumerated(EnumType.STRING)
    @CollectionTable(
            name = "user_allergens", // имя отдельной связующей таблицы
            joinColumns = @JoinColumn(name = "user_id") // имя колонки внешнего ключа
    )
    @Column(name = "allergen")
    private Set<Allergen> allergens = new HashSet<>();

    // Список диетических предпочтений пользователя
    @ElementCollection(targetClass = DietaryPreference.class)
    @Enumerated(EnumType.STRING)
    @CollectionTable(
            name = "user_preferences",
            joinColumns = @JoinColumn(name = "user_id")
    )
    @Column(name = "preference")
    private Set<DietaryPreference> preferences = new HashSet<>();
}