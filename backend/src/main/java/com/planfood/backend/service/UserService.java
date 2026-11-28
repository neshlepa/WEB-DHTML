package com.planfood.backend.service;

import com.planfood.backend.dto.LoginRequestDto;
import com.planfood.backend.entity.User;
import com.planfood.backend.repository.UserRepository;
import com.planfood.backend.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.Optional;
import com.planfood.backend.dto.UserProfileDto;

import java.time.LocalDateTime;
import java.util.Random;
import java.util.regex.Pattern;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^[a-zA-Z0-9_]{8,}$");
    private static final int CODE_TTL_MINUTES = 15;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
    }

    /** Регистрация: создаём пользователя, генерируем код и отправляем письмо. */
    public User registerUser(String email, String rawPassword) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Пользователь с таким email уже существует");
        }
        if (rawPassword == null || !PASSWORD_PATTERN.matcher(rawPassword).matches()) {
            throw new IllegalArgumentException(
                    "Пароль должен содержать минимум 8 символов (латинские буквы, цифры или знак нижнего подчеркивания)");
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setEmailVerified(false);

        String code = generateSixDigitCode();
        user.setVerificationCode(code);
        user.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(CODE_TTL_MINUTES));

        User saved = userRepository.save(user);

        try {
            emailService.sendVerificationCode(email, code);
        } catch (Exception e) {
            // Письмо не ушло — удаляем пользователя, чтобы не оставлять «висящую» запись
            userRepository.delete(saved);
            throw new RuntimeException("Не удалось отправить письмо с кодом подтверждения. Проверьте настройки SMTP.");
        }

        return saved;
    }

    /** Подтверждение email по коду из письма. */
    public void verifyEmail(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("Email уже подтверждён");
        }
        if (user.getVerificationCode() == null || user.getVerificationCodeExpiry() == null) {
            throw new IllegalArgumentException("Код подтверждения не был запрошен");
        }
        if (LocalDateTime.now().isAfter(user.getVerificationCodeExpiry())) {
            throw new IllegalArgumentException("Срок действия кода истёк. Запросите новый код.");
        }
        if (!user.getVerificationCode().equals(code.trim())) {
            throw new IllegalArgumentException("Неверный код подтверждения");
        }

        user.setEmailVerified(true);
        user.setVerificationCode(null);
        user.setVerificationCodeExpiry(null);
        userRepository.save(user);
    }

    /** Повторная отправка кода подтверждения email. */
    public void resendVerificationCode(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("Email уже подтверждён");
        }

        String code = generateSixDigitCode();
        user.setVerificationCode(code);
        user.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(CODE_TTL_MINUTES));
        userRepository.save(user);

        emailService.sendVerificationCode(email, code);
    }

    /** Вход: проверяем пароль и что email подтверждён. */
    public String authenticateUser(LoginRequestDto loginRequest) {
        Optional<User> optionalUser = userRepository.findByEmail(loginRequest.getEmail());
        if (optionalUser.isEmpty()) {
            throw new RuntimeException("Неверный email или пароль");
        }
        User user = optionalUser.get();

        boolean isPasswordMatch = passwordEncoder.matches(loginRequest.getPassword(), user.getPasswordHash());
        if (!isPasswordMatch) {
            throw new RuntimeException("Неверный email или пароль");
        }

        if (!user.isEmailVerified()) {
            throw new RuntimeException("EMAIL_NOT_VERIFIED"); // специальный маркер для фронта
        }

        return jwtUtil.generateToken(user.getEmail());
    }

    /** Запрос сброса пароля: отправляем код на почту. */
    public void requestPasswordReset(String email) {
        Optional<User> optionalUser = userRepository.findByEmail(email);
        // Чтобы не раскрывать, существует ли email, при отсутствии пользователя просто ничего не делаем
        // (или можно всегда отвечать «письмо отправлено»). Для учебного проекта отвечаем явно.
        if (optionalUser.isEmpty()) {
            throw new RuntimeException("Пользователь с таким email не найден");
        }
        User user = optionalUser.get();

        String code = generateSixDigitCode();
        user.setResetCode(code);
        user.setResetCodeExpiry(LocalDateTime.now().plusMinutes(CODE_TTL_MINUTES));
        userRepository.save(user);

        emailService.sendPasswordResetCode(email, code);
    }

    /** Сброс пароля по коду из письма. */
    public void resetPassword(String email, String code, String newPassword) {
        if (newPassword == null || !PASSWORD_PATTERN.matcher(newPassword).matches()) {
            throw new IllegalArgumentException(
                    "Пароль должен содержать минимум 8 символов (латинские буквы, цифры или знак нижнего подчеркивания)");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        if (user.getResetCode() == null || user.getResetCodeExpiry() == null) {
            throw new IllegalArgumentException("Код сброса пароля не был запрошен");
        }
        if (LocalDateTime.now().isAfter(user.getResetCodeExpiry())) {
            throw new IllegalArgumentException("Срок действия кода истёк. Запросите новый код.");
        }
        if (!user.getResetCode().equals(code.trim())) {
            throw new IllegalArgumentException("Неверный код сброса пароля");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetCode(null);
        user.setResetCodeExpiry(null);
        // На всякий случай считаем email подтверждённым после успешного сброса
        user.setEmailVerified(true);
        userRepository.save(user);
    }

    public UserProfileDto getUserProfile(String email) {
        Optional<User> optionalUser = userRepository.findByEmail(email);
        if (optionalUser.isEmpty()) {
            throw new RuntimeException("Пользователь не найден");
        }
        User user = optionalUser.get();

        return new UserProfileDto(
                user.getEmail(),
                user.getGender(),
                user.getAge(),
                user.getHeight(),
                user.getWeight(),
                user.getAllergens(),
                user.getPreferences()
        );
    }

    public UserProfileDto updateUserProfile(String email, UserProfileDto dto) {
        Optional<User> optionalUser = userRepository.findByEmail(email);
        if (optionalUser.isEmpty()) {
            throw new RuntimeException("Пользователь не найден");
        }
        User user = optionalUser.get();

        user.setGender(dto.getGender());
        user.setAge(dto.getAge());
        user.setHeight(dto.getHeight());
        user.setWeight(dto.getWeight());

        if (dto.getAllergens() != null) {
            user.setAllergens(dto.getAllergens());
        }
        if (dto.getPreferences() != null) {
            user.setPreferences(dto.getPreferences());
        }

        User savedUser = userRepository.save(user);

        return new UserProfileDto(
                savedUser.getEmail(),
                savedUser.getGender(),
                savedUser.getAge(),
                savedUser.getHeight(),
                savedUser.getWeight(),
                savedUser.getAllergens(),
                savedUser.getPreferences()
        );
    }

    private String generateSixDigitCode() {
        int code = 100000 + new Random().nextInt(900000);
        return String.valueOf(code);
    }
}
