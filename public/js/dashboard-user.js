// ============ AUTH ============
const token = localStorage.getItem('token');
const userName = localStorage.getItem('name') || 'Pengguna';

if (!token) { window.location.href = '/pages/auth/login.html'; }

// ============ TOAST ============
function toast(msg, type = 'info') {
    const icons = {
        success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        error: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
        info: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
    const t = document.createElement('div');
    t.className = `toast toast-${type} flex items-center gap-2 p-3 bg-white rounded-lg shadow-lg mb-2`;
    t.innerHTML = icons[type] + `<span class="text-sm font-medium text-gray-800">${msg}</span>`;
    document.getElementById('toastContainer').appendChild(t);
    setTimeout(() => { t.style.animation = 'slideOut .3s ease forwards'; setTimeout(() => t.remove(), 300); }, 3500);
}

// ============ HELPERS ============
const H = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
const fmt = n => 'Rp ' + Number(n).toLocaleString('id-ID');
const fmtDate = d => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const stars = r => '<span class="text-amber-400">' + '★'.repeat(r) + '</span><span class="text-gray-200">' + '★'.repeat(5 - r) + '</span>';

function statusBadge(s) {
    const map = {
        pending: ['bg-yellow-100 text-yellow-700', 'Menunggu Bayar'],
        paid: ['bg-blue-100 text-blue-700', 'Menunggu Validasi'],
        diproses: ['bg-orange-100 text-orange-700', 'Diproses Admin'],
        dikirim: ['bg-purple-100 text-purple-700', 'Sedang Dikirim'],
        selesai: ['bg-green-100 text-green-700', 'Selesai'],
        cancelled: ['bg-red-100 text-red-700', 'Dibatalkan']
    };
    const [cls, lbl] = map[s] || ['bg-gray-100 text-gray-700', s];
    return `<span class="px-2.5 py-1 rounded-full text-xs font-bold ${cls}">${lbl}</span>`;
}

// ============ SECTION NAV ============
const titles = { overview: 'Beranda', orders: 'Pesanan Saya', favorites: 'Favorit Saya', reviews: 'Ulasan Saya', profile: 'Profil Saya', cart: 'Keranjang Saya' };
function showSection(id, el) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.remove('active', 'bg-primary/20', 'text-primary');
        n.classList.add('text-gray-400', 'hover:bg-gray-800', 'hover:text-white');
    });
    document.getElementById('section-' + id).classList.add('active');
    if (el) {
        el.classList.remove('text-gray-400', 'hover:bg-gray-800', 'hover:text-white');
        el.classList.add('active', 'bg-primary/20', 'text-primary');
    }
    document.getElementById('topbarTitle').textContent = titles[id] || id;
    if (id === 'orders') loadOrders();
    else if (id === 'favorites') loadFavorites();
    else if (id === 'reviews') loadReviews();
    else if (id === 'profile') loadProfile();
    else if (id === 'cart') loadCart();
    else if (id === 'overview') loadOverview();
}

// ============ MODAL ============
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); }));

// ============ OVERVIEW ============
async function loadOverview() {
    try {
        const res = await fetch('/api/users/stats', { headers: H });
        const d = await res.json();
        document.getElementById('statTotalOrders').textContent = d.total_orders;
        document.getElementById('statCompleted').textContent = d.completed_orders;
        document.getElementById('statFavorites').textContent = d.total_favorites;
        document.getElementById('statSpent').textContent = d.total_spent >= 1000000
            ? 'Rp ' + (d.total_spent / 1000000).toFixed(1) + 'jt'
            : fmt(d.total_spent);
    } catch (e) { console.error(e); }

    try {
        const res = await fetch('/api/orders/my', { headers: H });
        const orders = await res.json();
        const tbody = document.getElementById('recentOrdersBody');
        if (!orders.length) { tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-400 text-sm">Belum ada pesanan</td></tr>'; return; }
        tbody.innerHTML = orders.slice(0, 5).map(o => `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td class="p-4 text-sm font-medium text-gray-800">#${o.id}</td>
                <td class="p-4 text-sm text-gray-500">${fmtDate(o.created_at)}</td>
                <td class="p-4 text-sm font-bold text-gray-800">${fmt(o.total_amount)}</td>
                <td class="p-4">${statusBadge(o.status)}</td>
            </tr>`).join('');
    } catch (e) { console.error(e); }
}

// ============ ORDERS ============
async function loadOrders() {
    const tbody = document.getElementById('ordersBody');
    tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-400">Memuat...</td></tr>';
    try {
        const res = await fetch('/api/orders/my', { headers: H });
        const orders = await res.json();
        if (!orders.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-12 text-center text-gray-500"><svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg><p>Belum ada pesanan. <a href="/products.html" class="text-primary hover:text-secondary font-medium transition-colors">Belanja sekarang!</a></p></td></tr>';
            return;
        }
        tbody.innerHTML = orders.map(o => {
            let actions = '';
            if (o.status === 'pending') actions = `
                <div class="flex flex-col gap-1 items-end">
                    <button class="text-xs px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-secondary transition-colors font-medium w-full text-center" onclick="window.location.href='/pages/user/payment.html?order_id=${o.id}'">Bayar</button>
                    <button class="text-xs px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-medium w-full text-center" onclick="cancelOrder(${o.id})">Batalkan</button>
                </div>`;
            else if (o.status === 'paid' || o.status === 'diproses') actions = '<span class="text-xs text-gray-400 italic">Sedang diproses</span>';
            else if (o.status === 'dikirim') actions = `<button class="text-xs px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium shadow-sm w-full text-center" onclick="completeOrder(${o.id})">Diterima</button>`;
            else if (o.status === 'selesai') {
                const pid = o.first_product_id || 1;
                actions = `<button class="text-xs px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm w-full text-center" onclick="openReviewModal(${pid},'${(o.product_names || 'Produk').split(',')[0].trim()}')">Beri Ulasan</button>`;
            }
            return `
                <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td class="p-4 text-sm font-medium text-gray-800">#${o.id}</td>
                    <td class="p-4 text-sm text-gray-500">${fmtDate(o.created_at)}</td>
                    <td class="p-4 text-sm text-gray-600 max-w-[180px] truncate" title="${o.product_names || '-'}">${o.product_names || '-'}</td>
                    <td class="p-4 text-sm font-bold text-primary">${fmt(o.total_amount)}</td>
                    <td class="p-4">${statusBadge(o.status)}</td>
                    <td class="p-4 text-right">${actions}</td>
                </tr>`;
        }).join('');
    } catch (e) { toast('Gagal memuat pesanan', 'error'); }
}

async function cancelOrder(id) {
    if (!confirm('Yakin ingin membatalkan pesanan ini?')) return;
    try {
        const res = await fetch(`/api/orders/${id}/cancel`, { method: 'PUT', headers: H });
        if (res.ok) { toast('Pesanan dibatalkan', 'success'); loadOrders(); loadOverview(); }
        else { const d = await res.json(); toast(d.message || 'Gagal membatalkan', 'error'); }
    } catch (e) { toast('Kesalahan jaringan', 'error'); }
}

async function completeOrder(id) {
    if (!confirm('Apakah Anda sudah menerima pesanan ini dengan baik?')) return;
    try {
        const res = await fetch(`/api/orders/${id}/complete`, { method: 'PUT', headers: H });
        if (res.ok) {
            Swal.fire({ icon: 'success', title: 'Terima Kasih!', text: 'Pesanan telah selesai. Jangan lupa berikan ulasan!' });
            loadOrders();
            loadOverview();
        }
        else { const d = await res.json(); toast(d.message || 'Gagal konfirmasi', 'error'); }
    } catch (e) { toast('Kesalahan jaringan', 'error'); }
}

// ============ FAVORITES ============
async function loadFavorites() {
    const grid = document.getElementById('favGrid');
    grid.innerHTML = '<div class="col-span-full p-8 text-center text-gray-400">Memuat...</div>';
    try {
        const res = await fetch('/api/favorites', { headers: H });
        const favs = await res.json();
        if (!favs.length) {
            grid.innerHTML = '<div class="col-span-full p-12 text-center text-gray-500"><svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg><p>Belum ada produk favorit. <a href="/products.html" class="text-primary hover:text-secondary font-medium transition-colors">Jelajahi produk!</a></p></div>';
            return;
        }
        grid.innerHTML = favs.map(f => `
            <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative flex flex-col">
                <div class="h-40 overflow-hidden relative">
                    <img src="${f.image || '/img/placeholder.png'}" alt="${f.name}" onerror="this.src='https://placehold.co/300x200/fef3c7/b45309?text=Produk'" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                    <button class="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur text-red-500 rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors" onclick="removeFav(${f.id},this)" title="Hapus dari Favorit">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
                <div class="p-4 flex flex-col flex-1">
                    <div class="text-xs font-semibold text-primary uppercase tracking-wider mb-1">${f.category_name || 'Umum'}</div>
                    <div class="font-bold text-gray-800 text-sm mb-1 truncate" title="${f.name}">${f.name}</div>
                    <div class="flex items-center gap-1 text-xs mb-3">
                        <div class="flex items-center text-amber-400">${stars(Math.round(f.avg_rating))}</div>
                        <span class="text-gray-500 ml-1">(${Number(f.avg_rating).toFixed(1)})</span>
                    </div>
                    <div class="mt-auto pt-3 flex items-center justify-between border-t border-gray-100">
                        <div class="font-bold text-primary">${fmt(f.price)}</div>
                        <button class="w-8 h-8 bg-primary hover:bg-secondary text-white rounded-full flex items-center justify-center transition-colors shadow-sm" onclick="addToCart(${f.product_id})" title="Tambah ke Keranjang">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                        </button>
                    </div>
                </div>
            </div>`).join('');
    } catch (e) { toast('Gagal memuat favorit', 'error'); }
}

async function removeFav(favId, btn) {
    btn.disabled = true;
    try {
        const res = await fetch(`/api/favorites/${favId}`, { method: 'DELETE', headers: H });
        if (res.ok) { toast('Produk dihapus dari favorit', 'success'); loadFavorites(); loadOverview(); }
        else toast('Gagal menghapus favorit', 'error');
    } catch (e) { toast('Kesalahan jaringan', 'error'); btn.disabled = false; }
}

async function addToCart(productId) {
    try {
        const res = await fetch('/api/cart', { method: 'POST', headers: H, body: JSON.stringify({ product_id: productId, quantity: 1 }) });
        if (res.ok) toast('Produk ditambahkan ke keranjang!', 'success');
        else { const d = await res.json(); toast(d.message || 'Gagal menambahkan ke keranjang', 'error'); }
    } catch (e) { toast('Kesalahan jaringan', 'error'); }
}

// ============ KERANJANG ============
async function loadCart() {
    const list = document.getElementById('cartItemsContainer');
    const totalSpan = document.getElementById('cartTotalDashboard');
    list.innerHTML = '<div class="p-8 text-center text-gray-400">Memuat...</div>';
    try {
        const res = await fetch('/api/cart', { headers: H });
        const items = await res.json();

        let total = 0;
        if (!Array.isArray(items) || !items.length) {
            list.innerHTML = '<div class="text-center py-10 text-gray-500"><svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg><p>Keranjang masih kosong. <a href="/products.html" class="text-primary hover:text-secondary font-medium">Belanja sekarang!</a></p></div>';
            totalSpan.textContent = 'Rp 0';
            return;
        }

        list.innerHTML = items.map(item => {
            total += item.price * item.quantity;
            return `
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div class="flex items-center gap-4">
                        <img src="${item.product_image || '/img/default_product.png'}" class="w-16 h-16 rounded-lg object-cover" onerror="this.src='/img/default_product.png'">
                        <div>
                            <h4 class="font-bold text-gray-800">${item.name}</h4>
                            <p class="text-sm text-gray-500">${fmt(item.price)} x <span class="font-bold text-gray-700">${item.quantity}</span></p>
                        </div>
                    </div>
                    <div class="flex items-center gap-6">
                        <div class="font-bold text-primary">${fmt(item.price * item.quantity)}</div>
                        <button onclick="removeCartItem(${item.id})" class="text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors" title="Hapus">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                </div>`;
        }).join('');
        totalSpan.textContent = fmt(total);
    } catch (e) { toast('Gagal memuat keranjang', 'error'); }
}

async function removeCartItem(id) {
    try {
        const res = await fetch(`/api/cart/${id}`, { method: 'DELETE', headers: H });
        if (res.ok) { toast('Produk dihapus dari keranjang', 'success'); loadCart(); }
    } catch (e) { toast('Kesalahan jaringan', 'error'); }
}

async function checkoutDashboard() {
    try {
        const res = await fetch('/api/orders/checkout', { method: 'POST', headers: H });
        const data = await res.json();
        if (res.ok) {
            Swal.fire({ icon: 'success', title: 'Checkout Berhasil!', text: 'Mengarahkan ke halaman pembayaran...' }).then(() => {
                window.location.href = `/pages/user/payment.html?order_id=${data.orderId}`;
            });
        } else {
            toast(data.message || 'Keranjang kosong / Gagal checkout', 'error');
        }
    } catch (e) { toast('Kesalahan jaringan', 'error'); }
}

// ============ REVIEWS ============
async function loadReviews() {
    const list = document.getElementById('reviewsList');
    list.innerHTML = '<div class="p-8 text-center text-gray-400">Memuat...</div>';

    let reviews = [];
    let unreviewed = [];

    try {
        const reviewsRes = await fetch('/api/users/my-reviews', { headers: H });
        if (reviewsRes.ok) {
            reviews = await reviewsRes.json();
        } else {
            console.warn('my-reviews non-OK:', reviewsRes.status);
        }
    } catch (e) {
        console.error('my-reviews fetch error:', e);
    }

    try {
        const unreviewedRes = await fetch('/api/users/unreviewed', { headers: H });
        if (unreviewedRes.ok) {
            unreviewed = await unreviewedRes.json();
        } else {
            console.warn('unreviewed non-OK:', unreviewedRes.status);
        }
    } catch (e) {
        console.error('unreviewed fetch error:', e);
    }

    if (!Array.isArray(reviews)) reviews = [];
    if (!Array.isArray(unreviewed)) unreviewed = [];

    if (!reviews.length && !unreviewed.length) {
        list.innerHTML = '<div class="p-12 text-center text-gray-500"><svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg><p class="font-medium mb-1">Belum ada ulasan</p><p class="text-sm text-gray-400">Selesaikan pesanan untuk dapat memberikan ulasan produk.</p></div>';
        return;
    }

    let html = '';

    if (unreviewed.length > 0) {
        html += '<div class="bg-amber-50 p-4 border-b border-gray-100 font-medium text-amber-800 flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Menunggu Ulasan Anda</div>';
        html += unreviewed.map(u => `
            <div class="flex gap-4 p-6 hover:bg-gray-50 transition-colors bg-white">
                <img class="w-16 h-16 rounded-xl object-cover border border-gray-100 flex-shrink-0" src="${u.product_image || 'https://placehold.co/56x56/fef3c7/b45309?text=P'}" alt="${u.product_name}" onerror="this.src='https://placehold.co/56x56/fef3c7/b45309?text=P'">
                <div class="flex-1 flex justify-between items-center">
                    <div>
                        <div class="font-semibold text-gray-800 mb-1">${u.product_name}</div>
                        <div class="text-xs text-gray-500 mb-2">Pesanan #${u.order_id} - ${fmtDate(u.created_at)}</div>
                    </div>
                    <button class="text-xs px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors font-medium shadow-sm" onclick="openReviewModal(${u.product_id},'${u.product_name.replace(/'/g, "\\'")}')">Beri Ulasan</button>
                </div>
            </div>`).join('');
    }

    if (reviews.length > 0) {
        if (unreviewed.length > 0) html += '<div class="bg-gray-50 p-4 border-y border-gray-100 font-medium text-gray-800">Ulasan yang Telah Ditulis</div>';
        html += reviews.map(r => `
            <div class="flex gap-4 p-6 hover:bg-gray-50 transition-colors bg-white">
                <img class="w-16 h-16 rounded-xl object-cover border border-gray-100 flex-shrink-0" src="${r.product_image || 'https://placehold.co/56x56/fef3c7/b45309?text=P'}" alt="${r.product_name}" onerror="this.src='https://placehold.co/56x56/fef3c7/b45309?text=P'">
                <div class="flex-1">
                    <div class="flex items-start justify-between mb-1">
                        <div class="font-semibold text-gray-800">${r.product_name}</div>
                        <div class="text-xs text-gray-400">${fmtDate(r.created_at)}</div>
                    </div>
                    <div class="flex items-center gap-1 mb-2 text-sm">
                        ${stars(r.rating)}
                        <span class="text-xs font-medium text-gray-500 ml-1">${r.rating}/5</span>
                    </div>
                    <p class="text-sm text-gray-600 leading-relaxed">${r.comment ? `"${r.comment}"` : '<em class="text-gray-400">Tidak ada komentar</em>'}</p>
                </div>
            </div>`).join('');
    }

    list.innerHTML = html;
}

// ============ REVIEW MODAL ============
let currentRating = 5;
function setRating(n) {
    currentRating = n;
    document.getElementById('reviewRating').value = n;

    document.querySelectorAll('#starsInput span').forEach((s, i) => {
        s.style.color = i < n ? '#f59e0b' : '#d1d5db';
    });
}
setRating(5);

function openReviewModal(productId, productName) {
    document.getElementById('reviewProductId').value = productId;
    document.getElementById('reviewProductName').textContent = 'Produk: ' + productName;
    document.getElementById('reviewComment').value = '';
    setRating(5);
    openModal('reviewModal');
}
async function submitReview() {
    const product_id = document.getElementById('reviewProductId').value;
    const rating = currentRating;
    const comment = document.getElementById('reviewComment').value;
    try {
        const res = await fetch('/api/reviews', { method: 'POST', headers: H, body: JSON.stringify({ product_id, rating, comment }) });
        const d = await res.json();
        if (res.ok) {
            toast('Ulasan berhasil dikirim! Terima kasih', 'success');
            closeModal('reviewModal');
            loadReviews();
            loadOverview();
        }
        else toast(d.message || 'Gagal mengirim ulasan', 'error');
    } catch (e) { toast('Kesalahan jaringan', 'error'); }
}

// ============ PROFILE ============
async function loadProfile() {
    try {
        const res = await fetch('/api/users/profile', { headers: H });
        const u = await res.json();
        document.getElementById('pfName').value = u.name || '';
        document.getElementById('pfEmail').value = u.email || '';
        document.getElementById('pfPhone').value = u.no_hp || '';
        document.getElementById('pfJoined').value = fmtDate(u.created_at);
    } catch (e) { toast('Gagal memuat profil', 'error'); }
}
async function saveProfile(e) {
    e.preventDefault();
    const name = document.getElementById('pfName').value;
    const no_hp = document.getElementById('pfPhone').value;
    try {
        const res = await fetch('/api/users/profile', { method: 'PUT', headers: H, body: JSON.stringify({ name, no_hp }) });
        const d = await res.json();
        if (res.ok) {
            toast('Profil berhasil diperbarui!', 'success');
            localStorage.setItem('name', name);
            document.getElementById('sidebarName').textContent = name;
            document.getElementById('avatarInitial').textContent = name.charAt(0).toUpperCase();
            document.getElementById('welcomeName').textContent = name;
        } else toast(d.message || 'Gagal memperbarui profil', 'error');
    } catch (e) { toast('Kesalahan jaringan', 'error'); }
}
async function changePassword(e) {
    e.preventDefault();
    const current_password = document.getElementById('pwOld').value;
    const new_password = document.getElementById('pwNew').value;
    const confirm = document.getElementById('pwConfirm').value;
    if (new_password !== confirm) { toast('Konfirmasi password tidak cocok', 'error'); return; }
    try {
        const res = await fetch('/api/users/profile/password', { method: 'PUT', headers: H, body: JSON.stringify({ current_password, new_password }) });
        const d = await res.json();
        if (res.ok) { toast('Password berhasil diubah!', 'success'); document.getElementById('passwordForm').reset(); }
        else toast(d.message || 'Gagal mengubah password', 'error');
    } catch (e) { toast('Kesalahan jaringan', 'error'); }
}

// ============ LOGOUT ============
function logout() {
    localStorage.clear();
    window.location.href = '/pages/auth/login.html';
}

// ============ INIT ============
(function init() {
    const name = userName;
    const email = localStorage.getItem('email') || '';
    document.getElementById('sidebarName').textContent = name;
    document.getElementById('sidebarEmail').textContent = email;
    document.getElementById('avatarInitial').textContent = name.charAt(0).toUpperCase();
    document.getElementById('welcomeName').textContent = name;
    loadOverview();
})();
