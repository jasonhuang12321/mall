package com.ecommerce.controller;

import com.ecommerce.dto.Result;
import com.ecommerce.service.ReviewService;
import com.ecommerce.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;
    private final JwtUtil jwtUtil;

    @GetMapping("/product/{productId}")
    public Result<?> getReviews(@PathVariable Long productId) {
        var reviews = reviewService.getProductReviews(productId);
        return Result.success(reviews);
    }

    @PostMapping
    public Result<?> addReview(@RequestHeader("Authorization") String token,
                                @RequestBody Map<String, Object> body) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        reviewService.addReview(userId, Long.valueOf(body.get("product_id").toString()),
                (Integer) body.get("rating"), (String) body.get("content"));
        return Result.success("评论成功");
    }

    @DeleteMapping("/{id}")
    public Result<?> deleteReview(@RequestHeader("Authorization") String token,
                                   @PathVariable Long id) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        reviewService.deleteReview(userId, id);
        return Result.success("删除成功");
    }
}