package com.planfood.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

// @Component говорит Spring Boot создать объект этого класса при запуске
@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }


    @Override
    // Этот метод будет срабатывать при КАЖДОМ входящем запросе к нашему серверу ровно 1 раз - это гарантирует родительский класс
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization"); // 1. Ищем заголовок Authorization в запросе

        // По стандарту токен передается в виде: "Bearer eyJhbG..."
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            // 2. Отрезаем слово "Bearer " (первые 7 символов), чтобы получить чистый токен
            String token = authHeader.substring(7);

            // 3. Проверяем токен на валидность (не просрочен ли, верна ли подпись)
            if (jwtUtil.validateToken(token)) {

                String email = jwtUtil.extractEmail(token); // 4. Достаем email из токена

                // 5. Сообщаем Spring Security: "Мы узнали этого пользователя, пропустите его"
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(email, null, new ArrayList<>());
                SecurityContextHolder.getContext().setAuthentication(authToken);
                /**
                 * SecurityContextHolder — это центральное хранилище данных безопасности текущего запроса в Spring Security.
                 * Для каждого входящего HTTP-запроса (который обрабатывается в своем отдельном потоке сервера) выделяется изолированная ячейка памяти.
                 * SecurityContextHolder.getContext() — обращается к хранилищу текущего потока и получает контекст
                 * безопасности (SecurityContext) для обрабатываемого запроса.
                 * .setAuthentication(authToken) — кладет созданное удостоверение authToken внутрь этого контекста.
                 *
                 * когда запрос пойдет по цепочке фильтров спринг секьюрити увидит, что в контексте пользователь
                 * авторизован и пропустит запрос к контроллеру
                 */
            }
        }

        filterChain.doFilter(request, response); // Передаем запрос дальше по цепочке
    }
}