// 首页 - 商品列表 + 分类导航 + 搜索筛选 + 轮播图
let currentCategory = 0;

// ==================== 轮播图 ====================
let carouselIndex = 0;
let carouselInterval = null;
const CAROUSEL_DELAY = 5000;

function carouselGoTo(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    const total = slides.length;
    if (total === 0) return;
    index = ((index % total) + total) % total;
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    slides[index].classList.add('active');
    dots[index].classList.add('active');
    carouselIndex = index;
}

function carouselPrev() {
    carouselGoTo(carouselIndex - 1);
    resetCarouselInterval();
}

function carouselNext() {
    carouselGoTo(carouselIndex + 1);
    resetCarouselInterval();
}

function startCarouselInterval() {
    if (carouselInterval) clearInterval(carouselInterval);
    carouselInterval = setInterval(() => carouselNext(), CAROUSEL_DELAY);
}

function resetCarouselInterval() {
    if (carouselInterval) clearInterval(carouselInterval);
    startCarouselInterval();
}

function initCarousel() {
    const container = document.querySelector('.carousel-container');
    if (!container) return;
    carouselGoTo(0);
    startCarouselInterval();
    container.addEventListener('mouseenter', () => {
        if (carouselInterval) clearInterval(carouselInterval);
    });
    container.addEventListener('mouseleave', startCarouselInterval);
    // 触摸滑动支持
    let touchStartX = 0;
    container.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; });
    container.addEventListener('touchend', (e) => {
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            diff > 0 ? carouselNext() : carouselPrev();
        }
    });
}

function buildQueryParams() {
    const params = new URLSearchParams();
    const keyword = $('searchKeyword').value.trim();
    const minPrice = $('filterMinPrice').value;
    const maxPrice = $('filterMaxPrice').value;
    const sort = $('filterSort').value;

    if (keyword) params.set('keyword', keyword);
    if (currentCategory > 0) params.set('category_id', currentCategory);
    if (minPrice) params.set('min_price', minPrice);
    if (maxPrice) params.set('max_price', maxPrice);
    if (sort) params.set('sort', sort);

    return params.toString();
}

async function loadProducts() {
    try {
        const qs = buildQueryParams();
        const url = '/products' + (qs ? '?' + qs : '');
        const data = await fetchAPI(url);
        renderProductGrid(data.data);
        syncCardFavStatus();
    } catch (e) {
        $('productGrid').innerHTML = '<p class="empty-text">加载失败，请确保后端已启动</p>';
    }
}

function renderProductGrid(products) {
    const grid = $('productGrid');
    if (!products.length) { grid.innerHTML = '<p class="empty-text">暂无商品</p>'; return; }
    grid.innerHTML = products.map(p => {
        const img = p.imageUrl || p.image || '';
        const origPrice = p.originalPrice || p.original_price || 0;
        return `
        <div class="product-card" onclick="location.href='product-detail.html?id=${p.id}'">
            <div class="product-img-wrap">
                <img src="${img}" alt="${escHtml(p.name)}" onerror="this.src='https://picsum.photos/seed/fallback/400/400'">
                <button class="card-fav-btn" data-pid="${p.id}" onclick="event.stopPropagation();toggleCardFav(${p.id}, this)" title="收藏">&#9825;</button>
            </div>
            <div class="product-info">
                <div class="product-name">${escHtml(p.name)}</div>
                <div class="product-price">
                    <span class="price-current">${formatPrice(p.price)}</span>
                    ${origPrice > p.price ? `<span class="price-original">${formatPrice(origPrice)}</span>` : ''}
                </div>
                <div class="product-sales">已售 ${p.sales} 件</div>
            </div>
        </div>`;}).join('');
}

async function toggleCardFav(productId, btn) {
    if (!currentUser) { showModal('loginModal'); return; }
    const isFav = btn.classList.contains('favorited');
    try {
        if (isFav) {
            await fetchAPI('/favorites?product_id=' + productId, { method: 'DELETE' });
            btn.classList.remove('favorited');
            btn.innerHTML = '&#9825;';
        } else {
            await fetchAPI('/favorites', { method: 'POST', body: JSON.stringify({ product_id: productId }) });
            btn.classList.add('favorited');
            btn.innerHTML = '&#9829;';
        }
    } catch (e) { alert('操作失败: ' + e.message); }
}

// 同步首页卡片收藏状态
async function syncCardFavStatus() {
    if (!currentUser) return;
    try {
        const data = await fetchAPI('/favorites');
        const favIds = new Set(data.data.map(f => f.product_id || (f.product ? f.product.id : 0)));
        document.querySelectorAll('.card-fav-btn').forEach(btn => {
            const pid = parseInt(btn.dataset.pid);
            if (favIds.has(pid)) {
                btn.classList.add('favorited');
                btn.innerHTML = '&#9829;';
            }
        });
    } catch (e) { /* ignore */ }
}

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
    // 轮播 Banner 仅在「全部」分类时显示
    const wrapper = document.querySelector('.carousel-wrapper');
    if (wrapper) {
        wrapper.style.display = cid === 0 ? '' : 'none';
    }
    loadProducts();
}

function searchProducts() {
    loadProducts();
}

function resetFilters() {
    $('searchKeyword').value = '';
    $('filterMinPrice').value = '';
    $('filterMaxPrice').value = '';
    $('filterSort').value = '';
    currentCategory = 0;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', parseInt(item.dataset.cid) === 0);
    });
    // 重置时显示轮播 Banner
    const wrapper = document.querySelector('.carousel-wrapper');
    if (wrapper) wrapper.style.display = '';
    loadProducts();
}

window.onload = function() {
    loadCategories();
    loadProducts();
    initCarousel();
};