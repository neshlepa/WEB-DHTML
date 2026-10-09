package com.planfood.backend.service;

import com.planfood.backend.dto.LoginRequestDto;
import com.planfood.backend.entity.User;
import com.planfood.backend.repository.UserRepository;
import com.planfood.backend.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.Optional;
import com.planfood.backend.dto.UserProfileDto;

import java.util.regex.Pattern;

// @Service сообщает Spring, что это класс бизнес-логики.
// Spring сам создаст этот объект и будет использовать его там, где он нужен.
@Service
public class UserService {

    private final UserRepository userRepository; // Ссылка на интерфейс общения с таблицей users
    private final PasswordEncoder passwordEncoder; // Ссылка на алгоритм BCrypt (из папки security)
    private final JwtUtil jwtUtil; // ссылка на класс для выдачи токенов
    // Регулярное выражение из ТЗ: только латинские буквы, цифры и знак подчеркивания.
    // "^" означает начало строки, "$" - конец строки
    // "[a-zA-Z0-9_]" означает любой разрешенный символ. "+" означает, что их может быть сколько угодно, но минимум один
    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^[a-zA-Z0-9_]+$");

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) { // конструктор
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }


    // Главный метод регистрации. Он принимает email и пароль в открытом виде.
    public User registerUser(String email, String rawPassword) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Пользователь с таким email уже существует");
        }
        if (!PASSWORD_PATTERN.matcher(rawPassword).matches()) {
            throw new IllegalArgumentException("Пароль может содержать только латинские буквы, цифры и знак нижнего подчеркивания");
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword)); // шифруем пароль алгоритмом и кладем в пользователя

        return userRepository.save(user); // обращаемся к репозиторию и сохраняем объект в таблицу
    }


    // метод для проверки пользователя и выдачи токена
    public String authenticateUser(LoginRequestDto loginRequest) {

        Optional<User> optionalUser = userRepository.findByEmail(loginRequest.getEmail()); // Ищем пользователя в базе по email
        if (optionalUser.isEmpty()) {
            throw new RuntimeException("Неверный email или пароль");
        }
        User user = optionalUser.get();

        // Сверяем пароли.
        boolean isPasswordMatch = passwordEncoder.matches(loginRequest.getPassword(), user.getPasswordHash());
        if (!isPasswordMatch) {
            throw new RuntimeException("Неверный email или пароль");
        }

        // Если всё верно — генерируем и возвращаем JWT токен
        return jwtUtil.generateToken(user.getEmail());
    }


    // Получение профиля текущего пользователя
    public UserProfileDto getUserProfile(String email) {
        Optional<User> optionalUser = userRepository.findByEmail(email); // ищем коробку с пользователем в бд
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

    // обновление профиля пользователя (биометрия + чекбоксы)
    public UserProfileDto updateUserProfile(String email, UserProfileDto dto) {
        Optional<User> optionalUser = userRepository.findByEmail(email); // ищем коробку с пользователем в бд
        if (optionalUser.isEmpty()) {
            throw new RuntimeException("Пользователь не найден");
        }
        User user = optionalUser.get();

        // Обновляем биометрию
        user.setGender(dto.getGender());
        user.setAge(dto.getAge());
        user.setHeight(dto.getHeight());
        user.setWeight(dto.getWeight());

        // Обновляем списки аллергенов и диет
        if (dto.getAllergens() != null) {
            user.setAllergens(dto.getAllergens());
        }
        if (dto.getPreferences() != null) {
            user.setPreferences(dto.getPreferences());
        }

        // Сохраняем обновленные данные в БД
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
}