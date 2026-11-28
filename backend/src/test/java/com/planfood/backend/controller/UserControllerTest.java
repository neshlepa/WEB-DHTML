package com.planfood.backend.controller;

import com.planfood.backend.dto.AuthResponseDto;
import com.planfood.backend.dto.LoginRequestDto;
import com.planfood.backend.dto.RegisterRequest;
import com.planfood.backend.dto.UserProfileDto;
import com.planfood.backend.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.security.Principal;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock UserService userService;
    @InjectMocks UserController controller;

    private final Principal principal = () -> "u@mail.ru";

    private RegisterRequest register() {
        RegisterRequest r = new RegisterRequest();
        r.setEmail("a@b.ru");
        r.setPassword("Pass_123");
        return r;
    }

    @Test
    @DisplayName("POST /register: успех → 200 и текст «успешно зарегистрирован»")
    void register_success() {
        ResponseEntity<String> resp = controller.register(register());

        assertEquals(200, resp.getStatusCode().value());
        assert resp.getBody() != null;
        assertTrue(resp.getBody().contains("успешно"));
        verify(userService).registerUser("a@b.ru", "Pass_123");
    }

    @Test
    @DisplayName("POST /register: ошибка валидации → 400 с текстом ошибки")
    void register_validationError_returns400() {
        doThrow(new IllegalArgumentException("Пользователь с таким email уже существует"))
                .when(userService).registerUser("a@b.ru", "Pass_123");

        ResponseEntity<String> resp = controller.register(register());

        assertEquals(400, resp.getStatusCode().value());
        assertEquals("Пользователь с таким email уже существует", resp.getBody());
    }

    @Test
    @DisplayName("POST /login: успех → 200 и JSON с токеном")
    void login_success() {
        LoginRequestDto req = new LoginRequestDto();
        req.setEmail("a@b.ru");
        req.setPassword("Pass_123");
        when(userService.authenticateUser(req)).thenReturn("JWT");

        ResponseEntity<?> resp = controller.login(req);

        assertEquals(200, resp.getStatusCode().value());
        assert resp.getBody() != null;
        assertEquals("JWT", ((AuthResponseDto) resp.getBody()).getToken());
    }

    @Test
    @DisplayName("POST /login: неверные данные → 401 с текстом ошибки")
    void login_badCredentials_returns401() {
        LoginRequestDto req = new LoginRequestDto();
        when(userService.authenticateUser(req)).thenThrow(new RuntimeException("Неверный email или пароль"));

        ResponseEntity<?> resp = controller.login(req);

        assertEquals(401, resp.getStatusCode().value());
        assertEquals("Неверный email или пароль", resp.getBody());
    }

    @Test
    @DisplayName("GET /profile: email берётся из токена (Principal)")
    void getProfile_usesPrincipalEmail() {
        UserProfileDto dto = new UserProfileDto("u@mail.ru", "male", 30, 180, 75.0, Set.of(), Set.of());
        when(userService.getUserProfile("u@mail.ru")).thenReturn(dto);

        ResponseEntity<?> resp = controller.getProfile(principal);

        assertEquals(200, resp.getStatusCode().value());
        assertSame(dto, resp.getBody());
    }

    @Test
    @DisplayName("GET /profile: пользователь не найден → 404")
    void getProfile_notFound_returns404() {
        when(userService.getUserProfile("u@mail.ru")).thenThrow(new RuntimeException("Пользователь не найден"));

        assertEquals(404, controller.getProfile(principal).getStatusCode().value());
    }

    @Test
    @DisplayName("PUT /profile: успех → 200 и обновлённый профиль")
    void updateProfile_success() {
        UserProfileDto in = new UserProfileDto(null, "male", 30, 180, 75.0, Set.of(), Set.of());
        UserProfileDto out = new UserProfileDto("u@mail.ru", "male", 30, 180, 75.0, Set.of(), Set.of());
        when(userService.updateUserProfile("u@mail.ru", in)).thenReturn(out);

        ResponseEntity<?> resp = controller.updateProfile(principal, in);

        assertEquals(200, resp.getStatusCode().value());
        assertSame(out, resp.getBody());
    }

    @Test
    @DisplayName("PUT /profile: ошибка сервиса → 400")
    void updateProfile_error_returns400() {
        UserProfileDto in = new UserProfileDto();
        when(userService.updateUserProfile("u@mail.ru", in)).thenThrow(new RuntimeException("Пользователь не найден"));

        assertEquals(400, controller.updateProfile(principal, in).getStatusCode().value());
    }
}
