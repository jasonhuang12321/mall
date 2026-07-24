// 商品详情页
let productId = null;
let ratingValue = 5;
let currentProduct = null;

// 从 URL 获取商品 ID
function getProductId() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('id')) || 0;
}

// 加载商品详情
async function loadProduct() {
    productId = getProductId();
    if (!productId) {
        $('productDetail').innerHTML = '<p class="empty-text">商品不存在</p>';
        return;
    }
    try {
        const data = await fetchAPI('/products/' + productId);
        currentProduct = data.data;
        renderProduct(currentProduct);
        loadComments();
    } catch (e) {
        $('productDetail').innerHTML = '<p class="empty-text">商品加载失败</p>';
    }
}

function renderProduct(p) {
    $('detailImage').src = p.image || 'https://picsum.photos/seed/fallback/400/400';
    $('detailImage').onerror = function() { this.src = 'https://picsum.photos/seed/fallback/400/400'; };
    document.title = p.name + ' - 优选商城';
    $('detailName').textContent = p.name;
    $('detailPrice').textContent = formatPrice(p.price);
    if (p.original_price > p.price) {
        $('detailOriginalPrice').textContent = formatPrice(p.original_price);
    } else {
        $('detailOriginalPrice').textContent = '';
    }
    $('detailStock').textContent = p.stock;
    $('detailSales').textContent = p.sales + ' 件';
    $('detailCategory').textContent = p.category_name || '未分类';
    $('detailDesc').textContent = p.description || '暂无描述';
    $('breadcrumbCategory').textContent = p.name;
}

// 加入购物车
async function addToCart() {
    if (!currentUser) { showModal('loginModal'); return; }
    try {
        await fetchAPI('/cart', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, quantity: 1 })
        });
        alert('已加入购物车');
        loadCartBadge();
    } catch (e) { alert('添加失败: ' + e.message); }
}

// 立即购买
async function buyNow() {
    if (!currentUser) { showModal('loginModal'); return; }
    try {
        await fetchAPI('/cart', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, quantity: 1 })
        });
        window.location.href = 'profile.html';
    } catch (e) { alert('操作失败: ' + e.message); }
}

// 加载评论
async function loadComments() {
    try {
        const data = await fetchAPI('/comments?product_id=' + productId);
        $('commentCount').textContent = data.data.length;
        renderComments(data.data);
    } catch (e) { /* ignore */ }
}

function renderComments(comments) {
    const list = $('commentList');
    if (!comments.length) {
        list.innerHTML = '<p class="empty-text">暂无评论，快来抢沙发吧</p>';
        return;
    }
    list.innerHTML = comments.map(c => {
        const stars = '★'.repeat(c.rating) + '☆'.repeat(5 - c.rating);
        const time = new Date(c.created_at).toLocaleDateString('zh-CN');
        return `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-user">${c.username}</span>
                    <span class="comment-stars">${stars}</span>
                    <span class="comment-time">${time}</span>
                </div>
                <div class="comment-body">${c.content}</div>
            </div>`;
    }).join('');
}

// 星级评分
document.addEventListener('DOMContentLoaded', function() {
    const stars = document.querySelectorAll('#ratingStars .star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            ratingValue = parseInt(this.dataset.r);
            stars.forEach(s => {
                s.classList.toggle('active', parseInt(s.dataset.r) <= ratingValue);
            });
        });
    });
    // 默认5星
    stars.forEach(s => s.classList.add('active'));
});

// 提交评论
async function submitComment() {
    if (!currentUser) { showModal('loginModal'); return; }
    const content = $('commentContent').value.trim();
    if (!content) { alert('请输入评论内容'); return; }
    try {
        await fetchAPI('/comments', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, content: content, rating: ratingValue })
        });
        $('commentContent').value = '';
        ratingValue = 5;
        document.querySelectorAll('#ratingStars .star').forEach(s => s.classList.add('active'));
        loadComments();
    } catch (e) { alert('评论失败: ' + e.message); }
}

window.onload = function() {
    loadProduct();
    loadCartBadge();
};