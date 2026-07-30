const OrderService = require("../services/orderService");
const CartService = require("../services/cartService");
const { getSeoMetadata } = require("../utils/seoHelper");

// Render Checkout Form
exports.renderCheckout = async (req, res) => {
  const seo = getSeoMetadata("Checkout | Medral Health Co", "Complete your order securely.", req, {
    robots: "noindex, nofollow"
  });
  const userId = req.session.user ? req.session.user.id : null;
  const sessionId = req.sessionID;

  try {
    const cart = await CartService.getCart({ userId, sessionId });
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    const customerUser = req.session.user || {};

    res.render("checkout/index", {
      seo,
      cart,
      customerUser,
      error: null,
      formData: {
        name: customerUser.firstName ? `${customerUser.firstName} ${customerUser.lastName || ''}`.trim() : "",
        email: customerUser.email || "",
        phone: customerUser.phone || "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        payment_method: "cod"
      }
    });
  } catch (error) {
    console.error("[ORDER ERROR] renderCheckout:", error.message);
    res.redirect("/cart");
  }
};

// Handle Checkout Form Submission
exports.handleCheckout = async (req, res) => {
  const seo = getSeoMetadata("Checkout | Medral Health Co", "Complete your order securely.", req, {
    robots: "noindex, nofollow"
  });
  const userId = req.session.user ? req.session.user.id : null;
  const sessionId = req.sessionID;
  const { name, email, phone, address, city, state, pincode, payment_method } = req.body;
  const formData = { name, email, phone, address, city, state, pincode, payment_method };

  try {
    const cart = await CartService.getCart({ userId, sessionId });
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    if (!name || !email || !phone || !address || !city || !state || !pincode) {
      return res.status(400).render("checkout/index", {
        seo,
        cart,
        customerUser: req.session.user || {},
        error: "Please fill in all required shipping address fields.",
        formData
      });
    }

    const orderResult = await OrderService.createOrder({
      userId,
      sessionId,
      shippingData: { name, email, phone, address, city, state, pincode },
      paymentMethod: payment_method || "cod"
    });

    req.session.lastOrderNumber = orderResult.orderNumber;
    res.redirect(`/checkout/success/${orderResult.orderNumber}`);
  } catch (error) {
    console.error("[ORDER ERROR] handleCheckout:", error.message);
    const cart = await CartService.getCart({ userId, sessionId }).catch(() => ({ items: [], subtotal: 0 }));
    res.status(400).render("checkout/index", {
      seo,
      cart,
      customerUser: req.session.user || {},
      error: error.message || "An unexpected error occurred while placing your order.",
      formData
    });
  }
};

// Render Order Success Confirmation Receipt Page
exports.renderOrderSuccess = async (req, res) => {
  const { orderNumber } = req.params;
  const seo = getSeoMetadata(`Order #${orderNumber} Confirmed | Medral Health Co`, "Order confirmation receipt.", req, { robots: "noindex, nofollow" });

  try {
    const order = await OrderService.getOrderByNumber(orderNumber);
    if (!order) {
      return res.status(404).render("pages/faqs", {
        seo: { title: "Order Not Found | Medral Health Co", description: "Order receipt not found." }
      });
    }

    // Verify Session Ownership Security Authorization
    const isOwner = req.session.user && req.session.user.id === order.user_id;
    const isRecentCheckout = req.session.lastOrderNumber === order.order_number;
    const isAdmin = Boolean(req.session.admin);

    if (!isOwner && !isRecentCheckout && !isAdmin) {
      console.warn(`[SECURITY WARNING] Unauthorized order receipt access attempt for ${orderNumber} from IP ${req.ip}`);
      return res.status(403).render("pages/faqs", {
        seo: { title: "Access Denied | Medral Health Co", description: "Access denied to order receipt." },
        errorMsg: "Access denied. You do not have authorization to view this order receipt."
      });
    }

    res.render("checkout/success", {
      seo,
      order
    });
  } catch (error) {
    console.error("[ORDER ERROR] renderOrderSuccess:", error.message);
    res.redirect("/");
  }
};

// Render Customer Account Orders History
exports.renderCustomerOrders = async (req, res) => {
  const seo = getSeoMetadata("My Orders | Medral Health Co", "View your order history.", req, { robots: "noindex, nofollow" });
  const userId = req.session.user.id;

  try {
    const orders = await OrderService.getCustomerOrders(userId);
    res.render("account/orders", {
      seo,
      orders,
      user: req.session.user
    });
  } catch (error) {
    console.error("[ORDER ERROR] renderCustomerOrders:", error.message);
    res.render("account/orders", {
      seo,
      orders: [],
      user: req.session.user
    });
  }
};
