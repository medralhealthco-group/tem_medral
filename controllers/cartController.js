const CartService = require("../services/cartService");
const { getSeoMetadata } = require("../utils/seoHelper");

function getCartParams(req) {
  const userId = req.session.user ? req.session.user.id : null;
  const sessionId = req.sessionID;
  return { userId, sessionId };
}

// Get Cart JSON API
exports.getCartJson = async (req, res) => {
  try {
    const { userId, sessionId } = getCartParams(req);
    const cart = await CartService.getCart({ userId, sessionId });
    res.json({ success: true, cart });
  } catch (error) {
    console.error("[CART ERROR] getCartJson:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch cart." });
  }
};

// Add Item to Cart
exports.addToCart = async (req, res) => {
  try {
    const { userId, sessionId } = getCartParams(req);
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required." });
    }

    const cart = await CartService.addItem({
      userId,
      sessionId,
      productId: parseInt(productId, 10),
      quantity: quantity ? parseInt(quantity, 10) : 1
    });

    res.json({
      success: true,
      message: "Product added to cart successfully.",
      cart
    });
  } catch (error) {
    console.error("[CART ERROR] addToCart:", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update Item Quantity
exports.updateQuantity = async (req, res) => {
  try {
    const { userId, sessionId } = getCartParams(req);
    const { itemId, quantity } = req.body;

    if (!itemId) {
      return res.status(400).json({ success: false, message: "Cart Item ID is required." });
    }

    const cart = await CartService.updateItemQuantity({
      userId,
      sessionId,
      itemId: parseInt(itemId, 10),
      quantity: parseInt(quantity, 10)
    });

    res.json({
      success: true,
      message: "Cart quantity updated.",
      cart
    });
  } catch (error) {
    console.error("[CART ERROR] updateQuantity:", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Remove Item from Cart
exports.removeItem = async (req, res) => {
  try {
    const { userId, sessionId } = getCartParams(req);
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ success: false, message: "Cart Item ID is required." });
    }

    const cart = await CartService.removeItem({
      userId,
      sessionId,
      itemId: parseInt(itemId, 10)
    });

    res.json({
      success: true,
      message: "Item removed from cart.",
      cart
    });
  } catch (error) {
    console.error("[CART ERROR] removeItem:", error.message);
    res.status(500).json({ success: false, message: "Failed to remove item from cart." });
  }
};

// Clear Cart
exports.clearCart = async (req, res) => {
  try {
    const { userId, sessionId } = getCartParams(req);
    const cart = await CartService.clearCart({ userId, sessionId });
    res.json({
      success: true,
      message: "Cart cleared.",
      cart
    });
  } catch (error) {
    console.error("[CART ERROR] clearCart:", error.message);
    res.status(500).json({ success: false, message: "Failed to clear cart." });
  }
};

// Render Full Cart Page
exports.renderCartPage = async (req, res) => {
  const seo = getSeoMetadata(
    "Shopping Cart | Medral Health Co",
    "View and manage items in your Medral Health shopping cart.",
    req,
    { robots: "noindex, nofollow" }
  );

  try {
    const { userId, sessionId } = getCartParams(req);
    const cart = await CartService.getCart({ userId, sessionId });

    res.render("cart/index", {
      seo,
      cart
    });
  } catch (error) {
    console.error("[CART ERROR] renderCartPage:", error.message);
    res.render("cart/index", {
      seo,
      cart: { cartId: null, items: [], subtotal: 0, totalItems: 0 }
    });
  }
};
