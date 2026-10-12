package com.ecommerce.service;

import com.ecommerce.model.CartItem;
import com.ecommerce.model.Product;
import com.ecommerce.model.User;
import com.ecommerce.repository.CartItemRepository;
import com.ecommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<CartItem> getCartItems(Long userId) {
        return cartItemRepository.findByUserId(userId);
    }

    @Transactional
    public CartItem addToCart(Long userId, Long productId, Integer quantity) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("商品不存在"));

        if (product.getStock() < quantity) {
            throw new RuntimeException("库存不足");
        }

        var existing = cartItemRepository.findByUserIdAndProductId(userId, productId);
        if (existing.isPresent()) {
            CartItem item = existing.get();
            item.setQuantity(item.getQuantity() + quantity);
            return cartItemRepository.save(item);
        }

        CartItem item = CartItem.builder()
                .user(User.builder().id(userId).build())
                .product(product)
                .quantity(quantity)
                .build();
        return cartItemRepository.save(item);
    }

    @Transactional
    public CartItem updateCartItem(Long itemId, Integer quantity) {
        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("购物车项不存在"));

        if (quantity <= 0) {
            cartItemRepository.delete(item);
            return null;
        }

        item.setQuantity(quantity);
        return cartItemRepository.save(item);
    }

    @Transactional
    public void removeCartItem(Long itemId) {
        cartItemRepository.deleteById(itemId);
    }

    @Transactional
    public void clearCart(Long userId) {
        cartItemRepository.deleteByUserId(userId);
    }
}