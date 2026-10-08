package com.planfood.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

// в таком виде фронтеду отправится токен пользователя
@Data
public class AuthResponseDto {
    private String token;

    public AuthResponseDto(String token) {
        this.token = token;
    }
}