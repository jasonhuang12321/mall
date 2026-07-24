// 个人中心 - 普通用户和管理员两套菜单
let currentTab = 'cart';

// 页面初始化
window.onload = function() {
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    initProfile();
};

function initProfile() {
    $('profileName').textContent = currentUser.nickname || currentUser.username;
    renderMenu();
    switchTab(currentTab);
    if (!currentUser.is_admin) loadCartBadge();
}

// 渲染菜单
function renderMenu() {
    const menu = $('profileMenu');
    if (currentUser.is_admin) {
        menu.innerHTML = `
            <li class="active" data-tab="products">商品管理</li>
            <li data-tab="users">用户管理</li>
            <li data-tab="adminOrders">订单管理</li>`;
        currentTab = 'products';
    } else {
        menu.innerHTML = `
            <li class="active" data-tab="cart">我的购物车</li>
            <li data-tab="addresses">收货地址</li>
            <li data-tab="orders">我的订单</li>
            <li data-tab="password">修改密码</li>`;
        currentTab = 'cart';
    }
    menu.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', function() {
            menu.querySelectorAll('li').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            switchTab(this.dataset.tab);
        });
    });
}

// 切换 Tab
function switchTab(tab) {
    currentTab = tab;
    const content = $('profileContent');
    switch (tab) {
        case 'cart': renderCartTab(content); break;
        case 'addresses': renderAddressTab(content); break;
        case 'orders': renderOrdersTab(content); break;
        case 'password': renderPasswordTab(content); break;
        case 'products': renderAdminProductsTab(content); break;
        case 'users': renderAdminUsersTab(content); break;
        case 'adminOrders': renderAdminOrdersTab(content); break;
    }
}

// ==================== 购物车 Tab ====================
function renderCartTab(container) {
    container.innerHTML = `
        <h3>我的购物车</h3>
        <div id="cartList"></div>
        <div id="cartFooter" style="display:none">
            <div class="cart-total" style="margin-top:24px;text-align:right">
                合计: <span id="cartTotal" style="color:var(--primary);font-size:22px;font-weight:700"></span>
            </div>
            <div style="text-align:right;margin-top:16px">
                <button class="btn btn-primary btn-large" onclick="createOrder()">提交订单</button>
            </div>
        </div>`;
    loadCart();
}

async function loadCart() {
    try {
        const data = await fetchAPI('/cart');
        const items = data.data;
        if (!items.length) {
            $('cartList').innerHTML = '<p class="empty-text">购物车空空如也，<a href="index.html">去逛逛</a></p>';
            $('cartFooter').style.display = 'none';
            return;
        }
        let total = 0;
        $('cartList').innerHTML = items.map(item => {
            const subtotal = item.price * item.quantity;
            total += subtotal;
            return `
                <div class="cart-item" id="cartItem${item.product_id}">
                    <img src="${item.image}" alt="${item.product_name}" onerror="this.src='https://picsum.photos/seed/fallback/400/400'">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.product_name}</div>
                        <div class="cart-item-price">${formatPrice(item.price)}</div>
                        <div class="cart-item-actions">
                            <button class="qty-btn" onclick="updateCartQty(${item.product_id}, ${item.quantity - 1})">-</button>
                            <span class="qty-num">${item.quantity}</span>
                            <button class="qty-btn" onclick="updateCartQty(${item.product_id}, ${item.quantity + 1})">+</button>
                            <button class="btn btn-outline btn-sm" style="margin-left:12px" onclick="removeCartItem(${item.product_id})">删除</button>
                        </div>
                    </div>
                </div>`;
        }).join('');
        $('cartTotal').textContent = formatPrice(total);
        $('cartFooter').style.display = 'block';
        $('cartBadge').textContent = items.length;
    } catch (e) { $('cartList').innerHTML = '<p class="empty-text">加载失败</p>'; }
}

async function updateCartQty(productId, qty) {
    if (qty <= 0) {
        if (!confirm('确定要删除该商品吗？')) return;
        await removeCartItem(productId);
        return;
    }
    try {
        await fetchAPI('/cart', {
            method: 'PUT',
            body: JSON.stringify({ product_id: productId, quantity: qty })
        });
        loadCart();
    } catch (e) { alert('更新失败'); }
}

async function removeCartItem(productId) {
    try {
        await fetchAPI('/cart', {
            method: 'DELETE',
            body: JSON.stringify({ product_id: productId })
        });
        loadCart();
    } catch (e) { alert('删除失败'); }
}

async function createOrder() {
    if (!currentUser) return;
    // 检查是否有默认地址
    try {
        const addrData = await fetchAPI('/addresses');
        const addresses = addrData.data;
        if (!addresses.length) {
            alert('请先添加收货地址');
            switchTab('addresses');
            return;
        }
        const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
        if (!confirm(`确认使用地址 "${defaultAddr.receiver_name} ${defaultAddr.phone} ${defaultAddr.province}${defaultAddr.city}${defaultAddr.district}${defaultAddr.detail}" 下单吗？`)) return;

        await fetchAPI('/orders', {
            method: 'POST',
            body: JSON.stringify({
                receiver_name: defaultAddr.receiver_name,
                phone: defaultAddr.phone,
                address: defaultAddr.province + defaultAddr.city + defaultAddr.district + defaultAddr.detail
            })
        });
        alert('下单成功！');
        loadCart();
    } catch (e) { alert('下单失败: ' + e.message); }
}

// ==================== 收货地址 Tab ====================
function renderAddressTab(container) {
    container.innerHTML = `
        <h3>收货地址</h3>
        <div style="margin-bottom:16px">
            <button class="btn btn-primary" onclick="showAddressModal()">添加地址</button>
        </div>
        <div id="addressList"></div>`;
    loadAddresses();
}

async function loadAddresses() {
    try {
        const data = await fetchAPI('/addresses');
        const addresses = data.data;
        if (!addresses.length) {
            $('addressList').innerHTML = '<p class="empty-text">暂无地址，请添加</p>';
            return;
        }
        $('addressList').innerHTML = addresses.map(a => `
            <div class="address-card ${a.is_default ? 'default' : ''}">
                <div class="address-info">
                    <div class="address-name">
                        ${a.receiver_name}
                        <span class="address-phone">${a.phone}</span>
                        ${a.is_default ? '<span class="address-tag">默认</span>' : ''}
                    </div>
                    <div class="address-detail">${a.province} ${a.city} ${a.district} ${a.detail}</div>
                </div>
                <div class="address-actions">
                    ${!a.is_default ? `<button class="btn btn-outline btn-sm" onclick="setDefaultAddr(${a.id})">设为默认</button>` : ''}
                    <button class="btn btn-outline btn-sm" onclick="editAddress(${a.id}, '${a.receiver_name}', '${a.phone}', '${a.province}', '${a.city}', '${a.district}', '${a.detail}', ${a.is_default})">编辑</button>
                    <button class="btn btn-outline btn-sm" onclick="deleteAddress(${a.id})">删除</button>
                </div>
            </div>`).join('');
    } catch (e) { $('addressList').innerHTML = '<p class="empty-text">加载失败</p>'; }
}

function showAddressModal(id) {
    if (id === undefined) {
        $('addressModalTitle').textContent = '添加地址';
        $('addrId').value = '';
        $('addrName').value = '';
        $('addrPhone').value = '';
        $('addrProvince').value = '';
        $('addrCity').value = '';
        $('addrDistrict').value = '';
        $('addrDetail').value = '';
        $('addrIsDefault').checked = false;
    }
    showModal('addressModal');
}

function editAddress(id, name, phone, province, city, district, detail, isDefault) {
    $('addressModalTitle').textContent = '编辑地址';
    $('addrId').value = id;
    $('addrName').value = name;
    $('addrPhone').value = phone;
    $('addrProvince').value = province;
    $('addrCity').value = city;
    $('addrDistrict').value = district;
    $('addrDetail').value = detail;
    $('addrIsDefault').checked = isDefault;
    showModal('addressModal');
}

async function saveAddress() {
    const id = $('addrId').value;
    const body = {
        receiver_name: $('addrName').value.trim(),
        phone: $('addrPhone').value.trim(),
        province: $('addrProvince').value.trim(),
        city: $('addrCity').value.trim(),
        district: $('addrDistrict').value.trim(),
        detail: $('addrDetail').value.trim(),
        is_default: $('addrIsDefault').checked
    };
    if (!body.receiver_name || !body.phone || !body.detail) {
        alert('请填写收货人、手机号和详细地址');
        return;
    }
    try {
        if (id) {
            await fetchAPI('/addresses/' + id, { method: 'PUT', body: JSON.stringify(body) });
        } else {
            await fetchAPI('/addresses', { method: 'POST', body: JSON.stringify(body) });
        }
        closeModal('addressModal');
        loadAddresses();
    } catch (e) { alert('保存失败: ' + e.message); }
}

async function deleteAddress(id) {
    if (!confirm('确定删除该地址吗？')) return;
    try {
        await fetchAPI('/addresses/' + id, { method: 'DELETE' });
        loadAddresses();
    } catch (e) { alert('删除失败'); }
}

async function setDefaultAddr(id) {
    try {
        await fetchAPI('/addresses/' + id + '/default', {
            method: 'PUT',
            body: JSON.stringify({})
        });
        loadAddresses();
    } catch (e) { alert('设置失败'); }
}

// ==================== 我的订单 Tab ====================
function renderOrdersTab(container) {
    container.innerHTML = '<h3>我的订单</h3><div id="orderList"></div>';
    loadOrders();
}

async function loadOrders() {
    try {
        const data = await fetchAPI('/orders');
        const orders = data.data;
        if (!orders.length) {
            $('orderList').innerHTML = '<p class="empty-text">暂无订单</p>';
            return;
        }
        $('orderList').innerHTML = orders.map(o => `
            <div class="order-card">
                <div class="order-header">
                    <span>订单号: ${o.order_no}</span>
                    <span>${new Date(o.created_at).toLocaleString('zh-CN')}</span>
                    <span class="order-status">${o.status_text}</span>
                </div>
                <div class="order-total">合计: <span>${formatPrice(o.total_amount)}</span></div>
                <div style="text-align:right;margin-top:8px">
                    ${o.status === 1 ? `<button class="btn btn-outline btn-sm" onclick="cancelOrder(${o.id})">取消订单</button>` : ''}
                </div>
            </div>`).join('');
    } catch (e) { $('orderList').innerHTML = '<p class="empty-text">加载失败</p>'; }
}

async function cancelOrder(orderId) {
    if (!confirm('确定取消该订单吗？')) return;
    try {
        await fetchAPI('/orders/' + orderId + '/cancel', { method: 'PUT', body: JSON.stringify({}) });
        loadOrders();
    } catch (e) { alert('取消失败'); }
}

// ==================== 修改密码 Tab ====================
function renderPasswordTab(container) {
    container.innerHTML = `
        <h3>修改密码</h3>
        <div style="max-width:400px">
            <div class="form-group"><label>旧密码</label><input type="password" id="oldPassword" placeholder="请输入旧密码"></div>
            <div class="form-group"><label>新密码</label><input type="password" id="newPassword" placeholder="请输入新密码"></div>
            <div class="form-group"><label>确认新密码</label><input type="password" id="confirmPassword" placeholder="请再次输入新密码"></div>
            <button class="btn btn-primary btn-block" onclick="changePassword()">修改密码</button>
        </div>`;
}

async function changePassword() {
    const oldPwd = $('oldPassword').value.trim();
    const newPwd = $('newPassword').value.trim();
    const confirmPwd = $('confirmPassword').value.trim();
    if (!oldPwd || !newPwd) { alert('请填写密码'); return; }
    if (newPwd !== confirmPwd) { alert('两次输入的新密码不一致'); return; }
    try {
        await fetchAPI('/user/change-password', {
            method: 'POST',
            body: JSON.stringify({ old_password: oldPwd, new_password: newPwd })
        });
        alert('密码修改成功');
        $('oldPassword').value = '';
        $('newPassword').value = '';
        $('confirmPassword').value = '';
    } catch (e) { alert('修改失败: ' + e.message); }
}

// ==================== 管理员 - 商品管理 ====================
function renderAdminProductsTab(container) {
    container.innerHTML = `
        <h3>商品管理</h3>
        <div style="margin-bottom:16px">
            <button class="btn btn-primary" onclick="showProductModal()">添加商品</button>
        </div>
        <div style="overflow-x:auto">
            <table class="admin-table">
                <thead>
                    <tr><th>ID</th><th>名称</th><th>价格</th><th>库存</th><th>分类</th><th>状态</th><th>操作</th></tr>
                </thead>
                <tbody id="adminProductTable"></tbody>
            </table>
        </div>`;
    loadAdminProducts();
}

async function loadAdminProducts() {
    try {
        const data = await fetchAPI('/admin/products');
        const products = data.data;
        if (!products.length) {
            $('adminProductTable').innerHTML = '<tr><td colspan="7" class="empty-text">暂无商品</td></tr>';
            return;
        }
        $('adminProductTable').innerHTML = products.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>${formatPrice(p.price)}</td>
                <td>${p.stock}</td>
                <td>${p.category_name}</td>
                <td><span class="${p.is_on_sale ? 'tag-onsale' : 'tag-off'}">${p.is_on_sale ? '上架' : '下架'}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="editProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}', '${(p.description||'').replace(/'/g, "\\'")}', ${p.price}, ${p.original_price}, ${p.stock}, '${(p.image||'').replace(/'/g, "\\'")}', ${p.category_id}, ${p.is_on_sale})">编辑</button>
                    <button class="btn btn-outline btn-sm" onclick="deleteProduct(${p.id})">删除</button>
                </td>
            </tr>`).join('');
    } catch (e) { $('adminProductTable').innerHTML = '<tr><td colspan="7" class="empty-text">加载失败</td></tr>'; }
}

function showProductModal() {
    $('productModalTitle').textContent = '添加商品';
    $('editProductId').value = '';
    $('editProductName').value = '';
    $('editProductDesc').value = '';
    $('editProductPrice').value = '';
    $('editProductOrigPrice').value = '';
    $('editProductStock').value = '';
    $('editProductImage').value = '';
    $('editProductCategoryId').value = '';
    $('editProductIsOnSale').checked = true;
    showModal('productModal');
}

function editProduct(id, name, desc, price, origPrice, stock, image, categoryId, isOnSale) {
    $('productModalTitle').textContent = '编辑商品';
    $('editProductId').value = id;
    $('editProductName').value = name;
    $('editProductDesc').value = desc;
    $('editProductPrice').value = price;
    $('editProductOrigPrice').value = origPrice;
    $('editProductStock').value = stock;
    $('editProductImage').value = image;
    $('editProductCategoryId').value = categoryId;
    $('editProductIsOnSale').checked = isOnSale;
    showModal('productModal');
}

async function saveProduct() {
    const id = $('editProductId').value;
    const body = {
        name: $('editProductName').value.trim(),
        description: $('editProductDesc').value.trim(),
        price: parseFloat($('editProductPrice').value) || 0,
        original_price: parseFloat($('editProductOrigPrice').value) || 0,
        stock: parseInt($('editProductStock').value) || 0,
        image: $('editProductImage').value.trim(),
        category_id: parseInt($('editProductCategoryId').value) || 0,
        is_on_sale: $('editProductIsOnSale').checked
    };
    if (!body.name) { alert('请输入商品名称'); return; }
    try {
        if (id) {
            await fetchAPI('/admin/products/' + id, { method: 'PUT', body: JSON.stringify(body) });
        } else {
            await fetchAPI('/admin/products', { method: 'POST', body: JSON.stringify(body) });
        }
        closeModal('productModal');
        loadAdminProducts();
    } catch (e) { alert('保存失败: ' + e.message); }
}

async function deleteProduct(id) {
    if (!confirm('确定删除该商品吗？')) return;
    try {
        await fetchAPI('/admin/products/' + id, { method: 'DELETE' });
        loadAdminProducts();
    } catch (e) { alert('删除失败'); }
}

// ==================== 管理员 - 用户管理 ====================
function renderAdminUsersTab(container) {
    container.innerHTML = `
        <h3>用户管理</h3>
        <div style="overflow-x:auto">
            <table class="admin-table">
                <thead>
                    <tr><th>ID</th><th>用户名</th><th>昵称</th><th>手机</th><th>角色</th><th>注册时间</th><th>操作</th></tr>
                </thead>
                <tbody id="adminUserTable"></tbody>
            </table>
        </div>`;
    loadAdminUsers();
}

async function loadAdminUsers() {
    try {
        const data = await fetchAPI('/admin/users');
        const users = data.data;
        if (!users.length) {
            $('adminUserTable').innerHTML = '<tr><td colspan="7" class="empty-text">暂无用户</td></tr>';
            return;
        }
        $('adminUserTable').innerHTML = users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${u.username}</td>
                <td>${u.nickname || '-'}</td>
                <td>${u.phone || '-'}</td>
                <td>${u.is_admin ? '管理员' : '普通用户'}</td>
                <td>${new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                <td>
                    ${!u.is_admin ? `<button class="btn btn-outline btn-sm" onclick="deleteUser(${u.id})">删除</button>` : '-'}
                </td>
            </tr>`).join('');
    } catch (e) { $('adminUserTable').innerHTML = '<tr><td colspan="7" class="empty-text">加载失败</td></tr>'; }
}

async function deleteUser(id) {
    if (!confirm('确定删除该用户吗？')) return;
    try {
        await fetchAPI('/admin/users/' + id, { method: 'DELETE' });
        loadAdminUsers();
    } catch (e) { alert('删除失败'); }
}

// ==================== 管理员 - 订单管理 ====================
function renderAdminOrdersTab(container) {
    container.innerHTML = '<h3>订单管理</h3><div id="adminOrderList"></div>';
    loadAdminOrders();
}

async function loadAdminOrders() {
    try {
        const data = await fetchAPI('/admin/orders');
        const orders = data.data;
        if (!orders.length) {
            $('adminOrderList').innerHTML = '<p class="empty-text">暂无订单</p>';
            return;
        }
        $('adminOrderList').innerHTML = orders.map(o => `
            <div class="order-card">
                <div class="order-header">
                    <span>订单号: ${o.order_no}</span>
                    <span>用户: ${o.username}</span>
                    <span>${new Date(o.created_at).toLocaleString('zh-CN')}</span>
                    <span class="order-status">${o.status_text}</span>
                </div>
                <div style="font-size:13px;color:var(--text-light);margin-top:4px">
                    收货人: ${o.receiver_name} ${o.phone} | ${o.address}
                </div>
                <div class="order-total">合计: <span>${formatPrice(o.total_amount)}</span></div>
                <div style="text-align:right;margin-top:8px">
                    <select id="statusSelect${o.id}" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border)">
                        <option value="1" ${o.status===1?'selected':''}>待付款</option>
                        <option value="2" ${o.status===2?'selected':''}>已付款</option>
                        <option value="3" ${o.status===3?'selected':''}>已发货</option>
                        <option value="4" ${o.status===4?'selected':''}>已完成</option>
                        <option value="5" ${o.status===5?'selected':''}>已取消</option>
                    </select>
                    <button class="btn btn-outline btn-sm" onclick="updateOrderStatus(${o.id})">更新状态</button>
                </div>
            </div>`).join('');
    } catch (e) { $('adminOrderList').innerHTML = '<p class="empty-text">加载失败</p>'; }
}

async function updateOrderStatus(orderId) {
    const status = parseInt($('statusSelect' + orderId).value);
    try {
        await fetchAPI('/admin/orders/' + orderId + '/status', {
            method: 'PUT',
            body: JSON.stringify({ status: status })
        });
        alert('状态已更新');
        loadAdminOrders();
    } catch (e) { alert('更新失败: ' + e.message); }
}

// 购物车角标
async function loadCartBadge() {
    if (!currentUser || currentUser.is_admin) return;
    try {
        const data = await fetchAPI('/cart');
        $('cartBadge').textContent = data.data.length;
    } catch (e) { /* ignore */ }
}