package com.planfood.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.security.config.annotation.web.configurers.CsrfConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

// импорты для работы CORS-настроек
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.CorsConfigurationSource;
import java.util.List;

// @Configuration значит: Это класс с глобальными настройками проекта, прочитать его перед запуском
@Configuration
// @EnableWebSecurity включает защиту проекта инструментами Spring Security
@EnableWebSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter; // Добавили ссылку на наш фильтр токенов

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    // @Bean означает, что мы вызываем этот метод один раз на старте программы и отдаем объект спрингу, а тот
    // использует его в ходе программы, вместо того, чтобы снова создавать объект
    @Bean
    public PasswordEncoder passwordEncoder() { // PasswordEncoder этот интерфейс из библиотеки Spring Security
        /** мы создаем экземпляр готового класса BCryptPasswordEncoder, который реализует этот интерфейс
         - Он автоматически добавляет случайную "соль" к каждому паролю,

         - поэтому даже два одинаковых пароля в базе будут иметь разные хэши.

         */
        return new BCryptPasswordEncoder();
    }

    // Этот метод настраивает правила доступа к нашим ссылкам (эндпоинтам)
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        /** SecurityFilterChain это интерфейс из библиотеки Spring Security
         - каждый входящий сетевой HTTP-запрос от фронтенда должен пройти через цепочку проверок

         - (проверка пароля, проверка токена, проверка прав доступа)

         - Этот метод собирает и возвращает настроенную цепочку проверок

         */

        // Включаем поддержку CORS для цепочки безопасности.
        // Customizer.withDefaults() скажет Spring Security найти бин corsConfigurationSource, который мы написали ниже.
        http.cors(Customizer.withDefaults());

        // ШАГ 1. Создаем отдельное правило для CSRF-защиты:
        // Мы объявляем переменную типа Customizer для управления настройками CSRF
        // и прямо говорим вызвать метод отключения .disable()
        Customizer<CsrfConfigurer<HttpSecurity>> disableCsrf = csrf -> csrf.disable();

        // Передаем это отдельное правило в наш строитель http
        http.csrf(disableCsrf);

        // ШАГ 2. Создаем отдельное правило для доступа к сетевым адресам (эндпоинтам):
        Customizer<AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry> accessRules = rules -> {
            // Открываем полный доступ (без токена) только для регистрации и логина
            rules.requestMatchers("/api/users/register", "/api/users/login").permitAll();

            // Все остальные запросы к серверу требуют обязательной авторизации (наличия валидного токена)
            rules.anyRequest().authenticated();
        };

        http.authorizeHttpRequests(accessRules);

        // Вставляем наш JwtFilter перед стандартным фильтром проверки логина/пароля
        http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);


        // ШАГ 3. Финальная сборка:
        // Вызываем метод build(), который собирает все переданные выше правила
        // воедино и создает готовую цепочку безопасности (SecurityFilterChain)
        SecurityFilterChain readyFilterChain = http.build();

        // Возвращаем собранный объект Spring'у в его внутреннее хранилище бинов
        return readyFilterChain;
    }

    // Этот метод детально настраивает правила CORS (Cross-Origin Resource Sharing).
    // Браузеры фронтендеров будут проверять эти правила перед отправкой запросов на наш сервер.
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        // Создаем пустой объект для настроек
        CorsConfiguration configuration = new CorsConfiguration();

        // 1. Разрешаем запросы с любых доменов и портов (фронтенд может быть на localhost:3000 или любом другом сайте)
        configuration.setAllowedOriginPatterns(List.of("*"));

        // 2. Разрешаем фронтенду использовать все основные HTTP-методы
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        // 3. Разрешаем фронтенду прикреплять любые заголовки (например, Content-Type для передачи JSON)
        configuration.setAllowedHeaders(List.of("*"));

        // 4. Разрешаем передачу куки-файлов и токенов авторизации (понадобится, когда будем делать логин)
        configuration.setAllowCredentials(true);

        // Указываем, к каким конкретно ссылкам нашего API применять эти настройки
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

        // Применяем созданные правила ко всем эндпоинтам нашего приложения (/** означает абсолютно любой путь)
        source.registerCorsConfiguration("/**", configuration);

        // Отдаем готовые настройки Spring'у
        return source;
    }
}