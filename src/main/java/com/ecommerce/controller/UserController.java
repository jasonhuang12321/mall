package com.ecommerce.controller;

import com.ecommerce.dto.Result;
import com.ecommerce.model.User;
import com.ecommerce.service.UserService;
import com.ecommerce.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    @Value("${app.upload.path:uploads}")
    private String uploadDir;

    @GetMapping("/info")
    public Result<?> getUserInfo(@RequestHeader("Authorization") String token) {
        try {
            Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
            return Result.success(userService.getCurrentUser(userId));
        } catch (RuntimeException e) {
            return Result.error(400, e.getMessage());
        }
    }

    @PostMapping("/change-password")
    public Result<?> changePassword(@RequestHeader("Authorization") String token,
                                     @RequestBody Map<String, String> body) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        try {
            return Result.success(userService.changePassword(userId,
                    body.get("old_password"), body.get("new_password")));
        } catch (RuntimeException e) {
            return Result.error(400, e.getMessage());
        }
    }

    @PostMapping("/update-username")
    public Result<?> updateUsername(@RequestHeader("Authorization") String token,
                                     @RequestBody Map<String, String> body) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        try {
            return Result.success(userService.updateUsername(userId, body.get("username")));
        } catch (RuntimeException e) {
            return Result.error(400, e.getMessage());
        }
    }

    @PostMapping("/avatar")
    public Result<?> uploadAvatar(@RequestHeader("Authorization") String token,
                                   @RequestParam("avatar") MultipartFile file) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        try {
            if (file.isEmpty()) {
                return Result.error(400, "请选择文件");
            }
            if (file.getSize() > 5 * 1024 * 1024) {
                return Result.error(400, "头像图片不能超过5MB");
            }
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return Result.error(400, "只能上传图片文件");
            }

            Path uploadPath = Paths.get(uploadDir, "avatars").toAbsolutePath();
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String filename = UUID.randomUUID().toString() + extension;

            Path filePath = uploadPath.resolve(filename);
            file.transferTo(filePath.toFile());

            String avatarUrl = "/uploads/avatars/" + filename;
            return Result.success(userService.updateAvatar(userId, avatarUrl));
        } catch (IOException e) {
            return Result.error(500, "文件上传失败: " + e.getMessage());
        } catch (RuntimeException e) {
            return Result.error(400, e.getMessage());
        }
    }
}