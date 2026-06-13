// ========== SHOPPING CART FUNCTIONS ==========

function getCart() {
    const stored = localStorage.getItem('eshopCart');
    return stored ? JSON.parse(stored) : [];
}

function saveCart(cart) {
    localStorage.setItem('eshopCart', JSON.stringify(cart));
}

function formatCurrency(value) {
    return '₹' + value.toFixed(2);
}

async function apiFetch(path, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    };

    const response = await fetch(`/api${path}`, config);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const error = new Error(data?.error || `Server error ${response.status}`);
        error.status = response.status;
        throw error;
    }
    return data;
}

async function createOrderOnBackend(order) {
    return apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify(order)
    });
}

async function payOrderOnBackend(orderId, paymentMethod, paymentDetails) {
    return apiFetch(`/orders/${encodeURIComponent(orderId)}/payment`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod, paymentDetails })
    });
}

async function loadProductsFromBackend() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    try {
        const products = await apiFetch('/products');
        if (!Array.isArray(products) || !products.length) return;
        productsGrid.innerHTML = products.map(product => `
            <div class="product-card">
              <div class="product-badge">BESTSELLER</div>
              <img src="${product.image}" alt="${product.name}">
              <div class="product-content">
                <p class="brand">${product.brand || 'E-SHOP'}</p>
                <h3>${product.name}</h3>
                <div class="rating-stars">⭐⭐⭐⭐⭐</div>
                <div class="pricing">
                  <span class="price">₹${Number(product.price).toFixed(2)}</span>
                </div>
                <div class="fast-delivery">⚡ 1-Day Delivery</div>
                <button class="add-to-cart" onclick="handleProductSelection({name: '${product.name.replace(/'/g, "\\'")}', brand: '${(product.brand||'E-SHOP').replace(/'/g, "\\'")}', price: '₹${Number(product.price).toFixed(2)}', image: '${product.image}'})">Add to Cart</button>
              </div>
            </div>
        `).join('');
    } catch (error) {
        console.warn('Could not load products from backend:', error.message);
    }
}

function getLoggedInUserEmail() {
    return localStorage.getItem('eshopUserEmail');
}

function setLoggedInUserEmail(email) {
    localStorage.setItem('eshopLoggedIn', 'true');
    localStorage.setItem('eshopUserEmail', email.toLowerCase());
}

function clearLoggedInState() {
    localStorage.removeItem('eshopLoggedIn');
    localStorage.removeItem('eshopUserEmail');
}

// Add product to cart
function addToCart(product) {
    const cart = getCart();
    const existingItem = cart.find(item => item.name === product.name);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name: product.name,
            brand: product.brand || 'E-SHOP',
            price: parseFloat(product.price.replace(/[^0-9.]/g, '')),
            image: product.image,
            quantity: 1
        });
    }
    
    saveCart(cart);
    updateCartCount();
    showNotification('✅ Product added to cart!');
}

// Update cart count in header
function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Update all cart count elements
    const badges = document.querySelectorAll('#cartCount');
    badges.forEach(badge => {
        if (badge) badge.textContent = count;
    });
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #FF9900;
        color: white;
        padding: 14px 24px;
        border-radius: 8px;
        font-weight: bold;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2500);
}

function isUserLoggedIn() {
    return localStorage.getItem('eshopLoggedIn') === 'true';
}

function handleProductSelection(product) {
    addToCart(product);
}

function restoreSelectedProduct() {
    const saved = localStorage.getItem('eshopSelectedProduct');
    if (!saved) return;

    try {
        const product = JSON.parse(saved);
        if (product && product.name) {
            addToCart(product);
        }
    } catch (error) {
        console.warn('Failed to restore selected product:', error);
    }

    localStorage.removeItem('eshopSelectedProduct');
}

function highlightAllProducts() {
    const cards = document.querySelectorAll('.product-card, .deal-card');
    cards.forEach(card => card.classList.add('selected-product'));
}

function logoutUser() {
    localStorage.removeItem('eshopLoggedIn');
    window.location.href = 'index.html';
}

function updateHeaderAuthState() {
    const logoutLink = document.getElementById('logoutLink');
    if (!logoutLink) return;
    if (isUserLoggedIn()) {
        logoutLink.style.display = 'inline-block';
        logoutLink.addEventListener('click', function(event) {
            event.preventDefault();
            logoutUser();
        });
    } else {
        logoutLink.style.display = 'none';
    }
}

// Initialize cart count on page load
document.addEventListener('DOMContentLoaded', function() {
    restoreSelectedProduct();
    updateCartCount();
    highlightAllProducts();
    updateHeaderAuthState();
    loadProductsFromBackend();
});