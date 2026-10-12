package com.ecommerce.service;

import com.ecommerce.model.Banner;
import com.ecommerce.repository.BannerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BannerService {

    private final BannerRepository bannerRepository;

    @Transactional(readOnly = true)
    public List<Banner> getAllBanners() {
        return bannerRepository.findAllByOrderBySortOrderAsc();
    }
}