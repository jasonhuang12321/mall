package com.ecommerce.repository;

import com.ecommerce.model.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    @Query("SELECT c FROM CartItem c JOIN FETCH c.product p JOIN FETCH p.category WHERE c.user.id = :userId")
    List<CartItem> findByUserId(@Param("userId") Long userId);

    @Query("SELECT c FROM CartItem c WHERE c.user.id = :userId AND c.product.id = :productId")
    Optional<CartItem> findByUserIdAndProductId(@Param("userId") Long userId, @Param("productId") Long productId);

    @Modifying
    @Query("DELETE FROM CartItem c WHERE c.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}