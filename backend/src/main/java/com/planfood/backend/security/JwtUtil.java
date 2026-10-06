package com.planfood.backend.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

// @Component говорит Spring Boot: "Создай этот объект при запуске, он нам понадобится"
@Component
public class JwtUtil {

    // Секретный ключ для подписи. Это как печать университета на студенческом билете.
    // Если кто-то попытается подделать токен, без этого ключа у него ничего не выйдет.
    // В реальном проекте его прячут в настройки сервера, но пока оставим здесь для удобства.
    // Важно: ключ должен быть длинным, иначе библиотека выдаст ошибку безопасности!
    private final String SECRET_STRING = "PlanFoodSuperSecretKeyForSecurity2026!!!";

    // Превращаем нашу текстовую строку в настоящий криптографический ключ
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET_STRING.getBytes());
    }

    // Главный метод: выдает электронный пропуск по email пользователя
    public String generateToken(String email) {
        return Jwts.builder()
                .subject(email) // Указываем, кому выдан пропуск (email)
                .issuedAt(new Date(System.currentTimeMillis())) // Время выдачи (прямо сейчас)
                .expiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60 * 24)) // Срок годности: 1 сутки (в миллисекундах)
                .signWith(getSigningKey()) // Ставим нашу несмываемую криптографическую печать
                .compact(); // Собираем всё это в одну длинную текстовую строку
    }
}