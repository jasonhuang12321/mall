package com.ecommerce.repository;

import com.ecommerce.model.Address;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface AddressRepository extends JpaRepository<Address, Long> {
    @Query("SELECT a FROM Address a WHERE a.user.id = :userId")
    List<Address> findByUserId(@Param("userId") Long userId);

    @Query("SELECT a FROM Address a WHERE a.user.id = :userId AND a.isDefault = true")
    Address findByUserIdAndIsDefaultTrue(@Param("userId") Long userId);
}