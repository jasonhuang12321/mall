package com.ecommerce.controller;

import com.ecommerce.dto.Result;
import com.ecommerce.model.CartItem;
import com.ecommerce.service.CartService;
import com.ecommerce.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;
    private final JwtUtil jwtUtil;

    @GetMapping
    public Result<List<CartItem>> getCart(@RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        return Result.success(cartService.getCartItems(userId));
    }

    @PostMapping
    public Result<CartItem> addToCart(@RequestHeader("Authorization") String token,
                                       @RequestBody Map<String, Object> body) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        Long productId = Long.valueOf(body.get("product_id").toString());
        Integer quantity = body.get("quantity") != null ? Integer.valueOf(body.get("quantity").toString()) : 1;
        return Result.success(cartService.addToCart(userId, productId, quantity));
    }

    @PutMapping("/{id}")
    public Result<CartItem> updateCartItem(@PathVariable Long id,
                                            @RequestBody Map<String, Object> body) {
        Integer quantity = Integer.valueOf(body.get("quantity").toString());
        return Result.success(cartService.updateCartItem(id, quantity));
    }

    @DeleteMapping("/{id}")
    public Result<Void> removeCartItem(@PathVariable Long id) {
        cartService.removeCartItem(id);
        return Result.success();
    }

    @DeleteMapping
    public Result<Void> clearCart(@RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        cartService.clearCart(userId);
        return Result.success();
    }
}