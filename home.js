// 首页 - 商品列表 + 分类导航 + 搜索筛选
let currentCategory = 0;

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
    } catch (e) {
        $('productGrid').innerHTML = '<p class="empty-text">加载失败，请确保后端已启动</p>';
    }
}

function renderProductGrid(products) {
    const grid = $('productGrid');
    if (!products.length) { grid.innerHTML = '<p class="empty-text">暂无商品</p>'; return; }
    grid.innerHTML = products.map(p => `
        <div class="product-card" onclick="location.href='product.html?id=${p.id}'">
            <img src="${p.image}" alt="${p.name}" onerror="this.src='https://picsum.photos/seed/fallback/400/400'">
            <div class="product-info">
                <div class="product-name">${p.name}</div>
                <div class="product-price">
                    <span class="price-current">${formatPrice(p.price)}</span>
                    ${p.original_price > p.price ? `<span class="price-original">${formatPrice(p.original_price)}</span>` : ''}
                </div>
                <div class="product-sales">已售 ${p.sales} 件</div>
            </div>
        </div>`).join('');
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
    loadProducts();
}

window.onload = function() {
    loadCategories();
    loadProducts();
};