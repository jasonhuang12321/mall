package com.ecommerce.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "banners")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Banner {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 500)
    private String image;

    @Column(length = 200)
    private String title;

    @Column(length = 500)
    private String link;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}