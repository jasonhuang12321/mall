package com.ecommerce.controller;

import com.ecommerce.dto.Result;
import com.ecommerce.service.FavoriteService;
import com.ecommerce.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;
    private final JwtUtil jwtUtil;

    @GetMapping
    public Result<?> getFavorites(@RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        return Result.success(favoriteService.getUserFavorites(userId));
    }

    @GetMapping("/check/{productId}")
    public Result<?> checkFavorite(@RequestHeader("Authorization") String token,
                                    @PathVariable Long productId) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        boolean isFav = favoriteService.isFavorited(userId, productId);
        return Result.success(Map.of("is_favorite", isFav));
    }

    @PostMapping
    public Result<?> addFavorite(@RequestHeader("Authorization") String token,
                                  @RequestBody Map<String, Long> body) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        favoriteService.addFavorite(userId, body.get("product_id"));
        return Result.success("收藏成功");
    }

    @DeleteMapping
    public Result<?> removeFavorite(@RequestHeader("Authorization") String token,
                                     @RequestParam Long product_id) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        favoriteService.removeFavorite(userId, product_id);
        return Result.success("取消收藏");
    }
}