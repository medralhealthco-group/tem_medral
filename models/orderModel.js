const { pool } = require("../config/database");
const CartModel = require("./cartModel");

class OrderModel {
  // Generate unique order number (e.g. MH-ORD-20260722-X49A)
  static generateOrderNumber() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MH-ORD-${dateStr}-${randomHex}`;
  }

  // Create Order from Cart (Atomic Transaction)
  static async createOrderFromCart({ userId = null, sessionId = null, shippingData, paymentMethod = "cod" }) {
    const {
      name,
      email,
      phone,
      address,
      city,
      state,
      pincode
    } = shippingData;

    if (!name || !email || !phone || !address || !city || !state || !pincode) {
      throw new Error("All shipping address fields are required.");
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Fetch current cart within transaction
      const cart = await CartModel.getCart({ userId, sessionId }, connection);
      if (!cart || !cart.items || cart.items.length === 0) {
        throw new Error("Your shopping cart is empty.");
      }

      // 2. Validate stock availability for all cart items (Batched Query to eliminate N+1 loop)
      const productIds = cart.items.map((item) => item.productId);
      const [products] = await connection.query(
        "SELECT id, title, stock_quantity, status FROM products WHERE id IN (?) FOR UPDATE",
        [productIds]
      );
      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const item of cart.items) {
        const product = productMap.get(item.productId);
        if (!product || product.status !== "published") {
          throw new Error(`Product "${item.title}" is no longer available.`);
        }
        if (product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for "${product.title}". Only ${product.stock_quantity} available.`);
        }
      }

      // 3. Generate unique order number
      let orderNumber = this.generateOrderNumber();
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 5) {
        const [existing] = await connection.query("SELECT id FROM orders WHERE order_number = ? LIMIT 1", [orderNumber]);
        if (existing.length === 0) {
          isUnique = true;
        } else {
          orderNumber = this.generateOrderNumber();
          attempts++;
        }
      }

      const subtotal = cart.subtotal;
      const shippingFee = 0.00; // Free shipping promo
      const grandTotal = subtotal + shippingFee;

      // 4. Insert Order Master Record
      const [orderResult] = await connection.query(
        `INSERT INTO orders 
          (order_number, user_id, shipping_name, shipping_email, shipping_phone, shipping_address, shipping_city, shipping_state, shipping_pincode, subtotal, shipping_fee, grand_total, payment_method, payment_status, order_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNumber,
          userId || null,
          name.trim(),
          email.trim().toLowerCase(),
          phone.trim(),
          address.trim(),
          city.trim(),
          state.trim(),
          pincode.trim(),
          subtotal,
          shippingFee,
          grandTotal,
          paymentMethod || "cod",
          "pending",
          "pending"
        ]
      );
      const orderId = orderResult.insertId;

      // 5. Insert Order Items & Deduct Product Stock
      for (const item of cart.items) {
        const lineTotalPrice = item.price * item.quantity;

        await connection.query(
          `INSERT INTO order_items (order_id, product_id, product_name, sku, unit_price, quantity, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.productId,
            item.title,
            item.sku,
            item.price,
            item.quantity,
            lineTotalPrice
          ]
        );

        // Deduct Stock Quantity
        await connection.query(
          "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
          [item.quantity, item.productId]
        );
      }

      // 6. Clear Cart Items
      await connection.query("DELETE FROM cart_items WHERE cart_id = ?", [cart.cartId]);

      await connection.commit();

      return {
        id: orderId,
        orderNumber,
        grandTotal,
        itemsCount: cart.totalItems
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Get Order By Order Number
  static async getOrderByNumber(orderNumber) {
    const [orders] = await pool.query("SELECT * FROM orders WHERE order_number = ? LIMIT 1", [orderNumber]);
    if (!orders[0]) return null;

    const order = orders[0];
    const [items] = await pool.query(
      `SELECT oi.*, p.slug, pi.image_url as primary_image
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
       WHERE oi.order_id = ?`,
      [order.id]
    );
    order.items = items;
    return order;
  }

  // Get Customer Orders History
  static async getCustomerOrders(userId) {
    const [orders] = await pool.query(
      `SELECT o.*, COUNT(oi.id) as items_count
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );
    return orders;
  }

  // Get Order Details by ID with optional User Check
  static async getOrderById(id, userId = null) {
    let sql = "SELECT * FROM orders WHERE id = ?";
    const params = [id];
    if (userId) {
      sql += " AND user_id = ?";
      params.push(userId);
    }
    const [orders] = await pool.query(sql, params);
    if (!orders[0]) return null;

    const order = orders[0];
    const [items] = await pool.query("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
    order.items = items;
    return order;
  }

  // ---------------------------------------------------------------------------
  // Admin Order Operations
  // ---------------------------------------------------------------------------
  static async getAdminOrdersPaginated({ page = 1, limit = 10, search = "", orderStatus = null, paymentStatus = null }) {
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    let sql = `
      SELECT o.*, COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    const params = [];

    if (orderStatus) {
      sql += " AND o.order_status = ?";
      params.push(orderStatus);
    }

    if (paymentStatus) {
      sql += " AND o.payment_status = ?";
      params.push(paymentStatus);
    }

    if (search && search.trim()) {
      sql += " AND (o.order_number LIKE ? OR o.shipping_name LIKE ? OR o.shipping_email LIKE ? OR o.shipping_phone LIKE ?)";
      const pattern = `%${search.trim()}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    sql += " GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async getAdminOrdersCount({ search = "", orderStatus = null, paymentStatus = null } = {}) {
    let sql = "SELECT COUNT(*) as count FROM orders o WHERE 1=1";
    const params = [];

    if (orderStatus) {
      sql += " AND o.order_status = ?";
      params.push(orderStatus);
    }

    if (paymentStatus) {
      sql += " AND o.payment_status = ?";
      params.push(paymentStatus);
    }

    if (search && search.trim()) {
      sql += " AND (o.order_number LIKE ? OR o.shipping_name LIKE ? OR o.shipping_email LIKE ? OR o.shipping_phone LIKE ?)";
      const pattern = `%${search.trim()}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    const [rows] = await pool.query(sql, params);
    return rows[0] ? rows[0].count : 0;
  }

  static async updateOrderStatus(id, orderStatus) {
    await pool.query("UPDATE orders SET order_status = ? WHERE id = ?", [orderStatus, id]);
  }

  static async updatePaymentStatus(id, paymentStatus) {
    await pool.query("UPDATE orders SET payment_status = ? WHERE id = ?", [paymentStatus, id]);
  }

  static async getAdminDashboardOrderStats() {
    const [rows] = await pool.query(`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(CASE WHEN order_status = 'pending' THEN 1 ELSE 0 END) as pendingOrders,
        SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) as deliveredOrders,
        COALESCE(SUM(grand_total), 0) as totalRevenue
      FROM orders
    `);
    return rows[0] || { totalOrders: 0, pendingOrders: 0, deliveredOrders: 0, totalRevenue: 0 };
  }
}

module.exports = OrderModel;
