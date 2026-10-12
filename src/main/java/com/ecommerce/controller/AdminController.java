package com.ecommerce.controller;

import com.ecommerce.dto.Result;
import com.ecommerce.model.Favorite;
import com.ecommerce.model.User;
import com.ecommerce.service.FavoriteService;
import com.ecommerce.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserService userService;
    private final FavoriteService favoriteService;

    @GetMapping("/users")
    @Transactional(readOnly = true)
    public Result<List<User>> getAllUsers() {
        return Result.success(userService.getAllUsers());
    }

    @DeleteMapping("/users/{id}")
    @Transactional
    public Result<?> deleteUser(@PathVariable Long id) {
        try {
            userService.deleteUser(id);
            return Result.success("用户已删除");
        } catch (RuntimeException e) {
            return Result.error(400, e.getMessage());
        }
    }

    @GetMapping("/favorites")
    @Transactional(readOnly = true)
    public Result<List<Favorite>> getAllFavorites() {
        return Result.success(favoriteService.getAllFavorites());
    }
}