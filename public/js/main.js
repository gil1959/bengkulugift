// Utility functions
const API_URL = '/api';

function getToken() {
    return localStorage.getItem('token');
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };
}

// UI State Management
function checkAuthState() {
    const token = getToken();
    const role = localStorage.getItem('role');
    const name = localStorage.getItem('name');
    const dashboardUrl = role === 'admin' ? '/pages/admin/dashboard.html' : '/pages/user/dashboard.html';

    // Desktop elements
    const guestMenu = document.getElementById('guestMenu');
    const userMenu = document.getElementById('userMenu');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const adminPanelLink = document.getElementById('adminPanelLink');

    // Mobile elements
    const mobileGuestMenu = document.getElementById('mobileGuestMenu');
    const mobileUserMenu = document.getElementById('mobileUserMenu');
    const mobileUserNameDisplay = document.getElementById('mobileUserNameDisplay');

    if (token && name) {
        // Desktop: hide guest, show user
        if (guestMenu) guestMenu.classList.add('hidden');
        if (userMenu) { userMenu.classList.remove('hidden'); userMenu.classList.add('flex'); }
        if (userNameDisplay) {
            userNameDisplay.textContent = `Hi, ${name}`;
            userNameDisplay.onclick = () => { window.location.href = dashboardUrl; };
        }

        // Mobile: hide guest, show user
        if (mobileGuestMenu) mobileGuestMenu.classList.add('hidden');
        if (mobileUserMenu) mobileUserMenu.classList.remove('hidden');
        if (mobileUserNameDisplay) {
            mobileUserNameDisplay.textContent = `Hi, ${name}`;
            mobileUserNameDisplay.onclick = () => { window.location.href = dashboardUrl; };
        }

        // Admin shortcut button (floating)
        if (role === 'admin' && adminPanelLink) adminPanelLink.classList.remove('hidden');

        loadCartCount();
    } else {
        // Logged out
        if (guestMenu) guestMenu.classList.remove('hidden');
        if (userMenu) { userMenu.classList.add('hidden'); userMenu.classList.remove('flex'); }
        if (mobileGuestMenu) mobileGuestMenu.classList.remove('hidden');
        if (mobileUserMenu) mobileUserMenu.classList.add('hidden');
        if (adminPanelLink) adminPanelLink.classList.add('hidden');
    }
}

// Modals
function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// Fetch Categories dynamically
async function loadCategories() {
    const list = document.getElementById('categoriesList');
    if (!list) return;
    try {
        const res = await fetch('/api/categories');
        const categories = await res.json();
        list.innerHTML = '';
        categories.forEach((c, index) => {

            const hasImage = c.icon && c.icon.trim() !== '';
            const imgOrIcon = hasImage
                ? `<img src="${c.icon}" alt="${c.name}" class="w-full h-full object-cover rounded-full" onerror="this.parentElement.innerHTML='<svg class=\\'w-8 h-8\\' fill=\\'none\\' stroke=\\'currentColor\\' viewBox=\\'0 0 24 24\\'><path stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'1.5\\' d=\\'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z\\'></path></svg>'">`
                : `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>`;

            list.innerHTML += `
                <div class="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] text-center group cursor-pointer hover:bg-primary transition-colors duration-300" data-aos="zoom-in" data-aos-delay="${index * 100}" onclick="window.location.href='/products.html?category=${c.id}'">
                    <div class="w-16 h-16 mx-auto ${hasImage ? '' : 'bg-accent text-primary group-hover:bg-white/20 group-hover:text-white'} rounded-full flex items-center justify-center mb-4 transition-colors duration-300 overflow-hidden">
                        ${imgOrIcon}
                    </div>
                    <h3 class="font-display font-semibold text-gray-900 group-hover:text-white transition-colors duration-300">${c.name}</h3>
                </div>
            `;
        });
    } catch (e) { }
}

// Fetch Products dynamically
async function loadProducts() {
    const list = document.getElementById('productsList');
    if (!list) return;
    try {
        const res = await fetch('/api/products');
        const products = await res.json();
        list.innerHTML = '';
        products.forEach((p, index) => {
            const imgUrl = p.image ? p.image : '/img/default_product.png';
            list.innerHTML += `
                <div class="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] group" data-aos="fade-up" data-aos-delay="${index * 100}">
                    <div class="relative overflow-hidden rounded-xl aspect-[4/3] mb-4 cursor-pointer" onclick="window.location.href='/product-detail.html?id=${p.id}'">
                        <img src="${imgUrl}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <button onclick="event.stopPropagation(); addToCart(${p.id}, 1);" class="bg-white text-primary p-3 rounded-full hover:bg-primary hover:text-white transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg" title="Tambah ke Keranjang">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-display font-semibold text-lg text-gray-900 cursor-pointer hover:text-primary transition-colors" onclick="window.location.href='/product-detail.html?id=${p.id}'">${p.name}</h3>
                        <div class="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded text-amber-600 text-sm font-medium">
                            <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                            4.8
                        </div>
                    </div>
                    <p class="text-sm text-gray-500 mb-4 line-clamp-2">${p.description || 'Produk khas Bengkulu pilihan terbaik untuk Anda.'}</p>
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-primary text-xl">Rp ${p.price}</span>
                        <span class="text-xs text-gray-400">Stok: ${p.stock}</span>
                    </div>
                </div>
            `;
        });
    } catch (e) { }
}

// Attach event listeners to existing navbar buttons
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    loadCategories();
    loadProducts();
    loadLandingReviews();

    // Auth buttons
    const btns = document.querySelectorAll('nav button');
    btns.forEach(btn => {
        if (btn.textContent.trim() === 'Masuk') {
            btn.onclick = () => window.location.href = '/pages/auth/login.html';
        } else if (btn.textContent.trim() === 'Daftar') {
            btn.onclick = () => window.location.href = '/pages/auth/register.html';
        }
    });

    // Cart button
    const cartBtn = document.querySelector('nav button.relative');
    if (cartBtn) {
        cartBtn.onclick = () => {
            if (!getToken()) {
                Swal.fire({ icon: 'warning', title: 'Akses Ditolak', text: 'Silakan login terlebih dahulu untuk mengakses keranjang.' }).then(() => {
                    window.location.href = '/pages/auth/login.html';
                });
                return;
            }
            openModal('cartModal');
            loadCartItems();
        };
    }

    // Attach "Add to Cart" to all static product buttons
    document.querySelectorAll('#produk button.bg-white.text-primary').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            addToCart(1, 1);
        }
    });
});

// Auth API Calls
async function register() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Registrasi berhasil! Silakan login.');
            closeModal('registerModal');
            openModal('loginModal');
        } else {
            alert(data.message || 'Registrasi gagal');
        }
    } catch (e) {
        alert('Terjadi kesalahan');
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('name', data.name);
            closeModal('loginModal');
            checkAuthState();
            alert('Login berhasil!');
        } else {
            alert(data.message || 'Login gagal');
        }
    } catch (e) {
        alert('Terjadi kesalahan');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    checkAuthState();
    Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Anda telah logout', timer: 1500, showConfirmButton: false });
}

// Cart API Calls
async function addToCart(product_id, quantity) {
    if (!getToken()) {
        Swal.fire({ icon: 'warning', title: 'Akses Ditolak', text: 'Silakan login terlebih dahulu!' }).then(() => {
            window.location.href = '/pages/auth/login.html';
        });
        return;
    }

    try {
        const res = await fetch(`${API_URL}/cart`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ product_id, quantity })
        });
        if (res.ok) {
            Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Produk ditambahkan ke keranjang!', timer: 1500, showConfirmButton: false });
            loadCartCount();
        } else {
            const data = await res.json();
            Swal.fire({ icon: 'error', title: 'Gagal', text: data.message || data.error });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: 'Terjadi kesalahan saat menambahkan ke keranjang' });
    }
}

async function loadCartCount() {
    try {
        const res = await fetch(`${API_URL}/cart`, { headers: getAuthHeaders() });
        const items = await res.json();
        const countSpan = document.querySelector('nav button.relative span');
        if (countSpan && Array.isArray(items)) {
            countSpan.textContent = items.reduce((acc, val) => acc + val.quantity, 0);
        }
    } catch (e) { }
}

async function loadCartItems() {
    try {
        const res = await fetch(`${API_URL}/cart`, { headers: getAuthHeaders() });
        const items = await res.json();

        const list = document.getElementById('cartItemsList');
        const totalSpan = document.getElementById('cartTotal');

        list.innerHTML = '';
        let total = 0;

        if (!Array.isArray(items) || items.length === 0) {
            list.innerHTML = '<p class="text-gray-500">Keranjang kosong</p>';
            totalSpan.textContent = 'Rp 0';
            return;
        }

        items.forEach(item => {
            total += item.price * item.quantity;
            list.innerHTML += `
                <div class="flex justify-between items-center border-b pb-2">
                    <div>
                        <h4 class="font-bold">${item.name}</h4>
                        <p class="text-sm text-gray-500">Rp ${item.price} x ${item.quantity}</p>
                    </div>
                    <button onclick="removeFromCart(${item.id})" class="text-red-500 text-sm">Hapus</button>
                </div>
            `;
        });

        totalSpan.textContent = `Rp ${total}`;
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal memuat keranjang' });
    }
}

async function removeFromCart(id) {
    try {
        await fetch(`${API_URL}/cart/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        loadCartItems();
        loadCartCount();
    } catch (e) { }
}

async function checkout() {
    try {
        const res = await fetch(`${API_URL}/orders/checkout`, { method: 'POST', headers: getAuthHeaders() });
        const data = await res.json();

        if (res.ok) {
            Swal.fire({ icon: 'success', title: 'Checkout Berhasil!', text: 'Mengarahkan ke halaman pembayaran...' }).then(() => {
                closeModal('cartModal');
                loadCartCount();
                window.location.href = `/pages/user/payment.html?order_id=${data.orderId}`;
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Checkout Gagal', text: data.message || 'Terjadi kesalahan' });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Koneksi bermasalah saat checkout' });
    }
}

async function loadLandingReviews() {
    const list = document.getElementById('landingReviewsList');
    if (!list) return; // Only execute if on landing page

    try {
        const res = await fetch('/api/reviews/latest');
        if (!res.ok) throw new Error();
        const reviews = await res.json();

        if (!reviews || reviews.length === 0) {
            list.innerHTML = '<div class="col-span-full p-8 text-center text-white/60">Belum ada ulasan untuk saat ini. Jadilah yang pertama!</div>';
            return;
        }

        list.innerHTML = reviews.map((r, i) => `
            <div class="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20" data-aos="fade-up" data-aos-delay="${i * 100}">
                <div class="flex gap-1 mb-4 text-accent">
                    ${'<svg class="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>'.repeat(r.rating)}
                    ${'<svg class="w-5 h-5 fill-current opacity-30" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>'.repeat(5 - r.rating)}
                </div>
                <p class="mb-6 italic leading-relaxed text-white">"${r.comment || 'Tidak ada komentar'}"</p>
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-bold text-xl text-white uppercase">${(r.user_name || 'U').charAt(0)}</div>
                    <div>
                        <h4 class="font-display font-semibold text-white">${r.user_name || 'Pelanggan'}</h4>
                        <p class="text-sm text-accent opacity-80">Pembeli ${r.product_name || 'Produk'}</p>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        list.innerHTML = '<div class="col-span-full p-8 text-center text-white/60">Gagal memuat ulasan.</div>';
    }
}
