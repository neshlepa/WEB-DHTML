package com.planfood.backend.service;

import com.planfood.backend.entity.User;
import com.planfood.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

// @Service сообщает Spring, что это класс бизнес-логики.
// Spring сам создаст этот объект и будет использовать его там, где он нужен.
@Service
public class UserService {

    private final UserRepository userRepository; // Ссылка на интерфейс общения с таблицей users
    private final PasswordEncoder passwordEncoder; // Ссылка на тот самый алгоритм BCrypt (из папки security)

    // Регулярное выражение из ТЗ: только латинские буквы, цифры и знак подчеркивания.
    // "^" означает начало строки, "$" - конец строки
    // "[a-zA-Z0-9_]" означает любой разрешенный символ. "+" означает, что их может быть сколько угодно, но минимум один
    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^[a-zA-Z0-9_]+$");

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) { // конструктор
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
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
}