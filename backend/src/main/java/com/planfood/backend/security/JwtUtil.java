package com.planfood.backend.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import io.jsonwebtoken.JwtException;

// @Component говорит Spring Boot создать объект этого класса при запуске
@Component
public class JwtUtil {
    private final String SECRET_STRING = "PlanFoodSuperSecretKeyForSecurity2026!!!"; // НЕ ЗАБЫТЬ СПРЯТАТЬ КЛЮЧ НА СЕРВЕРЕ

    // Превращаем нашу текстовую строку в настоящий криптографический ключ
    private SecretKey getSigningKey() { // классы, реализующие интерфейс сикреткей умеют защищать данные в оперативной памяти
        return Keys.hmacShaKeyFor(SECRET_STRING.getBytes()); // метод из библиотеки
    }


    //  выдает электронный пропуск по email пользователя
    public String generateToken(String email) {
        return Jwts.builder()
                .subject(email) // Указываем, кому выдан пропуск (email)
                .issuedAt(new Date(System.currentTimeMillis())) // Время выдачи (прямо сейчас)
                .expiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60 * 24)) // Срок годности: 1 сутки (в миллисекундах)
                .signWith(getSigningKey()) // Ставим нашу криптографическую печать
                .compact(); // Собираем всё это в одну длинную текстовую строку
    }


    // Метод проверяет, не подделан ли токен и не истек ли срок его годности
    public boolean validateToken(String token) {
        try {
            // Пытаемся расшифровать токен нашим секретным ключом
            Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false; // Токен подделан, просрочен или пуст
        }
    }


    // Метод достает email (subject) из полезной нагрузки токена
    public String extractEmail(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload() // значение поля клаймс это дата выпуска и дата истечения токена
                .getSubject(); // значение поля сабджект это почта
    }
}