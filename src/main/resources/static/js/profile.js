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
    $('profileName').textContent = currentUser.username;
    // 设置头像
    var avatarImg = $('sidebarAvatar');
    if (currentUser.avatar) {
        avatarImg.src = currentUser.avatar;
        avatarImg.style.display = '';
        avatarImg.parentElement.querySelector('.avatar-placeholder').style.display = 'none';
    }
    renderMenu();
    switchTab(currentTab);
    if (!currentUser.is_admin) loadCartBadge();
    // 初始化省市区选择器
    if (typeof initRegionPicker === 'function') {
        initRegionPicker('addrProvinceSelect', 'addrCitySelect', 'addrDistrictSelect');
    }
}

// 省市区同步
function syncProvinceSelect() {
    document.getElementById('addrProvince').value = document.getElementById('addrProvinceSelect').value;
}
function syncCitySelect() {
    document.getElementById('addrCity').value = document.getElementById('addrCitySelect').value;
}
function syncDistrictSelect() {
    document.getElementById('addrDistrict').value = document.getElementById('addrDistrictSelect').value;
}

// 渲染菜单
function renderMenu() {
    const menu = $('profileMenu');
    if (currentUser.is_admin) {
        menu.innerHTML = `
            <li class="active" data-tab="products">商品管理</li>
            <li data-tab="users">用户管理</li>
            <li data-tab="adminOrders">订单管理</li>
            <li data-tab="adminFavorites">收藏管理</li>`;
        currentTab = 'products';
    } else {
        menu.innerHTML = `
            <li class="active" data-tab="cart">我的购物车</li>
            <li data-tab="addresses">收货地址</li>
            <li data-tab="orders">我的订单</li>
            <li data-tab="favorites">我的收藏</li>
            <li data-tab="avatar">修改头像</li>
            <li data-tab="username">修改用户名</li>
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
        case 'username': renderUsernameTab(content); break;
        case 'favorites': renderFavoritesTab(content); break;
        case 'avatar': renderAvatarTab(content); break;
        case 'products': renderAdminProductsTab(content); break;
        case 'users': renderAdminUsersTab(content); break;
        case 'adminOrders': renderAdminOrdersTab(content); break;
        case 'adminFavorites': renderAdminFavoritesTab(content); break;
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
            const p = item.product || {};
            const price = p.price || item.price || item.productPrice || 0;
            const name = p.name || item.productName || '商品';
            const image = p.image || p.imageUrl || item.image || '';
            const subtotal = price * item.quantity;
            total += subtotal;
            const pid = p.id || item.productId || item.product_id;
            return `
                <div class="cart-item" id="cartItem${item.id}">
                    <img src="${image}" alt="${escHtml(name)}" onerror="this.src='https://picsum.photos/seed/fallback/400/400'">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${escHtml(name)}</div>
                        <div class="cart-item-price">${formatPrice(price)}</div>
                        <div class="cart-item-actions">
                            <button class="qty-btn" onclick="updateCartQty(${item.id}, ${item.quantity - 1})">-</button>
                            <span class="qty-num">${item.quantity}</span>
                            <button class="qty-btn" onclick="updateCartQty(${item.id}, ${item.quantity + 1})">+</button>
                            <button class="btn btn-outline btn-sm" style="margin-left:12px" onclick="removeCartItem(${item.id})">删除</button>
                        </div>
                    </div>
                </div>`;
        }).join('');
        $('cartTotal').textContent = formatPrice(total);
        $('cartFooter').style.display = 'block';
        $('cartBadge').textContent = items.length;
    } catch (e) { $('cartList').innerHTML = '<p class="empty-text">加载失败</p>'; }
}

async function updateCartQty(itemId, qty) {
    if (qty <= 0) {
        if (!confirm('确定要删除该商品吗？')) return;
        await removeCartItem(itemId);
        return;
    }
    try {
        await fetchAPI('/cart/' + itemId, { method: 'PUT', body: JSON.stringify({ quantity: qty }) });
        loadCart();
    } catch (e) { alert('更新失败: ' + e.message); }
}

async function removeCartItem(itemId) {
    try {
        await fetchAPI('/cart/' + itemId, { method: 'DELETE' });
        loadCart();
    } catch (e) { alert('删除失败: ' + e.message); }
}

async function createOrder() {
    if (!currentUser) return;
    try {
        const addrData = await fetchAPI('/addresses');
        const addresses = addrData.data;
        if (!addresses.length) {
            alert('请先添加收货地址');
            switchTab('addresses');
            return;
        }
        const defaultAddr = addresses.find(a => a.isDefault || a.default || a.is_default) || addresses[0];
        const name = defaultAddr.receiverName || defaultAddr.receiver_name || '';
        const phone = defaultAddr.phone || '';
        const province = defaultAddr.province || '';
        const city = defaultAddr.city || '';
        const district = defaultAddr.district || '';
        const detail = defaultAddr.detail || '';
        const addrText = province + city + district + detail;
        if (!confirm(`确认使用地址 "${name} ${phone} ${addrText}" 下单吗？`)) return;

        await fetchAPI('/orders', {
            method: 'POST',
            body: JSON.stringify({
                receiver_name: name,
                phone: phone,
                address: addrText
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
        $('addressList').innerHTML = addresses.map(a => {
            const isDefault = a.isDefault || a.default || a.is_default;
            const name = a.receiverName || a.receiver_name || '';
            const phone = a.phone || '';
            const province = a.province || '';
            const city = a.city || '';
            const district = a.district || '';
            const detail = a.detail || '';
            return `
            <div class="address-card ${isDefault ? 'default' : ''}">
                <div class="address-info">
                    <div class="address-name">
                        ${escHtml(name)}
                        <span class="address-phone">${escHtml(phone)}</span>
                        ${isDefault ? '<span class="address-tag">默认</span>' : ''}
                    </div>
                    <div class="address-detail">${escHtml(province)} ${escHtml(city)} ${escHtml(district)} ${escHtml(detail)}</div>
                </div>
                <div class="address-actions">
                    ${!isDefault ? `<button class="btn btn-outline btn-sm" onclick="setDefaultAddr(${a.id})">设为默认</button>` : ''}
                    <button class="btn btn-outline btn-sm" onclick="editAddress(${a.id}, '${escHtml(name)}', '${escHtml(phone)}', '${escHtml(province)}', '${escHtml(city)}', '${escHtml(district)}', '${escHtml(detail)}', ${isDefault})">编辑</button>
                    <button class="btn btn-outline btn-sm" onclick="deleteAddress(${a.id})">删除</button>
                </div>
            </div>`;
        }).join('');
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
        // 重置省市区下拉
        var ps = $('addrProvinceSelect');
        var cs = $('addrCitySelect');
        var ds = $('addrDistrictSelect');
        if (ps) ps.value = '';
        if (cs) cs.innerHTML = '<option value="">选择城市</option>';
        if (ds) ds.innerHTML = '<option value="">选择区/县</option>';
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
    var ps = $('addrProvinceSelect');
    if (ps && province) ps.value = province;
    showModal('addressModal');
}

async function saveAddress() {
    const id = $('addrId').value;
    const body = {
        receiverName: $('addrName').value.trim(),
        phone: $('addrPhone').value.trim(),
        province: $('addrProvince').value.trim(),
        city: $('addrCity').value.trim(),
        district: $('addrDistrict').value.trim(),
        detail: $('addrDetail').value.trim(),
        isDefault: $('addrIsDefault').checked
    };
    if (!body.receiverName || !body.phone || !body.province || !body.city || !body.district || !body.detail) {
        alert('请填写完整的地址信息');
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
    } catch (e) { alert('删除失败: ' + e.message); }
}

async function setDefaultAddr(id) {
    try {
        await fetchAPI('/addresses/' + id + '/default', { method: 'PUT' });
        loadAddresses();
    } catch (e) { alert('设置失败: ' + e.message); }
}

// ==================== 我的订单 Tab ====================
function renderOrdersTab(container) {
    container.innerHTML = '<h3>我的订单</h3><div id="orderList"></div>';
    loadOrders();
}

function getStatusText(o) {
    const s = o.status;
    if (typeof s === 'number') {
        return ['', '待付款', '已付款', '已发货', '已完成', '已取消'][s] || '未知';
    }
    const map = { PENDING: '待付款', PAID: '已付款', SHIPPED: '已发货', COMPLETED: '已完成', CANCELLED: '已取消' };
    return map[s] || o.statusText || o.status_text || '未知';
}

function getStatusValue(o) {
    if (typeof o.status === 'number') return o.status;
    const map = { PENDING: 1, PAID: 2, SHIPPED: 3, COMPLETED: 4, CANCELLED: 5 };
    return map[o.status] || 1;
}

async function loadOrders() {
    try {
        const data = await fetchAPI('/orders');
        const orders = data.data;
        if (!orders.length) {
            $('orderList').innerHTML = '<p class="empty-text">暂无订单</p>';
            return;
        }
        $('orderList').innerHTML = orders.map(o => {
            const statusText = getStatusText(o);
            const statusVal = getStatusValue(o);
            const orderNo = o.orderNo || o.order_no || o.id;
            const timeStr = o.createdAt || o.created_at;
            const total = o.totalAmount || o.total_amount || 0;
            return `
            <div class="order-card">
                <div class="order-header">
                    <span>订单号: ${orderNo}</span>
                    <span>${new Date(timeStr).toLocaleString('zh-CN')}</span>
                    <span class="order-status">${statusText}</span>
                </div>
                ${o.items ? `<div class="order-items">${o.items.map(i => `<div class="order-item"><span>${escHtml(i.productName || '')} x${i.quantity}</span><span>${formatPrice(i.productPrice || 0)}</span></div>`).join('')}</div>` : ''}
                <div class="order-total">合计: <span>${formatPrice(total)}</span></div>
                <div style="text-align:right;margin-top:8px">
                    ${statusVal === 1 ? `<button class="btn btn-primary btn-sm" onclick="payOrder(${o.id})">支付</button>
                    <button class="btn btn-outline btn-sm" onclick="cancelOrder(${o.id})">取消订单</button>` : ''}
                </div>
            </div>`;
        }).join('');
    } catch (e) { $('orderList').innerHTML = '<p class="empty-text">加载失败</p>'; }
}

async function cancelOrder(orderId) {
    if (!confirm('确定取消该订单吗？')) return;
    try {
        await fetchAPI('/orders/' + orderId + '/cancel', { method: 'PUT' });
        loadOrders();
    } catch (e) { alert('取消失败: ' + e.message); }
}

async function payOrder(orderId) {
    if (!confirm('确认支付该订单吗？（模拟支付）')) return;
    try {
        const data = await fetchAPI('/orders/' + orderId + '/pay', { method: 'PUT' });
        alert(data.message || '支付成功');
        loadOrders();
    } catch (e) { alert('支付失败: ' + e.message); }
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

// ==================== 修改用户名 Tab ====================
function renderUsernameTab(container) {
    container.innerHTML = `
        <h3>修改用户名</h3>
        <div style="max-width:400px">
            <div class="form-group"><label>当前用户名</label><input type="text" id="currentUsername" value="${currentUser.username}" disabled style="background:#f5f5f5"></div>
            <div class="form-group"><label>新用户名</label><input type="text" id="newUsername" placeholder="请输入新用户名"></div>
            <button class="btn btn-primary btn-block" onclick="updateUsername()">保存修改</button>
        </div>`;
}

async function updateUsername() {
    const newUsername = $('newUsername').value.trim();
    if (!newUsername) { alert('请输入新用户名'); return; }
    if (newUsername === currentUser.username) { alert('新用户名与当前用户名相同'); return; }
    try {
        const data = await fetchAPI('/user/update-username', {
            method: 'POST',
            body: JSON.stringify({ username: newUsername })
        });
        currentUser.username = data.data.username;
        localStorage.setItem('mall_user', JSON.stringify(currentUser));
        $('profileName').textContent = currentUser.username;
        $('currentUsername').value = currentUser.username;
        $('newUsername').value = '';
        updateUserUI();
        alert('用户名修改成功');
    } catch (e) { alert('修改失败: ' + e.message); }
}

// ==================== 我的收藏 Tab ====================
function renderFavoritesTab(container) {
    container.innerHTML = '<h3>我的收藏</h3><div id="favoritesList"></div>';
    loadFavorites();
}

async function loadFavorites() {
    try {
        const data = await fetchAPI('/favorites');
        const items = data.data;
        if (!items.length) {
            $('favoritesList').innerHTML = '<p class="empty-text">暂无收藏，<a href="index.html">去逛逛</a></p>';
            return;
        }
        $('favoritesList').innerHTML = items.map(f => {
            const p = f.product || {};
            const pid = p.id || f.productId || f.product_id;
            const name = p.name || f.productName || '商品';
            const price = p.price || 0;
            const stock = p.stock || 0;
            const image = p.image || p.imageUrl || f.image || '';
            return `
            <div class="fav-item">
                <img src="${image}" alt="${escHtml(name)}" onerror="this.src='https://picsum.photos/seed/fallback/400/400'" style="width:80px;height:80px;object-fit:cover;border-radius:6px">
                <div class="fav-item-info">
                    <a href="product-detail.html?id=${pid}" style="font-size:15px;font-weight:500;color:var(--text);text-decoration:none">${escHtml(name)}</a>
                    <span style="color:var(--primary);font-weight:600;font-size:16px">${formatPrice(price)}</span>
                    <span style="font-size:12px;color:var(--text-light)">${stock > 0 ? '有货' : '缺货'}</span>
                </div>
                <button class="btn btn-outline btn-sm" onclick="removeFavorite(${pid})">取消收藏</button>
            </div>`;
        }).join('');
    } catch (e) { $('favoritesList').innerHTML = '<p class="empty-text">加载失败</p>'; }
}

async function removeFavorite(productId) {
    try {
        await fetchAPI('/favorites?product_id=' + productId, { method: 'DELETE' });
        loadFavorites();
    } catch (e) { alert('操作失败: ' + e.message); }
}

// ==================== 修改头像 Tab ====================
function renderAvatarTab(container) {
    container.innerHTML = `
        <h3>修改头像</h3>
        <div style="text-align:center;max-width:300px;margin:0 auto">
            <div class="avatar-preview" style="width:120px;height:120px;border-radius:50%;overflow:hidden;margin:0 auto 16px;background:#e8e8e8;display:flex;align-items:center;justify-content:center;position:relative">
                <img id="avatarPreview" src="${currentUser.avatar || ''}" style="width:100%;height:100%;object-fit:cover;${currentUser.avatar ? '' : 'display:none'}">
                <span id="avatarPlaceholder" style="font-size:48px;${currentUser.avatar ? 'display:none' : ''}">&#128100;</span>
            </div>
            <input type="file" id="avatarFileInput" accept="image/*" style="margin-bottom:16px">
            <button class="btn btn-primary btn-block" onclick="submitAvatar()">上传头像</button>
        </div>`;
}

async function submitAvatar() {
    var input = $('avatarFileInput');
    var file = input.files[0];
    if (!file) { alert('请选择图片'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('头像图片不能超过5MB'); return; }
    var formData = new FormData();
    formData.append('avatar', file);
    try {
        var resp = await fetch(API + '/user/avatar', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + currentUser.token },
            body: formData
        });
        var data = await resp.json();
        if (data.code !== 200) throw new Error(data.message);
        currentUser.avatar = data.data.avatar;
        localStorage.setItem('mall_user', JSON.stringify(currentUser));
        $('avatarPreview').src = currentUser.avatar;
        $('avatarPreview').style.display = '';
        $('avatarPlaceholder').style.display = 'none';
        var sidebarImg = $('sidebarAvatar');
        sidebarImg.src = currentUser.avatar;
        sidebarImg.style.display = '';
        sidebarImg.parentElement.querySelector('.avatar-placeholder').style.display = 'none';
        updateUserUI();
        alert('头像更新成功');
    } catch (e) { alert('上传失败: ' + e.message); }
}

// 侧边栏头像上传
async function uploadAvatar() {
    var input = $('avatarInput');
    var file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        alert('头像图片不能超过5MB');
        input.value = '';
        return;
    }
    var formData = new FormData();
    formData.append('avatar', file);
    try {
        var resp = await fetch(API + '/user/avatar', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + currentUser.token },
            body: formData
        });
        var data = await resp.json();
        if (data.code !== 200) throw new Error(data.message);
        currentUser.avatar = data.data.avatar;
        localStorage.setItem('mall_user', JSON.stringify(currentUser));
        var avatarImg = $('sidebarAvatar');
        avatarImg.src = currentUser.avatar;
        avatarImg.style.display = '';
        avatarImg.parentElement.querySelector('.avatar-placeholder').style.display = 'none';
        updateUserUI();
    } catch (e) {
        alert('头像上传失败: ' + e.message);
    }
    input.value = '';
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
                    <tr><th>ID</th><th>名称</th><th>价格</th><th>库存</th><th>分类</th><th>收藏</th><th>状态</th><th>操作</th></tr>
                </thead>
                <tbody id="adminProductTable"></tbody>
            </table>
        </div>`;
    loadAdminProducts();
}

async function loadAdminProducts() {
    try {
        // 使用 ProductController 的 /api/products/admin/all 接口
        const data = await fetchAPI('/products/admin/all');
        const products = data.data;
        if (!products.length) {
            $('adminProductTable').innerHTML = '<tr><td colspan="8" class="empty-text">暂无商品</td></tr>';
            return;
        }
        $('adminProductTable').innerHTML = products.map(p => {
            const isOnSale = p.isOnSale !== undefined ? p.isOnSale : (p.status === 'ON');
            const categoryName = (p.category && p.category.name) || p.categoryName || '-';
            const origPrice = p.originalPrice || 0;
            const img = p.image || p.imageUrl || '';
            return `
            <tr>
                <td>${p.id}</td>
                <td>${escHtml(p.name)}</td>
                <td>${formatPrice(p.price)}</td>
                <td>${p.stock}</td>
                <td>${escHtml(categoryName)}</td>
                <td>${p.favoriteCount || 0}</td>
                <td><span class="${isOnSale ? 'tag-onsale' : 'tag-off'}">${isOnSale ? '上架' : '下架'}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="editProduct(${p.id}, '${escHtml(p.name)}', '${escHtml(p.description || '')}', ${p.price}, ${origPrice}, ${p.stock}, '${escHtml(img)}', ${p.category ? p.category.id : 0}, ${isOnSale})">编辑</button>
                    <button class="btn btn-outline btn-sm" onclick="deleteProduct(${p.id})">删除</button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) { $('adminProductTable').innerHTML = '<tr><td colspan="8" class="empty-text">加载失败</td></tr>'; }
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
    $('editProductImagePreview').style.display = 'none';
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

function previewProductImage() {
    var file = $('editProductImageFile').files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        var preview = $('editProductImagePreview');
        preview.src = e.target.result;
        preview.style.display = 'block';
        $('editProductImage').value = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function saveProduct() {
    const id = $('editProductId').value;
    const body = {
        name: $('editProductName').value.trim(),
        description: $('editProductDesc').value.trim(),
        price: parseFloat($('editProductPrice').value) || 0,
        originalPrice: parseFloat($('editProductOrigPrice').value) || 0,
        stock: parseInt($('editProductStock').value) || 0,
        imageUrl: $('editProductImage').value.trim(),
        isOnSale: $('editProductIsOnSale').checked,
        category: { id: parseInt($('editProductCategoryId').value) || 0 }
    };
    if (!body.name) { alert('请输入商品名称'); return; }
    try {
        if (id) {
            await fetchAPI('/products/' + id, { method: 'PUT', body: JSON.stringify(body) });
        } else {
            await fetchAPI('/products', { method: 'POST', body: JSON.stringify(body) });
        }
        closeModal('productModal');
        loadAdminProducts();
    } catch (e) { alert('保存失败: ' + e.message); }
}

async function deleteProduct(id) {
    if (!confirm('确定删除该商品吗？')) return;
    try {
        await fetchAPI('/products/' + id, { method: 'DELETE' });
        loadAdminProducts();
    } catch (e) { alert('删除失败: ' + e.message); }
}

// ==================== 管理员 - 用户管理 ====================
function renderAdminUsersTab(container) {
    container.innerHTML = `
        <h3>用户管理</h3>
        <div style="overflow-x:auto">
            <table class="admin-table">
                <thead>
                    <tr><th>ID</th><th>用户名</th><th>手机</th><th>角色</th><th>注册时间</th><th>操作</th></tr>
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
            $('adminUserTable').innerHTML = '<tr><td colspan="6" class="empty-text">暂无用户</td></tr>';
            return;
        }
        $('adminUserTable').innerHTML = users.map(u => {
            const timeStr = u.createdAt || u.created_at;
            const isAdmin = u.isAdmin !== undefined ? u.isAdmin : (u.role === 'ADMIN');
            return `
            <tr>
                <td>${u.id}</td>
                <td>${escHtml(u.username)}</td>
                <td>${u.phone || '-'}</td>
                <td>${isAdmin ? '管理员' : '普通用户'}</td>
                <td>${timeStr ? new Date(timeStr).toLocaleDateString('zh-CN') : '-'}</td>
                <td>
                    ${!isAdmin ? `<button class="btn btn-outline btn-sm" onclick="deleteUser(${u.id})">删除</button>` : '-'}
                </td>
            </tr>`;
        }).join('');
    } catch (e) { $('adminUserTable').innerHTML = '<tr><td colspan="6" class="empty-text">加载失败</td></tr>'; }
}

async function deleteUser(id) {
    if (!confirm('确定删除该用户吗？')) return;
    try {
        await fetchAPI('/admin/users/' + id, { method: 'DELETE' });
        loadAdminUsers();
    } catch (e) { alert('删除失败: ' + e.message); }
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
        $('adminOrderList').innerHTML = orders.map(o => {
            const statusText = getStatusText(o);
            const statusVal = getStatusValue(o);
            const statusStr = o.status_str || o.status || 'PENDING';
            const username = (o.user && o.user.username) || o.username || '-';
            const name = o.receiverName || o.receiver_name || '';
            const phone = o.phone || '';
            const address = o.address || o.addressDetail || '';
            const orderNo = o.orderNo || o.order_no || o.id;
            const timeStr = o.createdAt || o.created_at;
            const total = o.totalAmount || o.total_amount || 0;
            return `
            <div class="order-card">
                <div class="order-header">
                    <span>订单号: ${orderNo}</span>
                    <span>用户: ${escHtml(username)}</span>
                    <span>${new Date(timeStr).toLocaleString('zh-CN')}</span>
                    <span class="order-status">${statusText}</span>
                </div>
                <div style="font-size:13px;color:var(--text-light);margin-top:4px">
                    收货人: ${escHtml(name)} ${escHtml(phone)} | ${escHtml(address)}
                </div>
                ${o.items ? `<div class="order-items">${o.items.map(i => `<div class="order-item"><span>${escHtml(i.productName || '')} x${i.quantity}</span><span>${formatPrice(i.productPrice || 0)}</span></div>`).join('')}</div>` : ''}
                <div class="order-total">合计: <span>${formatPrice(total)}</span></div>
                <div style="text-align:right;margin-top:8px">
                    <select id="statusSelect${o.id}" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border)">
                        <option value="PENDING" ${statusStr==='PENDING'?'selected':''}>待付款</option>
                        <option value="PAID" ${statusStr==='PAID'?'selected':''}>已付款</option>
                        <option value="SHIPPED" ${statusStr==='SHIPPED'?'selected':''}>已发货</option>
                        <option value="COMPLETED" ${statusStr==='COMPLETED'?'selected':''}>已完成</option>
                        <option value="CANCELLED" ${statusStr==='CANCELLED'?'selected':''}>已取消</option>
                    </select>
                    <button class="btn btn-outline btn-sm" onclick="updateOrderStatus(${o.id})">更新状态</button>
                </div>
            </div>`;
        }).join('');
    } catch (e) { $('adminOrderList').innerHTML = '<p class="empty-text">加载失败</p>'; }
}

async function updateOrderStatus(orderId) {
    const status = $('statusSelect' + orderId).value;
    try {
        await fetchAPI('/admin/orders/' + orderId + '/status', {
            method: 'PUT',
            body: JSON.stringify({ status: status })
        });
        alert('状态已更新');
        loadAdminOrders();
    } catch (e) { alert('更新失败: ' + e.message); }
}

// ==================== 管理员 - 收藏管理 ====================
function renderAdminFavoritesTab(container) {
    container.innerHTML = '<h3>收藏管理</h3><div id="adminFavoritesList"></div>';
    loadAdminFavorites();
}

async function loadAdminFavorites() {
    try {
        const data = await fetchAPI('/admin/favorites');
        const favs = data.data;
        if (!favs.length) {
            $('adminFavoritesList').innerHTML = '<p class="empty-text">暂无收藏记录</p>';
            return;
        }
        $('adminFavoritesList').innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr><th>ID</th><th>用户</th><th>商品</th><th>收藏时间</th></tr>
                </thead>
                <tbody>
                    ${favs.map(f => {
                        const username = f.username || (f.user ? f.user.username : '-');
                        const productName = f.productName || (f.product ? f.product.name : '-');
                        const timeStr = f.createdAt || f.created_at;
                        return `
                        <tr>
                            <td>${f.id}</td>
                            <td>${escHtml(username)}</td>
                            <td>${escHtml(productName)}</td>
                            <td>${timeStr ? new Date(timeStr).toLocaleString('zh-CN') : '-'}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>`;
    } catch (e) { $('adminFavoritesList').innerHTML = '<p class="empty-text">加载失败</p>'; }
}

// 购物车角标
async function loadCartBadge() {
    if (!currentUser || currentUser.is_admin) return;
    try {
        const data = await fetchAPI('/cart');
        $('cartBadge').textContent = data.data.length;
    } catch (e) { /* ignore */ }
}