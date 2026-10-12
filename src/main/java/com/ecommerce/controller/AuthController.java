package com.ecommerce.controller;

import com.ecommerce.dto.*;
import com.ecommerce.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/api/register")
    public Result<?> register(@RequestBody RegisterRequest request) {
        try {
            return Result.success(userService.register(request));
        } catch (RuntimeException e) {
            return Result.error(400, e.getMessage());
        }
    }

    @PostMapping("/api/login")
    public Result<?> login(@RequestBody LoginRequest request) {
        try {
            return Result.success(userService.login(request));
        } catch (RuntimeException e) {
            return Result.error(400, e.getMessage());
        }
    }

    @PostMapping("/api/sms/send")
    public Result<?> sendSms(@RequestBody Map<String, String> body) {
        try {
            return Result.success(userService.sendSms(body.get("phone")));
        } catch (RuntimeException e) {
            return Result.error(400, e.getMessage());
        }
    }
}