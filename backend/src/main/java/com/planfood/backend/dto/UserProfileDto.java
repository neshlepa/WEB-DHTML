package com.planfood.backend.dto;

import com.planfood.backend.entity.Allergen;
import com.planfood.backend.entity.DietaryPreference;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@AllArgsConstructor // конструктор без параметров
@NoArgsConstructor // конструктор со всеми параметрами
public class UserProfileDto {
    private String email;
    private String gender;
    private Integer age;
    private Integer height;
    private Double weight;
    private Set<Allergen> allergens;
    private Set<DietaryPreference> preferences;
}