/**
 * Client-Side AJAX Cart Manager for Medral Health E-Commerce
 */

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bindCartToggleButtons() {
  document.querySelectorAll('[data-cart-toggle], .js-cart-toggle').forEach(el => {
    if (el.dataset.cartBound === '1') return;
    el.dataset.cartBound = '1';
    el.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
      event.preventDefault();
      toggleCartDrawer(true);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindCartToggleButtons();
  refreshCartUI();
});

async function refreshCartUI() {
  try {
    const res = await fetch('/cart/api', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin'
    });
    const data = await res.json();
    if (data.success && data.cart) {
      updateCartBadge(data.cart.totalItems || 0);
      renderMiniCartDrawer(data.cart);
    }
  } catch (err) {
    console.warn('[CART UI] Could not refresh cart data:', err.message);
  }
}

function updateCartBadge(count) {
  document.querySelectorAll('.js-cart-badge-count').forEach(el => {
    el.textContent = String(count);
    el.style.display = count > 0 ? 'inline-flex' : 'none';
  });
}

function toggleCartDrawer(show = null) {
  const drawer = document.getElementById('miniCartDrawer');
  const overlay = document.getElementById('miniCartOverlay');
  if (!drawer || !overlay) return;

  const isCurrentlyOpen = drawer.classList.contains('is-open');
  const shouldOpen = show !== null ? show : !isCurrentlyOpen;

  if (shouldOpen) {
    drawer.classList.add('is-open');
    overlay.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  } else {
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

function renderEmptyCart(container) {
  container.textContent = '';
  const wrap = document.createElement('div');
  wrap.className = 'mini-cart-empty';

  const p = document.createElement('p');
  p.style.cssText = 'margin-top:12px; font-weight:600; color:#555;';
  p.textContent = 'Your cart is currently empty.';

  const link = document.createElement('a');
  link.href = '/shop';
  link.className = 'btn-shop-now';
  link.textContent = 'Explore Products';
  link.style.cssText =
    'display:inline-block; margin-top:16px; padding:8px 18px; background: var(--color-primary); color: var(--color-surface); border-radius:6px; font-weight:700; text-decoration:none; font-size:13px;';
  link.addEventListener('click', () => toggleCartDrawer(false));

  wrap.appendChild(p);
  wrap.appendChild(link);
  container.appendChild(wrap);
}

function renderMiniCartDrawer(cart) {
  const container = document.getElementById('miniCartItemsContainer');
  const subtotalEl = document.getElementById('miniCartSubtotal');
  const totalCountHeader = document.getElementById('miniCartHeaderCount');

  if (totalCountHeader) {
    totalCountHeader.textContent = String(cart.totalItems || 0);
  }

  if (subtotalEl) {
    subtotalEl.textContent = `₹${parseFloat(cart.subtotal || 0).toFixed(2)}`;
  }

  if (!container) return;

  if (!cart.items || cart.items.length === 0) {
    renderEmptyCart(container);
    return;
  }

  container.textContent = '';

  cart.items.forEach(item => {
    const itemId = Number(item.id);
    const qty = Number(item.quantity);
    const row = document.createElement('div');
    row.className = 'mini-cart-item';

    const img = document.createElement('img');
    img.className = 'mini-cart-thumb';
    img.src = item.primaryImage || '/assets/images/medrallogo.png';
    img.alt = item.title || 'Product';
    img.onerror = function () {
      this.src = '/assets/images/medrallogo.png';
    };

    const details = document.createElement('div');
    details.className = 'mini-cart-details';

    const title = document.createElement('h4');
    title.className = 'mini-cart-title';
    const titleLink = document.createElement('a');
    titleLink.href = `/shop/product/${encodeURIComponent(String(item.slug || ''))}`;
    titleLink.textContent = item.title || 'Product';
    title.appendChild(titleLink);

    const priceRow = document.createElement('div');
    priceRow.className = 'mini-cart-price-row';

    const price = document.createElement('span');
    price.className = 'mini-cart-price';
    price.textContent = `₹${parseFloat(item.price || 0).toFixed(2)}`;

    const qtyCtrl = document.createElement('div');
    qtyCtrl.className = 'mini-cart-qty-ctrl';

    const decBtn = document.createElement('button');
    decBtn.type = 'button';
    decBtn.setAttribute('aria-label', 'Decrease quantity');
    decBtn.textContent = '-';
    decBtn.addEventListener('click', () => handleCartQtyUpdate(itemId, qty - 1));

    const qtyLabel = document.createElement('span');
    qtyLabel.textContent = String(qty);

    const incBtn = document.createElement('button');
    incBtn.type = 'button';
    incBtn.setAttribute('aria-label', 'Increase quantity');
    incBtn.textContent = '+';
    incBtn.addEventListener('click', () => handleCartQtyUpdate(itemId, qty + 1));

    qtyCtrl.appendChild(decBtn);
    qtyCtrl.appendChild(qtyLabel);
    qtyCtrl.appendChild(incBtn);
    priceRow.appendChild(price);
    priceRow.appendChild(qtyCtrl);
    details.appendChild(title);
    details.appendChild(priceRow);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'mini-cart-remove-btn';
    removeBtn.title = 'Remove Item';
    removeBtn.setAttribute('aria-label', 'Remove item');
    removeBtn.textContent = '\u00d7';
    removeBtn.addEventListener('click', () => handleCartRemoveItem(itemId));

    row.appendChild(img);
    row.appendChild(details);
    row.appendChild(removeBtn);
    container.appendChild(row);
  });
}

function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta && meta.getAttribute('content')) {
    return meta.getAttribute('content');
  }
  const input = document.querySelector('input[name="_csrf"]');
  if (input) {
    return input.value;
  }
  return '';
}

async function parseCartResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Unexpected response from cart API. Please refresh and try again.');
  }
  return res.json();
}

function cartRequestHeaders() {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-Token': getCsrfToken()
  };
}

async function addToCart(productId, quantity = 1, openDrawer = true) {
  try {
    const qty = parseInt(quantity, 10);
    const res = await fetch('/cart/add', {
      method: 'POST',
      headers: cartRequestHeaders(),
      credentials: 'same-origin',
      body: JSON.stringify({
        productId: parseInt(productId, 10),
        quantity: Number.isFinite(qty) && qty > 0 ? qty : 1
      })
    });
    const data = await parseCartResponse(res);

    if (data.success && data.cart) {
      updateCartBadge(data.cart.totalItems);
      renderMiniCartDrawer(data.cart);
      if (openDrawer) {
        toggleCartDrawer(true);
      }
      showToast('Added to cart successfully!');
    } else {
      alert(data.message || 'Failed to add product to cart.');
    }
  } catch (err) {
    console.error('[CART ERROR] addToCart:', err);
    alert(err.message || 'An error occurred while adding to cart.');
  }
}

async function handleCartQtyUpdate(itemId, newQty) {
  try {
    const res = await fetch('/cart/update', {
      method: 'POST',
      headers: cartRequestHeaders(),
      credentials: 'same-origin',
      body: JSON.stringify({
        itemId: parseInt(itemId, 10),
        quantity: parseInt(newQty, 10)
      })
    });
    const data = await parseCartResponse(res);

    if (data.success && data.cart) {
      updateCartBadge(data.cart.totalItems);
      renderMiniCartDrawer(data.cart);
      if (window.location.pathname === '/cart' || window.location.pathname === '/cart/') {
        window.location.reload();
      }
    } else {
      alert(data.message || 'Could not update quantity.');
    }
  } catch (err) {
    console.error('[CART ERROR] handleCartQtyUpdate:', err);
    alert(err.message || 'Could not update quantity.');
  }
}

async function handleCartRemoveItem(itemId) {
  try {
    const res = await fetch('/cart/remove', {
      method: 'POST',
      headers: cartRequestHeaders(),
      credentials: 'same-origin',
      body: JSON.stringify({ itemId: parseInt(itemId, 10) })
    });
    const data = await parseCartResponse(res);

    if (data.success && data.cart) {
      updateCartBadge(data.cart.totalItems);
      renderMiniCartDrawer(data.cart);
      if (window.location.pathname === '/cart' || window.location.pathname === '/cart/') {
        window.location.reload();
      }
    } else {
      alert(data.message || 'Could not remove item.');
    }
  } catch (err) {
    console.error('[CART ERROR] handleCartRemoveItem:', err);
    alert(err.message || 'Could not remove item.');
  }
}

async function handleCartClear() {
  if (!confirm('Are you sure you want to clear your cart?')) return;
  try {
    const res = await fetch('/cart/clear', {
      method: 'POST',
      headers: cartRequestHeaders(),
      credentials: 'same-origin',
      body: JSON.stringify({})
    });
    const data = await parseCartResponse(res);
    if (data.success && data.cart) {
      updateCartBadge(0);
      renderMiniCartDrawer(data.cart);
      if (window.location.pathname === '/cart' || window.location.pathname === '/cart/') {
        window.location.reload();
      }
    } else {
      alert(data.message || 'Could not clear cart.');
    }
  } catch (err) {
    console.error('[CART ERROR] handleCartClear:', err);
    alert(err.message || 'Could not clear cart.');
  }
}

function showToast(msg) {
  let toast = document.getElementById('cartToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cartToast';
    toast.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      background: var(--color-primary); color: var(--color-surface); padding: 12px 20px;
      border-radius: 8px; font-weight: 700; font-size: 14px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2); transition: opacity 0.3s;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 2500);
}

function initCartPageHandlers() {
  const layout = document.querySelector('.cart-layout');
  if (!layout) return;

  layout.addEventListener('click', (event) => {
    const decBtn = event.target.closest('.cart-qty-dec');
    if (decBtn) {
      handleCartQtyUpdate(Number(decBtn.dataset.itemId), Number(decBtn.dataset.qty) - 1);
      return;
    }

    const incBtn = event.target.closest('.cart-qty-inc');
    if (incBtn) {
      handleCartQtyUpdate(Number(incBtn.dataset.itemId), Number(incBtn.dataset.qty) + 1);
      return;
    }

    const removeBtn = event.target.closest('.cart-del-btn[data-item-id]');
    if (removeBtn) {
      handleCartRemoveItem(Number(removeBtn.dataset.itemId));
      return;
    }

    if (event.target.closest('.cart-clear-btn')) {
      handleCartClear();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCartPageHandlers);
} else {
  initCartPageHandlers();
}

// escapeHtml kept for any future string sinks; DOM rendering is preferred
window.escapeHtml = escapeHtml;
window.addToCart = addToCart;
window.handleCartQtyUpdate = handleCartQtyUpdate;
window.handleCartRemoveItem = handleCartRemoveItem;
window.handleCartClear = handleCartClear;
window.toggleCartDrawer = toggleCartDrawer;
window.refreshCartUI = refreshCartUI;
