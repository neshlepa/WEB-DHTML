package com.planfood.backend.service;

import com.planfood.backend.dto.LoginRequestDto;
import com.planfood.backend.dto.UserProfileDto;
import com.planfood.backend.entity.Allergen;
import com.planfood.backend.entity.DietaryPreference;
import com.planfood.backend.entity.User;
import com.planfood.backend.repository.UserRepository;
import com.planfood.backend.security.JwtUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtUtil jwtUtil;
    @InjectMocks UserService userService;

    private User user(String hash) {
        User u = new User();
        u.setId(1L);
        u.setEmail("a@b.ru");
        u.setPasswordHash(hash);
        return u;
    }

    // ---------- регистрация ----------

    @Test
    @DisplayName("Регистрация: пароль хэшируется, в базу попадает хэш, а не открытый пароль")
    void registerUser_success_savesHashedPassword() {
        when(userRepository.existsByEmail("a@b.ru")).thenReturn(false);
        when(passwordEncoder.encode("Pass_123")).thenReturn("HASH");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User saved = userService.registerUser("a@b.ru", "Pass_123");

        assertEquals("a@b.ru", saved.getEmail());
        assertEquals("HASH", saved.getPasswordHash());
        assertNotEquals("Pass_123", saved.getPasswordHash());
    }

    @Test
    @DisplayName("Регистрация: занятый email → IllegalArgumentException, пользователь не сохраняется")
    void registerUser_duplicateEmail_throws() {
        when(userRepository.existsByEmail("a@b.ru")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> userService.registerUser("a@b.ru", "Pass_123"));

        assertTrue(ex.getMessage().contains("уже существует"));
        verify(userRepository, never()).save(any());
    }

    @ParameterizedTest(name = "недопустимый пароль: \"{0}\"")
    @ValueSource(strings = {"Pass!word", "пароль123", "pass word", "a-b", "pass@123", "", "  ", "Pass.123", "пароль"})
    @DisplayName("Регистрация: пароль с недопустимыми символами отклоняется")
    void registerUser_invalidPasswordChars_throws(String password) {
        when(userRepository.existsByEmail(any())).thenReturn(false);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> userService.registerUser("a@b.ru", password));

        assertTrue(ex.getMessage().contains("латинские буквы"));
        verify(userRepository, never()).save(any());
    }

    @ParameterizedTest(name = "допустимый пароль: \"{0}\"")
    @ValueSource(strings = {"abc", "ABC", "123456", "_", "Pass_123", "a", "UPPER_lower_123"})
    @DisplayName("Регистрация: пароль из латиницы, цифр и _ принимается")
    void registerUser_validPasswords_accepted(String password) {
        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(passwordEncoder.encode(password)).thenReturn("H");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() -> userService.registerUser("a@b.ru", password));
    }

    // ---------- вход ----------

    @Test
    @DisplayName("Вход: верные данные → выдаётся JWT для email пользователя")
    void authenticateUser_success_returnsToken() {
        LoginRequestDto req = new LoginRequestDto();
        req.setEmail("a@b.ru");
        req.setPassword("Pass_123");
        when(userRepository.findByEmail("a@b.ru")).thenReturn(Optional.of(user("HASH")));
        when(passwordEncoder.matches("Pass_123", "HASH")).thenReturn(true);
        when(jwtUtil.generateToken("a@b.ru")).thenReturn("TOKEN");

        assertEquals("TOKEN", userService.authenticateUser(req));
    }

    @Test
    @DisplayName("Вход: неизвестный email → «Неверный email или пароль», токен не выдаётся")
    void authenticateUser_unknownEmail_throws() {
        LoginRequestDto req = new LoginRequestDto();
        req.setEmail("nobody@b.ru");
        req.setPassword("x");
        when(userRepository.findByEmail("nobody@b.ru")).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> userService.authenticateUser(req));

        assertEquals("Неверный email или пароль", ex.getMessage());
        verify(jwtUtil, never()).generateToken(any());
    }

    @Test
    @DisplayName("Вход: неверный пароль → то же сообщение, что и для неизвестного email (нет утечки, кто зарегистрирован)")
    void authenticateUser_wrongPassword_sameMessage() {
        LoginRequestDto req = new LoginRequestDto();
        req.setEmail("a@b.ru");
        req.setPassword("wrong");
        when(userRepository.findByEmail("a@b.ru")).thenReturn(Optional.of(user("HASH")));
        when(passwordEncoder.matches("wrong", "HASH")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> userService.authenticateUser(req));

        assertEquals("Неверный email или пароль", ex.getMessage());
        verify(jwtUtil, never()).generateToken(any());
    }

    // ---------- профиль ----------

    @Test
    @DisplayName("Профиль: возвращаются все поля пользователя")
    void getUserProfile_returnsAllFields() {
        User u = user("H");
        u.setGender("female");
        u.setAge(28);
        u.setHeight(165);
        u.setWeight(55.5);
        u.setAllergens(new HashSet<>(Set.of(Allergen.EGGS)));
        u.setPreferences(new HashSet<>(Set.of(DietaryPreference.VEGAN)));
        when(userRepository.findByEmail("a@b.ru")).thenReturn(Optional.of(u));

        UserProfileDto dto = userService.getUserProfile("a@b.ru");

        assertEquals("a@b.ru", dto.getEmail());
        assertEquals("female", dto.getGender());
        assertEquals(28, dto.getAge());
        assertEquals(165, dto.getHeight());
        assertEquals(55.5, dto.getWeight());
        assertEquals(Set.of(Allergen.EGGS), dto.getAllergens());
        assertEquals(Set.of(DietaryPreference.VEGAN), dto.getPreferences());
    }

    @Test
    @DisplayName("Профиль: пользователь не найден → RuntimeException")
    void getUserProfile_notFound_throws() {
        when(userRepository.findByEmail("x@x.ru")).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> userService.getUserProfile("x@x.ru"));
        assertEquals("Пользователь не найден", ex.getMessage());
    }

    @Test
    @DisplayName("Обновление профиля: биометрия, аллергены и предпочтения сохраняются; email не меняется")
    void updateUserProfile_updatesEverything() {
        User u = user("H");
        when(userRepository.findByEmail("a@b.ru")).thenReturn(Optional.of(u));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        UserProfileDto in = new UserProfileDto("hacker@evil.com", "male", 30, 180, 75.5,
                Set.of(Allergen.LACTOSE, Allergen.GLUTEN), Set.of(DietaryPreference.HIGH_PROTEIN));

        UserProfileDto out = userService.updateUserProfile("a@b.ru", in);

        assertEquals("a@b.ru", out.getEmail(), "email из тела запроса игнорируется");
        assertEquals("male", out.getGender());
        assertEquals(30, out.getAge());
        assertEquals(180, out.getHeight());
        assertEquals(75.5, out.getWeight());
        assertEquals(Set.of(Allergen.LACTOSE, Allergen.GLUTEN), out.getAllergens());
        assertEquals(Set.of(DietaryPreference.HIGH_PROTEIN), out.getPreferences());
        verify(userRepository).save(u);
    }

    @Test
    @DisplayName("Обновление профиля: null в списках не затирает сохранённые аллергены/предпочтения")
    void updateUserProfile_nullCollections_keepOldValues() {
        User u = user("H");
        u.setAllergens(new HashSet<>(Set.of(Allergen.FISH)));
        u.setPreferences(new HashSet<>(Set.of(DietaryPreference.KOSHER)));
        when(userRepository.findByEmail("a@b.ru")).thenReturn(Optional.of(u));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        UserProfileDto in = new UserProfileDto(null, "male", 30, 180, 75.0, null, null);

        UserProfileDto out = userService.updateUserProfile("a@b.ru", in);

        assertEquals(Set.of(Allergen.FISH), out.getAllergens());
        assertEquals(Set.of(DietaryPreference.KOSHER), out.getPreferences());
    }

    @Test
    @DisplayName("Обновление профиля: пустые множества очищают аллергены и предпочтения")
    void updateUserProfile_emptyCollections_clearValues() {
        User u = user("H");
        u.setAllergens(new HashSet<>(Set.of(Allergen.FISH)));
        u.setPreferences(new HashSet<>(Set.of(DietaryPreference.KOSHER)));
        when(userRepository.findByEmail("a@b.ru")).thenReturn(Optional.of(u));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        UserProfileDto in = new UserProfileDto(null, "male", 30, 180, 75.0, Set.of(), Set.of());

        UserProfileDto out = userService.updateUserProfile("a@b.ru", in);

        assertTrue(out.getAllergens().isEmpty());
        assertTrue(out.getPreferences().isEmpty());
    }

    @Test
    @DisplayName("Обновление профиля: пользователь не найден → RuntimeException, save не вызывается")
    void updateUserProfile_notFound_throws() {
        when(userRepository.findByEmail("x@x.ru")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> userService.updateUserProfile("x@x.ru", new UserProfileDto()));
        verify(userRepository, never()).save(any());
    }
}
