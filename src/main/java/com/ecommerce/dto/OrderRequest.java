package com.ecommerce.dto;

import lombok.Data;
import java.util.List;

@Data
public class OrderRequest {
    private Long addressId;
    private String remark;
    private List<OrderItemRequest> items;

    @Data
    public static class OrderItemRequest {
        private Long productId;
        private Integer quantity;
    }
}