package com.ecommerce.config;

import com.ecommerce.util.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // 公开接口
                .requestMatchers("/api/register", "/api/login", "/api/sms/**").permitAll()
                .requestMatchers("/api/captcha/**").permitAll()
                .requestMatchers("/api/products/**").permitAll()
                .requestMatchers("/api/categories/**").permitAll()
                .requestMatchers("/api/banners/**").permitAll()
                .requestMatchers("/api/comments/product/**").permitAll()
                .requestMatchers("/uploads/**").permitAll()
                // 静态资源
                .requestMatchers("/", "/index.html", "/login.html", "/register.html",
                        "/product-detail.html", "/cart.html", "/orders.html", "/profile.html").permitAll()
                .requestMatchers("/css/**", "/js/**", "/img/**", "/images/**", "/admin/**").permitAll()
                // 需要认证
                .requestMatchers("/api/user/**", "/api/admin/**",
                        "/api/cart/**", "/api/orders/**", "/api/addresses/**",
                        "/api/favorites/**", "/api/comments/**", "/api/upload/**").authenticated()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}