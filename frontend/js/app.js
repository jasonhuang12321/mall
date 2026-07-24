// API 基础路径
const API = 'http://localhost:8080/api';

// 全局状态
let currentUser = null;
let cartItems = [];
let currentCategory = 0;

// ==================== 工具函数 ====================
function $(id) { return document.getElementById(id); }

async function fetchAPI(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (currentUser) headers['X-User-Id'] = currentUser.id;
    const res = await fetch(API + url, { ...options, headers });
    const data = await res.json();
    if (data.code !== 200) throw new Error(data.message);
    return data;
}

function formatPrice(p) { return '¥' + Number(p).toFixed(2); }

// ==================== 页面切换 ====================
function showPage(name, data) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = $('page-' + name);
    if (page) page.classList.add('active');

    if (name === 'home') loadProducts();
    else if (name === 'detail') renderProductDetail(data);
    else if (name === 'orders') loadOrders();
    else if (name === 'profile') loadProfile();
}

// ==================== 商品列表 ====================
async function loadProducts() {
    try {
        const data = await fetchAPI('/products');
        let products = data.data;
        if (currentCategory > 0) {
            products = products.filter(p => p.category_id === currentCategory);
        }
        renderProductGrid(products);
    } catch (e) {
        $('productGrid').innerHTML = '<p class="empty-text">加载失败，请确保后端已启动</p>';
    }
}

function renderProductGrid(products) {
    const grid = $('productGrid');
    if (!products.length) {
        grid.innerHTML = '<p class="empty-text">暂无商品</p>';
        return;
    }
    grid.innerHTML = products.map(p => `
        <div class="product-card" onclick="showPage('detail', ${p.id})">
            <img src="${p.image}" alt="${p.name}" onerror="this.src='https://picsum.photos/seed/fallback/400/400'">
            <div class="product-info">
                <div class="product-name">${p.name}</div>
                <div class="product-price">
                    <span class="price-current">${formatPrice(p.price)}</span>
                    ${p.original_price > p.price ? `<span class="price-original">${formatPrice(p.original_price)}</span>` : ''}
                </div>
                <div class="product-sales">已售 ${p.sales} 件</div>
            </div>
        </div>
    `).join('');
}

// ==================== 分类导航 ====================
async function loadCategories() {
    try {
        const data = await fetchAPI('/categories');
        const nav = $('categoryNav');
        nav.innerHTML = '<a href="#" class="nav-item active" data-cid="0" onclick="filterByCategory(0)">全部</a>';
        data.data.forEach(c => {
            nav.innerHTML += `<a href="#" class="nav-item" data-cid="${c.id}" onclick="filterByCategory(${c.id})">${c.name}</a>`;
        });
    } catch (e) { /* ignore */ }
}

function filterByCategory(cid) {
    currentCategory = cid;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', parseInt(item.dataset.cid) === cid);
    });
    loadProducts();
}

// ==================== 商品详情 ====================
async function renderProductDetail(productId) {
    const container = $('productDetail');
    try {
        const data = await fetchAPI('/products/' + productId);
        const p = data.data;
        container.innerHTML = `
            <div class="product-detail">
                <div class="product-gallery">
                    <img src="${p.image}" alt="${p.name}" class="product-main-img" onerror="this.src='https://picsum.photos/seed/fallback/400/400'">
                </div>
                <div class="product-info-right">
                    <h1 class="detail-name">${p.name}</h1>
                    <div class="detail-price">
                        <span class="price-current">${formatPrice(p.price)}</span>
                        ${p.original_price > p.price ? `<span class="price-original" style="margin-left:12px;font-size:16px">${formatPrice(p.original_price)}</span>` : ''}
                    </div>
                    <div class="detail-meta">
                        <span>库存: ${p.stock} 件</span>
                        <span>已售: ${p.sales} 件</span>
                        <span>分类: ${p.category_name}</span>
                    </div>
                    <p class="detail-desc">${p.description}</p>
                    <div class="detail-actions">
                        <button class="btn btn-primary btn-large" onclick="addToCart(${p.id})">加入购物车</button>
                        <button class="btn btn-outline btn-large" onclick="showPage('home')">返回首页</button>
                    </div>
                </div>
            </div>

            <!-- 评论区域 -->
            <div class="comment-section">
                <h3 class="comment-title">商品评价 (<span id="commentCount">0</span>)</h3>

                ${currentUser ? `
                <div class="comment-form">
                    <textarea id="commentContent" placeholder="写下你的评价..." rows="3"></textarea>
                    <div class="comment-form-footer">
                        <div class="rating-stars">
                            <span class="star" onclick="setRating(1)" data-r="1">★</span>
                            <span class="star" onclick="setRating(2)" data-r="2">★</span>
                            <span class="star" onclick="setRating(3)" data-r="3">★</span>
                            <span class="star active" onclick="setRating(4)" data-r="4">★</span>
                            <span class="star active" onclick="setRating(5)" data-r="5">★</span>
                        </div>
                        <button class="btn btn-primary" onclick="submitComment(${productId})">发表评价</button>
                    </div>
                </div>
                ` : '<p style="color:#999;margin-bottom:16px">请<a href="#" onclick="showModal(\'loginModal\')">登录</a>后发表评价</p>'}

                <div class="comment-list" id="commentList"></div>
            </div>`;
        // 加载评论
        loadComments(productId);
    } catch (e) {
        container.innerHTML = '<p class="empty-text">商品不存在</p>';
    }
}

let currentRating = 5;
function setRating(r) {
    currentRating = r;
    document.querySelectorAll('.rating-stars .star').forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.r) <= r);
    });
}

async function submitComment(productId) {
    const content = $('commentContent').value.trim();
    if (!content) { alert('请输入评价内容'); return; }
    try {
        await fetchAPI('/comments', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, content, rating: currentRating })
        });
        $('commentContent').value = '';
        alert('评价成功');
        loadComments(productId);
    } catch (e) { alert('评价失败: ' + e.message); }
}

async function loadComments(productId) {
    try {
        const data = await fetchAPI('/comments?product_id=' + productId);
        const comments = data.data || [];
        $('commentCount').textContent = comments.length;
        const list = $('commentList');
        if (!comments.length) {
            list.innerHTML = '<p class="empty-text">暂无评价，快来第一个评价吧</p>';
            return;
        }
        list.innerHTML = comments.map(c => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-user">${c.username}</span>
                    <span class="comment-stars">${'★'.repeat(c.rating)}${'☆'.repeat(5 - c.rating)}</span>
                    <span class="comment-time">${c.created_at ? c.created_at.split('T')[0] : ''}</span>
                </div>
                <div class="comment-body">${c.content}</div>
            </div>`).join('');
    } catch (e) { /* ignore */ }
}

// ==================== 购物车 ====================
function toggleCart() {
    if (!currentUser) { showModal('loginModal'); return; }
    const overlay = $('cartOverlay');
    const sidebar = $('cartSidebar');
    const isOpen = sidebar.classList.contains('show');
    if (isOpen) {
        overlay.classList.remove('show');
        sidebar.classList.remove('show');
    } else {
        overlay.classList.add('show');
        sidebar.classList.add('show');
        loadCart();
    }
}

async function loadCart() {
    if (!currentUser) return;
    try {
        const data = await fetchAPI('/cart');
        cartItems = data.data || [];
        renderCart();
    } catch (e) { /* ignore */ }
}

function renderCart() {
    const list = $('cartList');
    const footer = $('cartFooter');
    const badge = $('cartBadge');
    badge.textContent = cartItems.reduce((s, i) => s + i.quantity, 0);

    if (!cartItems.length) {
        list.innerHTML = '<p class="empty-text">购物车是空的</p>';
        footer.style.display = 'none';
        return;
    }
    footer.style.display = 'block';
    const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    $('cartTotal').textContent = formatPrice(total);
    list.innerHTML = cartItems.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.product_name}" onerror="this.src='https://picsum.photos/seed/fallback/400/400'">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.product_name}</div>
                <div class="cart-item-price">${formatPrice(item.price)}</div>
                <div class="cart-item-actions">
                    <button class="qty-btn" onclick="updateCartQty(${item.product_id}, ${item.quantity - 1})">-</button>
                    <span class="qty-num">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateCartQty(${item.product_id}, ${item.quantity + 1})">+</button>
                    <button class="btn-text" style="font-size:14px;margin-left:auto" onclick="removeCartItem(${item.product_id})">删除</button>
                </div>
            </div>
        </div>`).join('');
}

async function addToCart(productId) {
    if (!currentUser) { showModal('loginModal'); return; }
    try {
        await fetchAPI('/cart', { method: 'POST', body: JSON.stringify({ product_id: productId, quantity: 1 }) });
        alert('已加入购物车');
        loadCart();
    } catch (e) { alert('添加失败: ' + e.message); }
}

async function updateCartQty(productId, quantity) {
    if (quantity <= 0) { removeCartItem(productId); return; }
    await fetchAPI('/cart', { method: 'PUT', body: JSON.stringify({ product_id: productId, quantity }) });
    loadCart();
    renderProfileCart();
}

async function removeCartItem(productId) {
    await fetchAPI('/cart', { method: 'DELETE', body: JSON.stringify({ product_id: productId }) });
    loadCart();
    renderProfileCart();
}

// ==================== 用户 ====================
function showModal(id) { $(id).classList.add('show'); }
function closeModal(id) { $(id).classList.remove('show'); }

async function login() {
    const username = $('loginUsername').value.trim();
    const password = $('loginPassword').value.trim();
    if (!username || !password) { alert('请输入用户名和密码'); return; }
    try {
        const data = await fetchAPI('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        currentUser = data.data;
        updateUserUI();
        closeModal('loginModal');
        loadCart();
    } catch (e) { alert('登录失败: ' + e.message); }
}

async function register() {
    const username = $('regUsername').value.trim();
    const password = $('regPassword').value.trim();
    const nickname = $('regNickname').value.trim();
    if (!username || !password) { alert('请输入用户名和密码'); return; }
    try {
        const data = await fetchAPI('/register', { method: 'POST', body: JSON.stringify({ username, password, nickname }) });
        currentUser = data.data;
        updateUserUI();
        closeModal('registerModal');
        loadCart();
    } catch (e) { alert('注册失败: ' + e.message); }
}

function logout() {
    currentUser = null;
    cartItems = [];
    updateUserUI();
    renderCart();
}

async function changePassword() {
    const oldPwd = $('oldPassword').value.trim();
    const newPwd = $('newPassword').value.trim();
    const confirmPwd = $('confirmPassword').value.trim();
    if (!oldPwd || !newPwd) { alert('请填写密码'); return; }
    if (newPwd !== confirmPwd) { alert('两次新密码不一致'); return; }
    try {
        await fetchAPI('/user/change-password', { method: 'POST', body: JSON.stringify({ old_password: oldPwd, new_password: newPwd }) });
        alert('密码修改成功');
        $('oldPassword').value = '';
        $('newPassword').value = '';
        $('confirmPassword').value = '';
    } catch (e) { alert('修改失败: ' + e.message); }
}

function updateUserUI() {
    const area = $('userArea');
    if (currentUser) {
        area.innerHTML = `
            <span style="font-size:14px;cursor:pointer" onclick="showPage('profile')">${currentUser.nickname || currentUser.username}</span>
            <a href="#" style="font-size:13px;color:var(--primary);margin-left:8px" onclick="showPage('orders')">我的订单</a>
            <a href="#" style="font-size:13px;color:var(--primary);margin-left:8px" onclick="showPage('profile')">个人中心</a>
            <button class="btn btn-outline" onclick="logout()">退出</button>`;
    } else {
        area.innerHTML = '<button class="btn btn-outline" onclick="showModal(\'loginModal\')">登录</button>';
    }
}

// ==================== 个人中心 ====================
function loadProfile() {
    if (!currentUser) { showModal('loginModal'); return; }
    $('profileName').textContent = currentUser.nickname || currentUser.username;
    if (currentUser.is_admin) {
        $('userMenu').style.display = 'none';
        $('adminMenu').style.display = 'block';
        switchProfileTab('admin-products');
    } else {
        $('userMenu').style.display = 'block';
        $('adminMenu').style.display = 'none';
        switchProfileTab('cart');
    }
}

function switchProfileTab(tab) {
    // 更新菜单高亮
    document.querySelectorAll('.profile-menu li').forEach(li => {
        const text = li.textContent;
        let match = false;
        if (tab === 'cart') match = text.includes('购物车');
        else if (tab === 'addresses') match = text.includes('收货地址');
        else if (tab === 'orders') match = text.includes('我的订单');
        else if (tab === 'password') match = text.includes('密码');
        else if (tab === 'admin-products') match = text.includes('商品管理');
        else if (tab === 'admin-users') match = text.includes('用户管理');
        else if (tab === 'admin-orders') match = text.includes('订单管理');
        li.classList.toggle('active', match);
    });
    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
    const tabEl = $('profile-tab-' + tab);
    if (tabEl) tabEl.classList.add('active');

    if (tab === 'cart') renderProfileCart();
    else if (tab === 'addresses') loadAddresses();
    else if (tab === 'orders') loadProfileOrders();
    else if (tab === 'admin-products') loadAdminProducts();
    else if (tab === 'admin-users') loadAdminUsers();
    else if (tab === 'admin-orders') loadAdminOrders();
}

function renderProfileCart() {
    const list = $('profileCartList');
    const footer = $('profileCartFooter');
    if (!cartItems.length) {
        list.innerHTML = '<p class="empty-text">购物车是空的</p>';
        footer.style.display = 'none';
        return;
    }
    footer.style.display = 'block';
    const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    $('profileCartTotal').textContent = formatPrice(total);
    list.innerHTML = cartItems.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.product_name}" onerror="this.src='https://picsum.photos/seed/fallback/400/400'">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.product_name}</div>
                <div class="cart-item-price">${formatPrice(item.price)}</div>
                <div class="cart-item-actions">
                    <button class="qty-btn" onclick="updateCartQty(${item.product_id}, ${item.quantity - 1})">-</button>
                    <span class="qty-num">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateCartQty(${item.product_id}, ${item.quantity + 1})">+</button>
                    <button class="btn-text" style="font-size:14px;margin-left:auto" onclick="removeCartItem(${item.product_id})">删除</button>
                </div>
            </div>
        </div>`).join('');
}

// ==================== 地址管理 ====================
async function loadAddresses() {
    try {
        const data = await fetchAPI('/addresses');
        renderAddresses(data.data || []);
    } catch (e) { $('addressList').innerHTML = '<p class="empty-text">加载失败</p>'; }
}

function renderAddresses(addresses) {
    const list = $('addressList');
    if (!addresses.length) {
        list.innerHTML = '<p class="empty-text">暂无地址</p>';
        return;
    }
    list.innerHTML = addresses.map(a => `
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
                ${!a.is_default ? `<button class="btn btn-outline btn-sm" onclick="setDefaultAddress(${a.id})">设为默认</button>` : ''}
                <button class="btn btn-outline btn-sm" onclick="editAddress(${a.id})">编辑</button>
                <button class="btn btn-outline btn-sm" onclick="deleteAddress(${a.id})">删除</button>
            </div>
        </div>`).join('');
}

function showAddressForm(addrId) {
    if (addrId) {
        $('addressModalTitle').textContent = '编辑地址';
        $('editAddressId').value = addrId;
        fetchAPI('/addresses').then(data => {
            const addr = (data.data || []).find(a => a.id === addrId);
            if (addr) {
                $('addrReceiver').value = addr.receiver_name;
                $('addrPhone').value = addr.phone;
                $('addrProvince').value = addr.province;
                $('addrCity').value = addr.city;
                $('addrDistrict').value = addr.district;
                $('addrDetail').value = addr.detail;
                $('addrIsDefault').checked = addr.is_default;
            }
        }).catch(() => {});
    } else {
        $('addressModalTitle').textContent = '添加地址';
        $('editAddressId').value = '';
        $('addrReceiver').value = '';
        $('addrPhone').value = '';
        $('addrProvince').value = '';
        $('addrCity').value = '';
        $('addrDistrict').value = '';
        $('addrDetail').value = '';
        $('addrIsDefault').checked = false;
    }
    showModal('addressModal');
}

async function saveAddress() {
    const body = {
        receiver_name: $('addrReceiver').value.trim(),
        phone: $('addrPhone').value.trim(),
        province: $('addrProvince').value.trim(),
        city: $('addrCity').value.trim(),
        district: $('addrDistrict').value.trim(),
        detail: $('addrDetail').value.trim(),
        is_default: $('addrIsDefault').checked
    };
    if (!body.receiver_name || !body.phone || !body.detail) {
        alert('请填写收货人、电话和详细地址');
        return;
    }
    const addrId = $('editAddressId').value;
    try {
        if (addrId) {
            await fetchAPI('/addresses/' + addrId, { method: 'PUT', body: JSON.stringify(body) });
        } else {
            await fetchAPI('/addresses', { method: 'POST', body: JSON.stringify(body) });
        }
        closeModal('addressModal');
        loadAddresses();
    } catch (e) { alert('保存失败: ' + e.message); }
}

function editAddress(id) { showAddressForm(id); }

async function deleteAddress(id) {
    if (!confirm('确定删除此地址？')) return;
    try {
        await fetchAPI('/addresses/' + id, { method: 'DELETE' });
        loadAddresses();
    } catch (e) { alert('删除失败'); }
}

async function setDefaultAddress(id) {
    try {
        await fetchAPI('/addresses/' + id + '/default', { method: 'PUT' });
        loadAddresses();
    } catch (e) { alert('设置失败'); }
}

// ==================== 订单 ====================
async function showOrderModal() {
    if (!currentUser) { showModal('loginModal'); return; }
    toggleCart();
    showModal('orderModal');
    // 加载地址到下拉框
    try {
        const data = await fetchAPI('/addresses');
        const sel = $('orderAddressSelect');
        sel.innerHTML = '<option value="">手动填写</option>';
        (data.data || []).forEach(a => {
            sel.innerHTML += `<option value="${a.id}">${a.receiver_name} ${a.phone} ${a.province}${a.city}${a.district}${a.detail}</option>`;
        });
    } catch (e) { /* ignore */ }
}

function fillAddressForm() {
    const sel = $('orderAddressSelect');
    if (!sel.value) return;
    fetchAPI('/addresses').then(data => {
        const addr = (data.data || []).find(a => a.id === parseInt(sel.value));
        if (addr) {
            $('orderReceiver').value = addr.receiver_name;
            $('orderPhone').value = addr.phone;
            $('orderAddress').value = addr.province + addr.city + addr.district + addr.detail;
        }
    }).catch(() => {});
}

async function submitOrder() {
    const receiver = $('orderReceiver').value.trim();
    const phone = $('orderPhone').value.trim();
    const address = $('orderAddress').value.trim();
    const remark = $('orderRemark').value.trim();
    if (!receiver || !phone || !address) { alert('请填写收货信息'); return; }
    try {
        await fetchAPI('/orders', { method: 'POST', body: JSON.stringify({ receiver_name: receiver, phone, address, remark }) });
        alert('下单成功！');
        closeModal('orderModal');
        cartItems = [];
        renderCart();
        loadCart();
    } catch (e) { alert('下单失败: ' + e.message); }
}

async function loadOrders() {
    if (!currentUser) { showModal('loginModal'); return; }
    try {
        const data = await fetchAPI('/orders');
        renderOrderList(data.data || [], 'orderList');
    } catch (e) { $('orderList').innerHTML = '<p class="empty-text">加载失败</p>'; }
}

async function loadProfileOrders() {
    try {
        const data = await fetchAPI('/orders');
        renderOrderList(data.data || [], 'profileOrderList');
    } catch (e) { $('profileOrderList').innerHTML = '<p class="empty-text">加载失败</p>'; }
}

function renderOrderList(orders, containerId) {
    const container = $(containerId);
    if (!orders.length) {
        container.innerHTML = '<p class="empty-text">暂无订单</p>';
        return;
    }
    container.innerHTML = orders.map(o => `
        <div class="order-card">
            <div class="order-header">
                <span>订单号: ${o.order_no}</span>
                <span>${o.created_at.split('T')[0]}</span>
                <span class="order-status">${o.status_text}</span>
            </div>
            <div class="order-total">合计: <span>${formatPrice(o.total_amount)}</span></div>
        </div>`).join('');
}

// ==================== 初始化 ====================
window.onload = function() {
    loadCategories();
    loadProducts();
    updateUserUI();
};

window.onclick = function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
};

// ==================== 管理员 - 商品管理 ====================
async function loadAdminProducts() {
    try {
        const data = await fetchAPI('/admin/products');
        renderAdminProducts(data.data || []);
    } catch (e) { $('adminProductList').innerHTML = '<tr><td colspan="6" class="empty-text">加载失败</td></tr>'; }
}

function renderAdminProducts(products) {
    const tbody = $('adminProductList');
    if (!products.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-text">暂无商品</td></tr>';
        return;
    }
    tbody.innerHTML = products.map(p => `
        <tr>
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>${formatPrice(p.price)}</td>
            <td>${p.stock}</td>
            <td>${p.is_on_sale ? '<span class="tag-onsale">在售</span>' : '<span class="tag-off">已下架</span>'}</td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="editProduct(${p.id})">编辑</button>
                <button class="btn btn-outline btn-sm" onclick="deleteProduct(${p.id})">删除</button>
            </td>
        </tr>`).join('');
}

function showProductForm(pid) {
    if (pid) {
        $('productModalTitle').textContent = '编辑商品';
        $('editProductId').value = pid;
        fetchAPI('/admin/products').then(data => {
            const p = (data.data || []).find(x => x.id === pid);
            if (p) {
                $('prodName').value = p.name;
                $('prodDesc').value = p.description;
                $('prodPrice').value = p.price;
                $('prodOriginalPrice').value = p.original_price || '';
                $('prodStock').value = p.stock;
                $('prodImage').value = p.image;
                $('prodCategoryId').value = p.category_id;
                $('prodIsOnSale').checked = p.is_on_sale;
            }
        }).catch(() => {});
    } else {
        $('productModalTitle').textContent = '添加商品';
        $('editProductId').value = '';
        $('prodName').value = '';
        $('prodDesc').value = '';
        $('prodPrice').value = '';
        $('prodOriginalPrice').value = '';
        $('prodStock').value = '';
        $('prodImage').value = '';
        $('prodCategoryId').value = '';
        $('prodIsOnSale').checked = true;
    }
    showModal('productModal');
}

async function saveProduct() {
    const body = {
        name: $('prodName').value.trim(),
        description: $('prodDesc').value.trim(),
        price: parseFloat($('prodPrice').value) || 0,
        original_price: parseFloat($('prodOriginalPrice').value) || 0,
        stock: parseInt($('prodStock').value) || 0,
        image: $('prodImage').value.trim(),
        category_id: parseInt($('prodCategoryId').value) || 0,
        is_on_sale: $('prodIsOnSale').checked
    };
    if (!body.name) { alert('请输入商品名称'); return; }
    const pid = $('editProductId').value;
    try {
        if (pid) {
            await fetchAPI('/admin/products/' + pid, { method: 'PUT', body: JSON.stringify(body) });
        } else {
            await fetchAPI('/admin/products', { method: 'POST', body: JSON.stringify(body) });
        }
        closeModal('productModal');
        loadAdminProducts();
    } catch (e) { alert('保存失败: ' + e.message); }
}

function editProduct(id) { showProductForm(id); }

async function deleteProduct(id) {
    if (!confirm('确定删除此商品？')) return;
    try {
        await fetchAPI('/admin/products/' + id, { method: 'DELETE' });
        loadAdminProducts();
    } catch (e) { alert('删除失败'); }
}

// ==================== 管理员 - 用户管理 ====================
async function loadAdminUsers() {
    try {
        const data = await fetchAPI('/admin/users');
        renderAdminUsers(data.data || []);
    } catch (e) { $('adminUserList').innerHTML = '<tr><td colspan="7" class="empty-text">加载失败</td></tr>'; }
}

function renderAdminUsers(users) {
    const tbody = $('adminUserList');
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-text">暂无用户</td></tr>';
        return;
    }
    tbody.innerHTML = users.map(u => `
        <tr>
            <td>${u.id}</td>
            <td>${u.username}</td>
            <td>${u.nickname}</td>
            <td>${u.phone || '-'}</td>
            <td>${u.is_admin ? '<span class="tag-onsale">管理员</span>' : '<span class="tag-off">普通用户</span>'}</td>
            <td>${u.created_at ? u.created_at.split('T')[0] : '-'}</td>
            <td>
                ${!u.is_admin ? `<button class="btn btn-outline btn-sm" onclick="deleteUser(${u.id})">删除</button>` : '<span style="font-size:12px;color:#999">-</span>'}
            </td>
        </tr>`).join('');
}

async function deleteUser(id) {
    if (!confirm('确定删除此用户？')) return;
    try {
        await fetchAPI('/admin/users/' + id, { method: 'DELETE' });
        loadAdminUsers();
    } catch (e) { alert('删除失败'); }
}

// ==================== 管理员 - 订单管理 ====================
async function loadAdminOrders() {
    try {
        const data = await fetchAPI('/admin/orders');
        renderAdminOrders(data.data || []);
    } catch (e) { $('adminOrderList').innerHTML = '<tr><td colspan="8" class="empty-text">加载失败</td></tr>'; }
}

function renderAdminOrders(orders) {
    const tbody = $('adminOrderList');
    if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-text">暂无订单</td></tr>';
        return;
    }
    tbody.innerHTML = orders.map(o => `
        <tr>
            <td>${o.id}</td>
            <td>${o.order_no}</td>
            <td>${o.username}</td>
            <td>${formatPrice(o.total_amount)}</td>
            <td>${o.status_text}</td>
            <td>${o.receiver_name}</td>
            <td>${o.created_at ? o.created_at.split('T')[0] : '-'}</td>
            <td>
                <select onchange="updateOrderStatus(${o.id}, this.value)" style="padding:2px 4px;font-size:12px">
                    <option value="1" ${o.status === 1 ? 'selected' : ''}>待付款</option>
                    <option value="2" ${o.status === 2 ? 'selected' : ''}>已付款</option>
                    <option value="3" ${o.status === 3 ? 'selected' : ''}>已发货</option>
                    <option value="4" ${o.status === 4 ? 'selected' : ''}>已完成</option>
                    <option value="5" ${o.status === 5 ? 'selected' : ''}>已取消</option>
                </select>
            </td>
        </tr>`).join('');
}

async function updateOrderStatus(orderId, status) {
    try {
        await fetchAPI('/admin/orders/' + orderId + '/status', {
            method: 'PUT',
            body: JSON.stringify({ status: parseInt(status) })
        });
    } catch (e) { alert('更新失败'); }
}