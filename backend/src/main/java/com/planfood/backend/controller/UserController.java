package com.planfood.backend.controller;

import com.planfood.backend.dto.*;
import com.planfood.backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            userService.registerUser(request.getEmail(), request.getPassword());
            return ResponseEntity.ok(Map.of(
                    "message", "Регистрация успешна! Проверьте почту и введите код подтверждения.",
                    "email", request.getEmail()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestBody VerifyEmailRequest request) {
        try {
            userService.verifyEmail(request.getEmail(), request.getCode());
            return ResponseEntity.ok("Email успешно подтверждён! Теперь можно войти.");
}       catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
}
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody ResendCodeRequest request) {
        try {
            userService.resendVerificationCode(request.getEmail());
            return ResponseEntity.ok("Новый код подтверждения отправлен на почту.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequestDto request) {
        try {
            String jwtToken = userService.authenticateUser(request);
            AuthResponseDto responseBody = new AuthResponseDto(jwtToken);
            return ResponseEntity.ok(responseBody);
        } catch (RuntimeException e) {
            String msg = e.getMessage();
            if ("EMAIL_NOT_VERIFIED".equals(msg)) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", "EMAIL_NOT_VERIFIED",
                        "message", "Email не подтверждён. Введите код из письма.",
                        "email", request.getEmail()
                ));
            }
            return ResponseEntity.status(401).body(msg);
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        try {
            userService.requestPasswordReset(request.getEmail());
            return ResponseEntity.ok("Код для сброса пароля отправлен на почту.");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        try {
            userService.resetPassword(request.getEmail(), request.getCode(), request.getNewPassword());
            return ResponseEntity.ok("Пароль успешно изменён! Теперь можно войти.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Principal principal) {
        try {
            String email = principal.getName();
            UserProfileDto profile = userService.getUserProfile(email);
            return ResponseEntity.ok(profile);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }

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
