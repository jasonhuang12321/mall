// 订单页面
window.onload = function() {
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    loadOrders();
    loadCartBadge();
};

async function loadOrders() {
    try {
        const data = await fetchAPI('/orders');
        const orders = data.data;
        if (!orders.length) {
            $('orderList').innerHTML = '<p class="empty-text">暂无订单，<a href="index.html">去逛逛</a></p>';
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