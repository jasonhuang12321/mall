package com.ecommerce.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "favorites", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "product_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Favorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnore
    private Product product;

    @JsonProperty("username")
    public String getUsername() {
        return user != null ? user.getUsername() : null;
    }

    @JsonProperty("productName")
    public String getProductName() {
        return product != null ? product.getName() : null;
    }

    @JsonProperty("user_id")
    public Long getUserId() {
        return user != null ? user.getId() : null;
    }

    @JsonProperty("product_id")
    public Long getProductId() {
        return product != null ? product.getId() : null;
    }

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}