// 公共工具函数和全局状态
const API = '/api';
let currentUser = JSON.parse(localStorage.getItem('mall_user') || 'null');
let smsToken = null;

function $(id) { return document.getElementById(id); }

async function fetchAPI(url, options = {}) {
    const headers = { ...options.headers };
    const method = (options.method || 'GET').toUpperCase();
    // 只对带有 body 的请求（POST/PUT/PATCH）设置 Content-Type
    if (['POST', 'PUT', 'PATCH'].includes(method) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    if (currentUser && currentUser.token) headers['Authorization'] = 'Bearer ' + currentUser.token;
    const res = await fetch(API + url, { ...options, headers });
    const data = await res.json();
    if (data.code !== 200) throw new Error(data.message || '请求失败');
    return data;
}

function formatPrice(p) { return '¥' + Number(p).toFixed(2); }

function escHtml(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showModal(id) {
    $(id).classList.add('show');
    if (id === 'loginModal') loadCaptcha('login');
}
function closeModal(id) { $(id).classList.remove('show'); }

// 验证码
async function loadCaptcha(prefix) {
    try {
        const resp = await fetch(API + '/captcha');
        const data = await resp.json();
        if (data.code === 200) {
            $(prefix + 'CaptchaQuestion').textContent = data.question;
            $(prefix + 'CaptchaToken').value = data.token;
            $(prefix + 'CaptchaAnswer').value = '';
        }
    } catch (e) { /* ignore */ }
}

// 登录/注册
async function login() {
    const username = $('loginUsername').value.trim();
    const password = $('loginPassword').value.trim();
    const captchaAnswer = $('loginCaptchaAnswer').value.trim();
    const captchaToken = $('loginCaptchaToken').value;
    if (!username || !password) { alert('请输入用户名和密码'); return; }
    if (!captchaAnswer) { alert('请输入验证码答案'); return; }
    try {
        const resp = await fetch(API + '/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, captcha_token: captchaToken, captcha_answer: captchaAnswer })
        });
        const data = await resp.json();
        if (data.code !== 200) throw new Error(data.message);
        currentUser = data.data;
        localStorage.setItem('mall_user', JSON.stringify(currentUser));
        updateUserUI();
        loadCartBadge();
        closeModal('loginModal');
    } catch (e) { alert('登录失败: ' + e.message); loadCaptcha('login'); }
}

async function register() {
    const username = $('regUsername').value.trim();
    const password = $('regPassword').value.trim();
    const phone = $('regPhone').value.trim();
    const smsCode = $('regSMSCode').value.trim();
    const isAdmin = $('regIsAdmin').checked;
    if (!username || !password) { alert('请输入用户名和密码'); return; }
    if (!phone) { alert('请输入手机号'); return; }
    if (!smsCode) { alert('请输入短信验证码'); return; }
    try {
        const resp = await fetch(API + '/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, phone, sms_code: smsCode, sms_token: smsToken, is_admin: isAdmin })
        });
        const data = await resp.json();
        if (data.code !== 200) throw new Error(data.message);
        currentUser = data.data;
        localStorage.setItem('mall_user', JSON.stringify(currentUser));
        updateUserUI();
        loadCartBadge();
        closeModal('registerModal');
        window.location.reload();
    } catch (e) { alert('注册失败: ' + e.message); }
}

// 发送短信验证码
async function sendSMS() {
    const phone = $('regPhone').value.trim();
    if (!phone || phone.length !== 11 || phone[0] !== '1') {
        alert('请输入正确的手机号');
        return;
    }
    const btn = $('sendSMSBtn');
    btn.disabled = true;
    btn.textContent = '发送中...';
    try {
        const resp = await fetch(API + '/sms/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        const data = await resp.json();
        if (data.code !== 200) throw new Error(data.message || '发送失败');
        // 后端返回 Result<Map>，data.data 包含 token 和 debug_code
        smsToken = data.data.token;
        const debugEl = $('smsDebugCode');
        if (data.data.debug_code) {
            debugEl.style.display = 'block';
            debugEl.textContent = '验证码：' + data.data.debug_code + '（5分钟内有效）';
        }
        let countdown = 60;
        btn.textContent = countdown + 's';
        const timer = setInterval(() => {
            countdown--;
            if (countdown <= 0) {
                clearInterval(timer);
                btn.disabled = false;
                btn.textContent = '发送验证码';
            } else {
                btn.textContent = countdown + 's';
            }
        }, 1000);
    } catch (e) {
        alert('发送失败: ' + e.message);
        btn.disabled = false;
        btn.textContent = '发送验证码';
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('mall_user');
    updateUserUI();
    if (window.location.pathname.includes('profile') || window.location.pathname.includes('orders')) {
        window.location.href = 'index.html';
    }
}

function updateUserUI() {
    const area = $('userArea');
    if (!area) return;
    const cartLink = $('cartLink');
    if (currentUser) {
        if (currentUser.is_admin) {
            if (cartLink) cartLink.style.display = 'none';
            area.innerHTML = `
                <span class="role-tag role-admin">管理员</span>
                <span style="font-size:14px">${currentUser.username}</span>
                <a href="profile.html" style="font-size:13px;color:var(--primary);margin-left:8px">后台管理</a>
                <button class="btn btn-outline" onclick="logout()">退出</button>`;
        } else {
            if (cartLink) cartLink.style.display = '';
            area.innerHTML = `
                <span class="role-tag role-user">用户</span>
                ${currentUser.avatar ? `<img src="${currentUser.avatar}" class="header-avatar" onerror="this.style.display='none'">` : ''}
                <span style="font-size:14px">${currentUser.username}</span>
                <a href="profile.html" style="font-size:13px;color:var(--primary);margin-left:8px">个人中心</a>
                <a href="orders.html" style="font-size:13px;color:var(--primary);margin-left:8px">我的订单</a>
                <button class="btn btn-outline" onclick="logout()">退出</button>`;
        }
    } else {
        if (cartLink) cartLink.style.display = '';
        area.innerHTML = '<button class="btn btn-outline" onclick="showModal(\'loginModal\')">登录</button>';
    }
}

function goCart() {
    if (!currentUser) { showModal('loginModal'); return; }
    if (currentUser.is_admin) { window.location.href = 'profile.html'; return; }
    window.location.href = 'profile.html';
}

async function loadCartBadge() {
    if (!currentUser || currentUser.is_admin) return;
    try {
        const data = await fetchAPI('/cart');
        const badge = $('cartBadge');
        if (badge) badge.textContent = data.data.length;
    } catch (e) { /* ignore */ }
}

// 页面加载时恢复用户状态
window.addEventListener('DOMContentLoaded', () => {
    updateUserUI();
    loadCartBadge();
});

window.onclick = function(e) {
    if (e.target.classList.contains('modal')) e.target.classList.remove('show');
};