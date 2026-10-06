package com.planfood.backend.controller;

import com.planfood.backend.dto.RegisterRequest;
import com.planfood.backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}