package com.ecommerce.controller;

import com.ecommerce.dto.Result;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class UploadController {

    @Value("${app.upload.path:uploads}")
    private String uploadPath;

    @PostMapping("/upload")
    public Result<?> uploadImage(@RequestParam("image") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return Result.error(400, "请选择图片文件");
            }

            // 检查文件类型
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return Result.error(400, "不支持的文件格式，仅支持图片");
            }

            String originalName = file.getOriginalFilename();
            String ext = "";
            if (originalName != null && originalName.contains(".")) {
                ext = originalName.substring(originalName.lastIndexOf(".")).toLowerCase();
            }
            if (!ext.matches("\\.(jpg|jpeg|png|gif|webp)$")) {
                return Result.error(400, "不支持的文件格式，仅支持 jpg/png/gif/webp");
            }

            // 生成唯一文件名
            String filename = UUID.randomUUID().toString() + ext;

            // 确保目录存在（使用绝对路径）
            Path uploadDir = Paths.get(uploadPath).toAbsolutePath();
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }

            // 保存文件
            Path filePath = uploadDir.resolve(filename);
            file.transferTo(filePath.toFile());

            String url = "/uploads/" + filename;
            return Result.success(url);

        } catch (IOException e) {
            return Result.error(500, "文件保存失败");
        }
    }
}