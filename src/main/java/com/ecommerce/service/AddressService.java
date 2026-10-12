package com.ecommerce.service;

import com.ecommerce.model.Address;
import com.ecommerce.model.User;
import com.ecommerce.repository.AddressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AddressService {

    private final AddressRepository addressRepository;

    @Transactional(readOnly = true)
    public List<Address> getUserAddresses(Long userId) {
        return addressRepository.findByUserId(userId);
    }

    @Transactional
    public Address addAddress(Long userId, Address address) {
        // 如果设为默认，取消其他默认地址
        if (Boolean.TRUE.equals(address.getIsDefault())) {
            List<Address> addresses = addressRepository.findByUserId(userId);
            for (Address addr : addresses) {
                if (Boolean.TRUE.equals(addr.getIsDefault())) {
                    addr.setIsDefault(false);
                    addressRepository.save(addr);
                }
            }
        }
        address.setUser(User.builder().id(userId).build());
        return addressRepository.save(address);
    }

    @Transactional
    public Address updateAddress(Long id, Address address) {
        Address existing = addressRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("地址不存在"));

        existing.setReceiverName(address.getReceiverName());
        existing.setPhone(address.getPhone());
        existing.setProvince(address.getProvince());
        existing.setCity(address.getCity());
        existing.setDistrict(address.getDistrict());
        existing.setDetail(address.getDetail());
        existing.setIsDefault(address.getIsDefault());

        return addressRepository.save(existing);
    }

    @Transactional
    public void deleteAddress(Long id) {
        addressRepository.deleteById(id);
    }

    @Transactional
    public void setDefaultAddress(Long id) {
        Address address = addressRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("地址不存在"));
        // 取消该用户所有默认地址
        List<Address> addresses = addressRepository.findByUserId(address.getUser().getId());
        for (Address addr : addresses) {
            if (Boolean.TRUE.equals(addr.getIsDefault())) {
                addr.setIsDefault(false);
                addressRepository.save(addr);
            }
        }
        address.setIsDefault(true);
        addressRepository.save(address);
    }
}