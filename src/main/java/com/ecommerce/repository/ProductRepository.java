package com.ecommerce.repository;

import com.ecommerce.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByStatus(String status);

    @Query("SELECT p FROM Product p WHERE p.category.id = :categoryId AND p.status = :status")
    List<Product> findByCategoryIdAndStatus(@Param("categoryId") Long categoryId, @Param("status") String status);

    List<Product> findByNameContainingAndStatus(String keyword, String status);

    @Query("SELECT p FROM Product p WHERE p.status = 'ON' " +
           "AND (:keyword IS NULL OR p.name LIKE %:keyword%) " +
           "AND (:categoryId IS NULL OR p.category.id = :categoryId) " +
           "AND (:minPrice IS NULL OR p.price >= :minPrice) " +
           "AND (:maxPrice IS NULL OR p.price <= :maxPrice) " +
           "ORDER BY " +
           "CASE WHEN :sort = 'price_asc' THEN p.price END ASC, " +
           "CASE WHEN :sort = 'price_desc' THEN p.price END DESC, " +
           "CASE WHEN :sort = 'sales' THEN p.sales END DESC, " +
           "p.id ASC")
    List<Product> findFiltered(
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("sort") String sort);
}