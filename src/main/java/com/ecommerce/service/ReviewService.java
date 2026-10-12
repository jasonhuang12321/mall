package com.ecommerce.service;

import com.ecommerce.model.Review;
import com.ecommerce.model.Product;
import com.ecommerce.model.User;
import com.ecommerce.repository.ReviewRepository;
import com.ecommerce.repository.ProductRepository;
import com.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional
    public Review addReview(Long userId, Long productId, Integer rating, String content) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("用户不存在"));
        Product product = productRepository.findById(productId).orElseThrow(() -> new RuntimeException("商品不存在"));
        Review review = Review.builder().user(user).product(product).rating(rating).content(content).build();
        return reviewRepository.save(review);
    }

    @Transactional(readOnly = true)
    public List<Review> getProductReviews(Long productId) {
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(productId);
    }

    @Transactional(readOnly = true)
    public long getReviewCount(Long productId) {
        return reviewRepository.countByProductId(productId);
    }

    @Transactional
    public void deleteReview(Long userId, Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("评论不存在"));
        if (!review.getUser().getId().equals(userId)) {
            throw new RuntimeException("只能删除自己的评论");
        }
        reviewRepository.delete(review);
    }
}