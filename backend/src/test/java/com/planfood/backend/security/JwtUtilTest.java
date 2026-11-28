package com.planfood.backend.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private final JwtUtil jwtUtil = new JwtUtil();
    // тот же секрет, что в JwtUtil — нужен, чтобы собрать «просроченный» токен
    private static final String SECRET = "PlanFoodSuperSecretKeyForSecurity2026!!!";

    private SecretKey key(String secret) {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    @DisplayName("Выданный токен валиден и содержит email")
    void generatedToken_isValid_andContainsEmail() {
        String token = jwtUtil.generateToken("user@mail.ru");

        assertTrue(jwtUtil.validateToken(token));
        assertEquals("user@mail.ru", jwtUtil.extractEmail(token));
    }

    @Test
    @DisplayName("Токен состоит из трёх частей (header.payload.signature)")
    void generatedToken_hasThreeParts() {
        assertEquals(3, jwtUtil.generateToken("a@b.ru").split("\\.").length);
    }

    @Test
    @DisplayName("Срок жизни токена ≈ 24 часа")
    void generatedToken_expiresInAboutOneDay() {
        String token = jwtUtil.generateToken("a@b.ru");
        Date exp = Jwts.parser().verifyWith(key(SECRET)).build().parseSignedClaims(token).getPayload().getExpiration();
        long hours = (exp.getTime() - System.currentTimeMillis()) / (1000 * 60 * 60);

        assertTrue(hours >= 23 && hours <= 24, "ожидали ~24 ч, получили " + hours);
    }

    @Test
    @DisplayName("Мусорная строка, пустая строка и null не проходят проверку")
    void garbageTokens_areInvalid() {
        assertFalse(jwtUtil.validateToken("abc.def.ghi"));
        assertFalse(jwtUtil.validateToken("not-a-jwt"));
        assertFalse(jwtUtil.validateToken(""));
        assertFalse(jwtUtil.validateToken(null));
    }

    @Test
    @DisplayName("Токен с подменённой подписью не проходит проверку")
    void tamperedSignature_isInvalid() {
        String token = jwtUtil.generateToken("a@b.ru");
        String tampered = token.substring(0, token.length() - 3) + (token.endsWith("AAA") ? "BBB" : "AAA");

        assertFalse(jwtUtil.validateToken(tampered));
    }

    @Test
    @DisplayName("Токен с подменённым payload (другой email) не проходит проверку")
    void tamperedPayload_isInvalid() {
        String[] parts = jwtUtil.generateToken("a@b.ru").split("\\.");
        String otherPayload = jwtUtil.generateToken("admin@b.ru").split("\\.")[1];

        assertFalse(jwtUtil.validateToken(parts[0] + "." + otherPayload + "." + parts[2]));
    }

    @Test
    @DisplayName("Просроченный токен не проходит проверку")
    void expiredToken_isInvalid() {
        String expired = Jwts.builder()
                .subject("a@b.ru")
                .issuedAt(new Date(System.currentTimeMillis() - 2 * 24 * 3600 * 1000L))
                .expiration(new Date(System.currentTimeMillis() - 24 * 3600 * 1000L))
                .signWith(key(SECRET))
                .compact();

        assertFalse(jwtUtil.validateToken(expired));
    }

    @Test
    @DisplayName("Токен, подписанный чужим ключом, не проходит проверку")
    void tokenSignedWithOtherKey_isInvalid() {
        String foreign = Jwts.builder()
                .subject("a@b.ru")
                .expiration(new Date(System.currentTimeMillis() + 3600_000))
                .signWith(key("AnotherSecretKeyAnotherSecretKeyAnotherSecret!!"))
                .compact();

        assertFalse(jwtUtil.validateToken(foreign));
    }

    @Test
    @DisplayName("Неподписанный токен (alg=none) не принимается")
    void unsignedToken_isInvalid() {
        String unsigned = Jwts.builder().subject("a@b.ru").compact();

        assertFalse(jwtUtil.validateToken(unsigned));
    }
}
