package com.ecommerce.repository;

import com.ecommerce.model.Banner;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BannerRepository extends JpaRepository<Banner, Long> {
    List<Banner> findAllByOrderBySortOrderAsc();
}