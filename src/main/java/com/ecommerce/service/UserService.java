package com.ecommerce.service;

import com.ecommerce.controller.CaptchaController;
import com.ecommerce.dto.LoginRequest;
import com.ecommerce.dto.LoginResponse;
import com.ecommerce.dto.RegisterRequest;
import com.ecommerce.model.User;
import com.ecommerce.repository.UserRepository;
import com.ecommerce.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final CaptchaController captchaController;

    // 短信验证码存储（token -> {phone, code}）
    private final Map<String, String[]> smsTokenStore = new ConcurrentHashMap<>();

    public LoginResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("用户名已存在");
        }

        // 基于 token 验证短信验证码
        String smsToken = request.getSms_token();
        if (smsToken == null || smsToken.isEmpty()) {
            throw new RuntimeException("短信验证码已过期，请重新获取");
        }
        String[] stored = smsTokenStore.get(smsToken);
        if (stored == null) {
            throw new RuntimeException("短信验证码已过期，请重新获取");
        }
        String storedPhone = stored[0];
        String storedCode = stored[1];
        if (!storedPhone.equals(request.getPhone())) {
            throw new RuntimeException("手机号与验证码不匹配");
        }
        if (!storedCode.equals(request.getSms_code())) {
            throw new RuntimeException("短信验证码错误");
        }
        smsTokenStore.remove(smsToken);

        String role = (request.getIs_admin() != null && request.getIs_admin()) ? "ADMIN" : "USER";

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname() != null ? request.getNickname() : request.getUsername())
                .phone(request.getPhone())
                .role(role)
                .build();
        user = userRepository.save(user);

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        return buildResponse(user, token);
    }

    public LoginResponse login(LoginRequest request) {
        // 验证码校验
        try {
            int answer = captchaController.getAnswer(request.getCaptcha_token());
            int userAnswer;
            try {
                userAnswer = Integer.parseInt(request.getCaptcha_answer());
            } catch (NumberFormatException e) {
                throw new RuntimeException("验证码错误");
            }
            if (userAnswer != answer) {
                throw new RuntimeException("验证码错误");
            }
        } catch (RuntimeException e) {
            throw new RuntimeException("验证码错误或已过期");
        }

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("用户名或密码错误"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        return buildResponse(user, token);
    }

    public Map<String, Object> sendSms(String phone) {
        // 生成6位随机验证码
        String code = String.format("%06d", new Random().nextInt(1000000));
        String token = UUID.randomUUID().toString();
        smsTokenStore.put(token, new String[]{phone, code});
        // 5分钟后过期
        new Thread(() -> {
            try { Thread.sleep(300000); smsTokenStore.remove(token); } catch (Exception ignored) {}
        }).start();
        return Map.of("code", 200, "message", "发送成功", "token", token, "debug_code", code);
    }

    @Transactional(readOnly = true)
    public User getCurrentUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
    }

    @Transactional
    public Map<String, Object> changePassword(Long userId, String oldPassword, String newPassword) {
        User user = getCurrentUser(userId);
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("旧密码错误");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return Map.of("message", "密码修改成功");
    }

    @Transactional
    public Map<String, Object> updateUsername(Long userId, String newUsername) {
        User user = getCurrentUser(userId);
        if (user.getUsername().equals(newUsername)) {
            throw new RuntimeException("新用户名与当前用户名相同");
        }
        if (userRepository.existsByUsername(newUsername)) {
            throw new RuntimeException("用户名已存在");
        }
        user.setUsername(newUsername);
        userRepository.save(user);
        return Map.of("message", "用户名修改成功", "username", newUsername);
    }

    @Transactional
    public Map<String, Object> updateAvatar(Long userId, String avatarUrl) {
        User user = getCurrentUser(userId);
        user.setAvatar(avatarUrl);
        userRepository.save(user);
        return Map.of("message", "头像更新成功", "avatar", avatarUrl);
    }

    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = getCurrentUser(userId);
        if ("ADMIN".equals(user.getRole())) {
            throw new RuntimeException("不能删除管理员账户");
        }
        userRepository.delete(user);
    }

    private LoginResponse buildResponse(User user, String token) {
        return new LoginResponse(token, user.getId(), user.getUsername(),
                user.getNickname(), user.getRole(), "ADMIN".equals(user.getRole()));
    }
}