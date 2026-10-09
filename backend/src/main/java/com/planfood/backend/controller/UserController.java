package com.planfood.backend.controller;

import com.planfood.backend.dto.AuthResponseDto;
import com.planfood.backend.dto.LoginRequestDto;
import com.planfood.backend.dto.RegisterRequest;
import com.planfood.backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.planfood.backend.dto.UserProfileDto;
import java.security.Principal;

@RestController // значит, что класс принимает и возвращает ответы в json формате
// @RequestMapping задает базовый адрес. Все методы внутри этого класса будут доступны по ссылке,
// начинающейся с http://localhost:8080/api/users
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService; // Ссылка на слой бизнес-логики

    public UserController(UserService userService) { // Конструктор
        this.userService = userService;
    }


    // @PostMapping указывает, что метод сработает только при HTTP-запросе типа POST
    // на адрес /api/users/register (POST используется для отправки скрытых данных и создания записей)
    @PostMapping("/register")
    // @RequestBody берет сырой JSON из входящего запроса и автоматически конвертирует его в Java-объект RegisterRequest
    public ResponseEntity<String> register(@RequestBody RegisterRequest request) {
        /** это системный Java-класс из Spring Web, который представляет собой полноценный HTTP-ответ целиком
         * внутри лежит код статус ответа, http заголовки и тело ответа (в нашем случае строку)
         */
        try {
            userService.registerUser(request.getEmail(), request.getPassword()); // передаем данные в сервис регистрации

            // Если сервис отработал без ошибок возвращаем клиенту успешный статус HTTP 200 (OK) и текстовое сообщение
            return ResponseEntity.ok("Пользователь успешно зарегистрирован!");

        } catch (IllegalArgumentException e) {
            // Если сервис выбросил ошибку, возвращаем клиенту статус HTTP 400 (Bad Request)
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }


    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequestDto request) {
        try {
            String jwtToken = userService.authenticateUser(request); // отдаем данные в сервис
            AuthResponseDto responseBody = new AuthResponseDto(jwtToken); // упаковываем строку токена в будущий json
            return ResponseEntity.ok(responseBody); // Возвращаем статус 200 OK и JSON с токеном

        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(e.getMessage()); // 401 Unauthorized в случае ошибки
        }
    }


    // Получить данные профиля
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Principal principal) {
        try {
            // principal.getName() возвращает email пользователя из JWT токена
            String email = principal.getName();
            UserProfileDto profile = userService.getUserProfile(email);
            return ResponseEntity.ok(profile);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }


    // Сохранить изменения профиля
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(Principal principal, @RequestBody UserProfileDto updateDto) {
        try {
            String email = principal.getName();
            UserProfileDto updatedProfile = userService.updateUserProfile(email, updateDto);
            return ResponseEntity.ok(updatedProfile);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}