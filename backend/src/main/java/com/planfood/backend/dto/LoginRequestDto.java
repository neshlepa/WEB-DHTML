package com.planfood.backend.dto;

import lombok.Data;
// в таком виде нам придет от фронтенда json при попытке входа
@Data
public class LoginRequestDto {
    private String email;
    private String password;
}