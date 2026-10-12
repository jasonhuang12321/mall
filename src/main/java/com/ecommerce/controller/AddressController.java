package com.ecommerce.controller;

import com.ecommerce.dto.Result;
import com.ecommerce.model.Address;
import com.ecommerce.service.AddressService;
import com.ecommerce.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;
    private final JwtUtil jwtUtil;

    @GetMapping
    public Result<List<Address>> getUserAddresses(@RequestHeader("Authorization") String token) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        return Result.success(addressService.getUserAddresses(userId));
    }

    @PostMapping
    public Result<Address> addAddress(@RequestHeader("Authorization") String token,
                                       @RequestBody Address address) {
        Long userId = jwtUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        return Result.success(addressService.addAddress(userId, address));
    }

    @PutMapping("/{id}")
    public Result<Address> updateAddress(@PathVariable Long id,
                                          @RequestBody Address address) {
        return Result.success(addressService.updateAddress(id, address));
    }

    @PutMapping("/{id}/default")
    public Result<Void> setDefaultAddress(@PathVariable Long id) {
        addressService.setDefaultAddress(id);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> deleteAddress(@PathVariable Long id) {
        addressService.deleteAddress(id);
        return Result.success();
    }
}