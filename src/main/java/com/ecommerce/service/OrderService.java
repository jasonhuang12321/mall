package com.ecommerce.service;

import com.ecommerce.model.*;
import com.ecommerce.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final CartService cartService;
    private final AddressRepository addressRepository;

    @Transactional
    public Order createOrderFromCart(Long userId, String receiverName, String phone, String address, String remark) {
        List<CartItem> cartItems = cartService.getCartItems(userId);
        if (cartItems.isEmpty()) {
            throw new RuntimeException("购物车为空");
        }

        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (CartItem cartItem : cartItems) {
            Product product = cartItem.getProduct();
            if (product.getStock() < cartItem.getQuantity()) {
                throw new RuntimeException("商品 " + product.getName() + " 库存不足");
            }

            product.setStock(product.getStock() - cartItem.getQuantity());
            product.setSales((product.getSales() != null ? product.getSales() : 0) + cartItem.getQuantity());
            productRepository.save(product);

            BigDecimal itemTotal = product.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity()));
            totalAmount = totalAmount.add(itemTotal);

            OrderItem orderItem = OrderItem.builder()
                    .product(product)
                    .productName(product.getName())
                    .productPrice(product.getPrice())
                    .quantity(cartItem.getQuantity())
                    .build();
            orderItems.add(orderItem);
        }

        String orderNo = "ORD" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"));

        Order order = Order.builder()
                .orderNo(orderNo)
                .user(User.builder().id(userId).build())
                .receiverName(receiverName)
                .phone(phone)
                .addressDetail(address)
                .remark(remark)
                .totalAmount(totalAmount)
                .status("PENDING")
                .items(new ArrayList<>())
                .build();

        for (OrderItem item : orderItems) {
            item.setOrder(order);
        }
        order.getItems().addAll(orderItems);

        order = orderRepository.save(order);

        cartService.clearCart(userId);

        return order;
    }

    @Transactional(readOnly = true)
    public List<Order> getUserOrders(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public Order getOrderById(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("订单不存在"));
    }

    @Transactional
    public Order updateOrderStatus(Long orderId, String status) {
        Order order = getOrderById(orderId);
        if ("CANCELLED".equals(status) && !"CANCELLED".equals(order.getStatus())) {
            for (OrderItem item : order.getItems()) {
                Product product = item.getProduct();
                product.setStock(product.getStock() + item.getQuantity());
                productRepository.save(product);
            }
        }
        order.setStatus(status);
        return orderRepository.save(order);
    }

    @Transactional(readOnly = true)
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    @Transactional
    public Map<String, Object> payOrder(Long orderId) {
        Order order = getOrderById(orderId);
        if (!"PENDING".equals(order.getStatus())) {
            throw new RuntimeException("订单状态不正确，无法支付");
        }
        order.setStatus("PAID");
        orderRepository.save(order);
        return Map.of("code", 200, "message", "支付成功");
    }

    @Transactional
    public Map<String, Object> cancelOrder(Long orderId) {
        Order order = getOrderById(orderId);
        if (!"PENDING".equals(order.getStatus())) {
            throw new RuntimeException("订单状态不正确，无法取消");
        }
        for (OrderItem item : order.getItems()) {
            Product product = item.getProduct();
            product.setStock(product.getStock() + item.getQuantity());
            productRepository.save(product);
        }
        order.setStatus("CANCELLED");
        orderRepository.save(order);
        return Map.of("code", 200, "message", "订单已取消");
    }
}