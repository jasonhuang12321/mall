// 订单页面
window.onload = function() {
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    loadOrders();
    loadCartBadge();
};

function getOrderStatusText(order) {
    const s = order.status;
    if (typeof s === 'number') {
        return ['', '待付款', '已付款', '已发货', '已完成', '已取消'][s] || '未知';
    }
    const map = { PENDING: '待付款', PAID: '已付款', SHIPPED: '已发货', COMPLETED: '已完成', CANCELLED: '已取消' };
    return map[s] || order.status_text || order.statusText || '未知';
}

function getOrderStatusValue(order) {
    if (typeof order.status === 'number') return order.status;
    const map = { PENDING: 1, PAID: 2, SHIPPED: 3, COMPLETED: 4, CANCELLED: 5 };
    return map[order.status] || 1;
}

async function loadOrders() {
    try {
        const data = await fetchAPI('/orders');
        const orders = data.data;
        if (!orders.length) {
            $('orderList').innerHTML = '<p class="empty-text">暂无订单，<a href="index.html">去逛逛</a></p>';
            return;
        }
        $('orderList').innerHTML = orders.map(o => {
            const orderNo = o.orderNo || o.order_no || o.id;
            const timeStr = o.createdAt || o.created_at;
            const total = o.totalAmount || o.total_amount || 0;
            const statusText = getOrderStatusText(o);
            const statusVal = getOrderStatusValue(o);
            return `
            <div class="order-card">
                <div class="order-header">
                    <span>订单号: ${orderNo}</span>
                    <span>${new Date(timeStr).toLocaleString('zh-CN')}</span>
                    <span class="order-status">${statusText}</span>
                </div>
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