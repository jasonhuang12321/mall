package com.ecommerce.controller;

import com.ecommerce.dto.Result;
import com.ecommerce.service.BannerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/banners")
@RequiredArgsConstructor
public class BannerController {

    private final BannerService bannerService;

    @GetMapping
    public Result<?> getBanners() {
        try {
            return Result.success(bannerService.getAllBanners());
        } catch (RuntimeException e) {
            return Result.error(500, e.getMessage());
        }
    }
}