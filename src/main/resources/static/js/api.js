// API 基础配置
const API_BASE = 'http://localhost:8081/api';

// 通用请求方法
async function request(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }

    const response = await fetch(API_BASE + url, {
        ...options,
        headers
    });

    const data = await response.json();

    if (data.code !== 200) {
        throw new Error(data.message || '请求失败');
    }

    return data.data;
}

// HTTP 方法封装
const api = {
    get: (url) => request(url),
    post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
    put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (url) => request(url, { method: 'DELETE' })
};

// Toast 提示
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

// 价格格式化
function formatPrice(price) {
    return '¥' + Number(price).toFixed(2);
}

// 获取当前用户
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// 检查登录状态
function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

// 退出登录
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// 渲染导航栏
function renderNavbar(activePage) {
    const user = getCurrentUser();
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    let navLinks = '';
    if (user && user.role === 'ADMIN') {
        navLinks = `
            <a href="index.html" class="${activePage === 'home' ? 'active' : ''}">商品管理</a>
            <a href="admin/orders.html" class="${activePage === 'orders' ? 'active' : ''}">订单管理</a>
        `;
    } else {
        navLinks = `
            <a href="index.html" class="${activePage === 'home' ? 'active' : ''}">首页</a>
            <a href="orders.html" class="${activePage === 'orders' ? 'active' : ''}">我的订单</a>
        `;
    }

    let userArea = '';
    if (user) {
        userArea = `
            <a href="cart.html" class="cart-icon">🛒 <span class="cart-badge" id="cartBadge" style="display:none">0</span></a>
            <span>${user.nickname || user.username}</span>
            <a href="#" class="btn-logout" onclick="logout(); return false;">退出</a>
        `;
    } else {
        userArea = `
            <a href="login.html">登录</a>
            <a href="register.html">注册</a>
        `;
    }

    navbar.innerHTML = `
        <a href="index.html" class="logo">Shop</a>
        <div class="nav-links">${navLinks}</div>
        <div class="user-area">${userArea}</div>
    `;

    // 加载购物车数量
    if (user) {
        loadCartCount();
    }
}

// 加载购物车数量
async function loadCartCount() {
    try {
        const items = await api.get('/cart');
        const badge = document.getElementById('cartBadge');
        if (badge) {
            const count = items.length;
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    } catch (e) {
        // 忽略
    }
}

// 页面加载时渲染导航栏
document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.getAttribute('data-page');
    renderNavbar(page);
});