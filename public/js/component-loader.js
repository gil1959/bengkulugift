

async function loadComponent(elementId, componentPath) {
    const el = document.getElementById(elementId);
    if (!el) return;
    try {
        const response = await fetch(componentPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        el.outerHTML = html;
    } catch (err) {
        console.error(`[ComponentLoader] Gagal memuat: ${componentPath}`, err);
    }
}

async function initComponents() {
    await Promise.all([
        loadComponent('site-navbar', '/components/navbar.html'),
        loadComponent('site-footer', '/components/footer.html'),
    ]);

    if (typeof checkAuthState === 'function') checkAuthState();
    if (typeof loadCartCount === 'function') loadCartCount();
}

document.addEventListener('DOMContentLoaded', initComponents);
