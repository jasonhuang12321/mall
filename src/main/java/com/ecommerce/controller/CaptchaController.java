package com.ecommerce.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/captcha")
public class CaptchaController {

    private final Map<String, Integer> captchaStore = new ConcurrentHashMap<>();

    @GetMapping
    public ResponseEntity<?> getCaptcha() {
        int a = (int) (Math.random() * 20) + 1;
        int b = (int) (Math.random() * 20) + 1;
        String[] ops = {"+", "-", "*"};
        String op = ops[(int) (Math.random() * 3)];
        int answer;
        switch (op) {
            case "-": answer = a - b; break;
            case "*": answer = a * b; break;
            default: answer = a + b; break;
        }
        String token = UUID.randomUUID().toString();
        captchaStore.put(token, answer);
        // 自动过期（5分钟）
        new Thread(() -> {
            try { Thread.sleep(300000); captchaStore.remove(token); } catch (Exception ignored) {}
        }).start();
        return ResponseEntity.ok(Map.of("code", 200, "question", a + " " + op + " " + b + " = ?", "token", token));
    }

    public int getAnswer(String token) {
        Integer answer = captchaStore.get(token);
        if (answer == null) throw new RuntimeException("验证码已过期");
        captchaStore.remove(token);
        return answer;
    }
}