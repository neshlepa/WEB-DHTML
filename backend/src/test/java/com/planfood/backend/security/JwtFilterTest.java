package com.planfood.backend.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.*;

class JwtFilterTest {

    private final JwtUtil jwtUtil = new JwtUtil();
    private final JwtFilter filter = new JwtFilter(jwtUtil);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void run(String authorizationHeader) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/recipes/feed");
        if (authorizationHeader != null) {
            request.addHeader("Authorization", authorizationHeader);
        }
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(request, new MockHttpServletResponse(), chain);
        assertNotNull(chain.getRequest(), "запрос должен идти дальше по цепочке в любом случае");
    }

    @Test
    @DisplayName("Валидный Bearer-токен → пользователь аутентифицирован")
    void validToken_authenticatesUser() throws Exception {
        run("Bearer " + jwtUtil.generateToken("user@mail.ru"));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals("user@mail.ru", auth.getName());
    }

    @Test
    @DisplayName("Нет заголовка Authorization → аутентификации нет (гость)")
    void noHeader_staysAnonymous() throws Exception {
        run(null);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    @DisplayName("Невалидный токен → аутентификации нет, запрос не падает")
    void invalidToken_staysAnonymous() throws Exception {
        run("Bearer abc.def.ghi");
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    @DisplayName("Заголовок без префикса Bearer игнорируется")
    void wrongScheme_isIgnored() throws Exception {
        run("Token " + jwtUtil.generateToken("user@mail.ru"));
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    @DisplayName("«Bearer » с пустым токеном не вызывает исключений")
    void emptyBearer_isIgnored() throws Exception {
        run("Bearer ");
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }
}
