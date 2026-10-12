package com.ecommerce.service;

import com.ecommerce.model.Favorite;
import com.ecommerce.model.Product;
import com.ecommerce.model.User;
import com.ecommerce.repository.FavoriteRepository;
import com.ecommerce.repository.ProductRepository;
import com.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional
    public Favorite addFavorite(Long userId, Long productId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("用户不存在"));
        Product product = productRepository.findById(productId).orElseThrow(() -> new RuntimeException("商品不存在"));
        if (favoriteRepository.existsByUserAndProduct(user, product)) {
            throw new RuntimeException("已收藏");
        }
        Favorite favorite = Favorite.builder().user(user).product(product).build();
        return favoriteRepository.save(favorite);
    }

    @Transactional
    public void removeFavorite(Long userId, Long productId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("用户不存在"));
        Product product = productRepository.findById(productId).orElseThrow(() -> new RuntimeException("商品不存在"));
        favoriteRepository.deleteByUserAndProduct(user, product);
    }

    @Transactional(readOnly = true)
    public boolean isFavorited(Long userId, Long productId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("用户不存在"));
        Product product = productRepository.findById(productId).orElseThrow(() -> new RuntimeException("商品不存在"));
        return favoriteRepository.existsByUserAndProduct(user, product);
    }

    @Transactional(readOnly = true)
    public List<Favorite> getUserFavorites(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("用户不存在"));
        return favoriteRepository.findByUserOrderByCreatedAtDesc(user);
    }

    @Transactional(readOnly = true)
    public List<Favorite> getAllFavorites() {
        return favoriteRepository.findAll();
    }
}