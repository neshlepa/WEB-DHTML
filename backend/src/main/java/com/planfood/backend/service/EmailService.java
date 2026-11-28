package com.planfood.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Сервис отправки писем по SMTP (как на лекциях).
 * Использует настройки spring.mail.* из application.properties.
 */
@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromAddress;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationCode(String toEmail, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject("PlanFood — подтверждение email");
        message.setText(
                "Здравствуйте!\n\n" +
                "Ваш код для подтверждения email: " + code + "\n\n" +
                "Код действует 15 минут.\n" +
                "Если вы не регистрировались в PlanFood, просто проигнорируйте это письмо.\n\n" +
                "— Команда PlanFood"
        );
        mailSender.send(message);
    }

    public void sendPasswordResetCode(String toEmail, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject("PlanFood — сброс пароля");
        message.setText(
                "Здравствуйте!\n\n" +
                "Вы запросили сброс пароля. Ваш код: " + code + "\n\n" +
                "Код действует 15 минут.\n" +
                "Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.\n\n" +
                "— Команда PlanFood"
        );
        mailSender.send(message);
    }
}
