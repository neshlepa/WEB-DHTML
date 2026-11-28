package com.planfood.backend;

import com.planfood.backend.dto.UserProfileDto;
import com.planfood.backend.entity.User;
import com.planfood.backend.repository.UserRepository;
import com.planfood.backend.service.UserService;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;

/**
 * Тесты ОЖИДАЕМОГО поведения для найденных дефектов. Отключены (@Disabled), чтобы сборка не падала.
 * Чтобы подтвердить дефект — уберите @Disabled у нужного теста и запустите: тест должен упасть.
 * Когда разработчик исправит дефект — оставьте тест включённым как регрессионный.
 */
@ExtendWith(MockitoExtension.class)
class KnownDefectsTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @InjectMocks UserService userService;

    @Test
    @Disabled("ДЕФЕКТ: registerUser(email, null) бросает NullPointerException (→ HTTP 500) вместо IllegalArgumentException (→ HTTP 400)")
    @DisplayName("Регистрация без пароля должна давать IllegalArgumentException, а не NPE")
    void registerUser_nullPassword_shouldThrowIllegalArgument() {
        lenient().when(userRepository.existsByEmail(any())).thenReturn(false);
        assertThrows(IllegalArgumentException.class, () -> userService.registerUser("a@b.ru", null));
    }

    @Test
    @Disabled("ДЕФЕКТ: формат email не проверяется; «not-an-email» регистрируется")
    @DisplayName("Регистрация с email неверного формата должна отклоняться")
    void registerUser_invalidEmail_shouldThrow() {
        lenient().when(userRepository.existsByEmail(any())).thenReturn(false);
        lenient().when(passwordEncoder.encode(any())).thenReturn("H");
        lenient().when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        assertThrows(IllegalArgumentException.class, () -> userService.registerUser("not-an-email", "Pass_123"));
    }

    @Test
    @Disabled("ВОПРОС К КОМАНДЕ: если «слабый пароль» = слишком короткий, то пароль из 1 символа должен отклоняться (минимальная длина в коде не проверяется)")
    @DisplayName("Слишком короткий пароль должен отклоняться")
    void registerUser_tooShortPassword_shouldThrow() {
        lenient().when(userRepository.existsByEmail(any())).thenReturn(false);
        lenient().when(passwordEncoder.encode(any())).thenReturn("H");
        lenient().when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        assertThrows(IllegalArgumentException.class, () -> userService.registerUser("a@b.ru", "a"));
    }

    @Test
    @Disabled("ДЕФЕКТ: биометрия не валидируется; отрицательный возраст сохраняется")
    @DisplayName("Обновление профиля с отрицательным возрастом должно отклоняться")
    void updateProfile_negativeAge_shouldThrow() {
        lenient().when(userRepository.findByEmail("a@b.ru")).thenReturn(Optional.of(new User()));
        lenient().when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        UserProfileDto dto = new UserProfileDto(null, "male", -5, 180, 75.0, Set.of(), Set.of());
        assertThrows(RuntimeException.class, () -> userService.updateUserProfile("a@b.ru", dto));
    }
}
