package com.ecommerce.controller;

import com.ecommerce.dto.Result;
import com.ecommerce.model.Order;
import com.ecommerce.service.OrderService;
import com.ecommerce.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final JwtUtil jwtUtil;

    @PostMapping("/api/orders")
    public Result<Order> createOrder(@RequestHeader("Authorization") String token,
                                      @RequestBody Map<String, String> body) {
        try {
            Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
            return Result.success(orderService.createOrderFromCart(userId,
                    body.get("receiver_name"), body.get("phone"),
                    body.get("address"), body.get("remark")));
        } catch (RuntimeException e) {
            return Result.error(400, e.getMessage());
        }
    }

    @GetMapping("/api/orders")
    public Result<List<Order>> getUserOrders(@RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        return Result.success(orderService.getUserOrders(userId));
    }

    @GetMapping("/api/orders/{id}")
    public Result<Order> getOrderById(@PathVariable Long id) {
        return Result.success(orderService.getOrderById(id));
    }

    @PutMapping("/api/orders/{id}/pay")
    public Result<?> payOrder(@PathVariable Long id) {
        try {
            return Result.success(orderService.payOrder(id));
        } catch (RuntimeException e) {
            return Result.error(400, e.getMessage());
        }
    }

    @PutMapping("/api/orders/{id}/cancel")
    public Result<?> cancelOrder(@PathVariable Long id) {
        try {
            return Result.success(orderService.cancelOrder(id));
        } catch (RuntimeException e) {
            return Result.error(400, e.getMessage());
        }
    }

    // 管理员接口
    @GetMapping("/api/admin/orders")
    public Result<List<Order>> getAllOrders() {
        return Result.success(orderService.getAllOrders());
    }

    @PutMapping("/api/admin/orders/{id}/status")
    public Result<Order> adminUpdateOrderStatus(@PathVariable Long id,
                                                 @RequestBody Map<String, Object> body) {
        String status = body.get("status").toString();
        return Result.success(orderService.updateOrderStatus(id, status));
    }
}