package com.planfood.backend.dto; // DTO (Data Transfer Object)

import lombok.Data;
@Data
public class RegisterRequest {
    // Этот класс строго описывает структуру JSON, которую ждем от фронтенда
    private String email;
    private String password;
}