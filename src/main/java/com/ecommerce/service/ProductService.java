package com.ecommerce.service;

import com.ecommerce.model.Product;
import com.ecommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<Product> getProducts(String keyword, Long categoryId, BigDecimal minPrice, BigDecimal maxPrice, String sort) {
        return productRepository.findFiltered(keyword, categoryId, minPrice, maxPrice, sort);
    }

    @Transactional(readOnly = true)
    public List<Product> getAllProducts() {
        return productRepository.findByStatus("ON");
    }

    @Transactional(readOnly = true)
    public Product getProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("商品不存在"));
    }

    @Transactional(readOnly = true)
    public List<Product> getAllProductsAdmin() {
        return productRepository.findAll();
    }

    @Transactional
    public Product saveProduct(Product product) {
        return productRepository.save(product);
    }

    @Transactional
    public Product updateProduct(Long id, Product product) {
        Product existing = getProductById(id);
        existing.setName(product.getName());
        existing.setDescription(product.getDescription());
        existing.setPrice(product.getPrice());
        existing.setOriginalPrice(product.getOriginalPrice());
        existing.setSales(product.getSales());
        existing.setStock(product.getStock());
        existing.setImageUrl(product.getImageUrl());
        existing.setCategory(product.getCategory());
        existing.setStatus(product.getStatus());
        return productRepository.save(existing);
    }

    @Transactional
    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }
}