package com.ecommerce.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private Long id;
    private String username;
    private String nickname;
    private String role;
    @JsonProperty("is_admin")
    private boolean isAdmin;
}