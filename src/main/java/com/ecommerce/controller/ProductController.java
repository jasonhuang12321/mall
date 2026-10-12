package com.ecommerce.controller;

import com.ecommerce.dto.Result;
import com.ecommerce.model.Product;
import com.ecommerce.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public Result<List<Product>> getProducts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long category_id,
            @RequestParam(required = false) BigDecimal min_price,
            @RequestParam(required = false) BigDecimal max_price,
            @RequestParam(required = false) String sort) {
        return Result.success(productService.getProducts(keyword, category_id, min_price, max_price, sort));
    }

    @GetMapping("/{id}")
    public Result<Product> getProductById(@PathVariable Long id) {
        return Result.success(productService.getProductById(id));
    }

    @GetMapping("/admin/all")
    public Result<List<Product>> getAllProductsAdmin() {
        return Result.success(productService.getAllProductsAdmin());
    }

    @PostMapping
    public Result<Product> createProduct(@RequestBody Product product) {
        return Result.success(productService.saveProduct(product));
    }

    @PutMapping("/{id}")
    public Result<Product> updateProduct(@PathVariable Long id, @RequestBody Product product) {
        return Result.success(productService.updateProduct(id, product));
    }

    @DeleteMapping("/{id}")
    public Result<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return Result.success();
    }
}