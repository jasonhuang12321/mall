package com.ecommerce.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_no", nullable = false, unique = true, length = 32)
    private String orderNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @JsonProperty("user_id")
    public Long getUserId() {
        return user != null ? user.getId() : null;
    }

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "address_id")
    @JsonIgnore
    private Address address;

    @Column(name = "receiver_name", length = 50)
    private String receiverName;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "address_detail", length = 500)
    @JsonProperty("address")
    private String addressDetail;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @JsonIgnore
    public String getStatus() {
        return status;
    }

    @JsonIgnore
    public void setStatus(String status) {
        this.status = status;
    }

    @JsonProperty("status")
    public int getStatusNumeric() {
        return switch (status) {
            case "PENDING" -> 1;
            case "PAID" -> 2;
            case "SHIPPED" -> 3;
            case "COMPLETED" -> 4;
            case "CANCELLED" -> 5;
            default -> 1;
        };
    }

    @JsonProperty("status_str")
    public String getStatusStr() {
        return status;
    }

    @JsonProperty("status")
    public void setStatusNumeric(int statusCode) {
        this.status = switch (statusCode) {
            case 1 -> "PENDING";
            case 2 -> "PAID";
            case 3 -> "SHIPPED";
            case 4 -> "COMPLETED";
            case 5 -> "CANCELLED";
            default -> "PENDING";
        };
    }

    @JsonProperty("status_text")
    public String getStatusText() {
        return switch (status) {
            case "PENDING" -> "待付款";
            case "PAID" -> "已付款";
            case "SHIPPED" -> "已发货";
            case "COMPLETED" -> "已完成";
            case "CANCELLED" -> "已取消";
            default -> "待付款";
        };
    }

    @Column(length = 500)
    private String remark;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}