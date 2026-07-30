const OrderService = require("../services/orderService");
const { getSeoMetadata } = require("../utils/seoHelper");

// List Orders with Search, Status Filters, and Pagination
exports.listOrders = async (req, res) => {
  const seo = getSeoMetadata("Orders | Medral Health Admin", "Manage store orders for Medral Health.", req);
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "10", 10);
  const search = (req.query.search || "").trim();
  const orderStatus = req.query.order_status || null;
  const paymentStatus = req.query.payment_status || null;

  try {
    const orders = await OrderService.getAdminOrdersPaginated({ page, limit, search, orderStatus, paymentStatus });
    const totalCount = await OrderService.getAdminOrdersCount({ search, orderStatus, paymentStatus });
    const totalPages = Math.ceil(totalCount / limit) || 1;

    res.render("admin/orders/index", {
      seo,
      orders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        search,
        orderStatus,
        paymentStatus
      },
      activePage: "orders",
      currentAdmin: req.session.admin,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error("[ADMIN ORDER ERROR] listOrders:", error.message);
    res.status(500).render("admin/orders/index", {
      seo,
      orders: [],
      pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1, search: "", orderStatus: null, paymentStatus: null },
      activePage: "orders",
      currentAdmin: req.session.admin,
      success: null,
      error: "Error fetching orders."
    });
  }
};

// View Single Order Details Inspector
exports.viewOrderDetail = async (req, res) => {
  const { id } = req.params;
  const seo = getSeoMetadata("Order Details | Medral Health Admin", "Manage store orders for Medral Health.", req);

  try {
    const order = await OrderService.getOrderById(id);
    if (!order) {
      return res.redirect("/admin/orders?error=" + encodeURIComponent("Order not found."));
    }

    res.render("admin/orders/view", {
      seo,
      order,
      activePage: "orders",
      currentAdmin: req.session.admin,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error("[ADMIN ORDER ERROR] viewOrderDetail:", error.message);
    res.redirect("/admin/orders?error=" + encodeURIComponent("Error loading order details."));
  }
};

// Update Order Fulfillment Status
exports.handleUpdateStatus = async (req, res) => {
  const { id } = req.params;
  const { order_status } = req.body;

  try {
    const allowedStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
    if (!allowedStatuses.includes(order_status)) {
      return res.redirect(`/admin/orders/view/${id}?error=` + encodeURIComponent("Invalid status specified."));
    }

    await OrderService.updateOrderStatus(id, order_status);
    res.redirect(`/admin/orders/view/${id}?success=` + encodeURIComponent(`Order status updated to "${order_status.toUpperCase()}".`));
  } catch (error) {
    console.error("[ADMIN ORDER ERROR] handleUpdateStatus:", error.message);
    res.redirect(`/admin/orders/view/${id}?error=` + encodeURIComponent("Failed to update status."));
  }
};

// Update Order Payment Status
exports.handleUpdatePaymentStatus = async (req, res) => {
  const { id } = req.params;
  const { payment_status } = req.body;

  try {
    const allowedStatuses = ["pending", "paid", "failed"];
    if (!allowedStatuses.includes(payment_status)) {
      return res.redirect(`/admin/orders/view/${id}?error=` + encodeURIComponent("Invalid payment status."));
    }

    await OrderService.updatePaymentStatus(id, payment_status);
    res.redirect(`/admin/orders/view/${id}?success=` + encodeURIComponent(`Payment status updated to "${payment_status.toUpperCase()}".`));
  } catch (error) {
    console.error("[ADMIN ORDER ERROR] handleUpdatePaymentStatus:", error.message);
    res.redirect(`/admin/orders/view/${id}?error=` + encodeURIComponent("Failed to update payment status."));
  }
};
