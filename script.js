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
    if (!isUserLoggedIn()) {
        localStorage.setItem('eshopSelectedProduct', JSON.stringify(product));
        window.location.href = 'loginpage.html';
        return;
    }
    addToCart(product);
}

function restoreSelectedProduct() {
    if (!isUserLoggedIn()) return;
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
    window.location.href = 'home.html';
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
});