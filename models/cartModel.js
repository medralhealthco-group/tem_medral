const { pool } = require("../config/database");

class CartModel {
  static async getOrCreateCart({ userId = null, sessionId = null }, db = pool) {
    if (!userId && !sessionId) {
      throw new Error("Either userId or sessionId must be provided for cart lookup.");
    }

    if (userId) {
      const [userCarts] = await db.query("SELECT * FROM carts WHERE user_id = ? LIMIT 1", [userId]);
      if (userCarts[0]) return userCarts[0];
    } else if (sessionId) {
      const [sessionCarts] = await db.query("SELECT * FROM carts WHERE session_id = ? LIMIT 1", [sessionId]);
      if (sessionCarts[0]) return sessionCarts[0];
    }

    const [result] = await db.query(
      "INSERT INTO carts (user_id, session_id) VALUES (?, ?)",
      [userId || null, sessionId || null]
    );
    return { id: result.insertId, user_id: userId, session_id: sessionId };
  }

  static async getCart({ userId = null, sessionId = null }, db = pool) {
    const cart = await this.getOrCreateCart({ userId, sessionId }, db);

    const [items] = await db.query(
      `SELECT ci.id, ci.cart_id, ci.product_id, ci.quantity, ci.price_at_addition as unit_price,
              p.title, p.slug, p.sku, p.price as current_price, p.sale_price, p.stock_quantity, p.status,
              pi.image_url as primary_image
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
       WHERE ci.cart_id = ?
       ORDER BY ci.created_at ASC`,
      [cart.id]
    );

    let subtotal = 0;
    let totalItems = 0;

    const formattedItems = items.map((item) => {
      const activePrice = item.sale_price ? parseFloat(item.sale_price) : parseFloat(item.current_price);
      const lineTotal = activePrice * item.quantity;
      subtotal += lineTotal;
      totalItems += item.quantity;

      return {
        id: item.id,
        productId: item.product_id,
        title: item.title,
        slug: item.slug,
        sku: item.sku,
        price: activePrice,
        originalPrice: parseFloat(item.current_price),
        salePrice: item.sale_price ? parseFloat(item.sale_price) : null,
        primaryImage: item.primary_image || "/assets/images/medrallogo.png",
        quantity: item.quantity,
        stockQuantity: item.stock_quantity,
        status: item.status,
        lineTotal
      };
    });

    return {
      cartId: cart.id,
      items: formattedItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalItems
    };
  }

  static async addItem({ userId = null, sessionId = null, productId, quantity = 1 }) {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      throw new Error("Invalid quantity specified.");
    }

    // 1. Check Product existence and stock
    const [products] = await pool.query(
      "SELECT id, title, price, sale_price, stock_quantity, status FROM products WHERE id = ? LIMIT 1",
      [productId]
    );
    if (!products[0]) {
      throw new Error("Product not found.");
    }
    const product = products[0];
    if (product.status !== "published") {
      throw new Error("This product is currently unavailable.");
    }

    const cart = await this.getOrCreateCart({ userId, sessionId });

    // 2. Check if product already in cart
    const [existingItems] = await pool.query(
      "SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? LIMIT 1",
      [cart.id, productId]
    );

    const activeUnitPrice = product.sale_price ? parseFloat(product.sale_price) : parseFloat(product.price);
    let newQuantity = qty;

    if (existingItems[0]) {
      newQuantity = existingItems[0].quantity + qty;
      if (newQuantity > product.stock_quantity) {
        throw new Error(`Cannot add more. Maximum available stock is ${product.stock_quantity}.`);
      }
      await pool.query(
        "UPDATE cart_items SET quantity = ?, price_at_addition = ? WHERE id = ?",
        [newQuantity, activeUnitPrice, existingItems[0].id]
      );
    } else {
      if (newQuantity > product.stock_quantity) {
        throw new Error(`Cannot add. Maximum available stock is ${product.stock_quantity}.`);
      }
      await pool.query(
        "INSERT INTO cart_items (cart_id, product_id, quantity, price_at_addition) VALUES (?, ?, ?, ?)",
        [cart.id, productId, newQuantity, activeUnitPrice]
      );
    }

    return await this.getCart({ userId, sessionId });
  }

  static async updateItemQuantity({ userId = null, sessionId = null, itemId, quantity }) {
    const qty = parseInt(quantity, 10);
    const cart = await this.getOrCreateCart({ userId, sessionId });

    if (isNaN(qty) || qty <= 0) {
      return await this.removeItem({ userId, sessionId, itemId });
    }

    // Verify item belongs to user cart
    const [items] = await pool.query(
      `SELECT ci.id, ci.product_id, p.stock_quantity, p.price, p.sale_price 
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.id = ? AND ci.cart_id = ? LIMIT 1`,
      [itemId, cart.id]
    );

    if (!items[0]) {
      throw new Error("Cart item not found.");
    }

    const item = items[0];
    if (qty > item.stock_quantity) {
      throw new Error(`Requested quantity exceeds available stock (${item.stock_quantity}).`);
    }

    const activePrice = item.sale_price ? parseFloat(item.sale_price) : parseFloat(item.price);
    await pool.query(
      "UPDATE cart_items SET quantity = ?, price_at_addition = ? WHERE id = ?",
      [qty, activePrice, itemId]
    );

    return await this.getCart({ userId, sessionId });
  }

  static async removeItem({ userId = null, sessionId = null, itemId }) {
    const cart = await this.getOrCreateCart({ userId, sessionId });
    await pool.query("DELETE FROM cart_items WHERE id = ? AND cart_id = ?", [itemId, cart.id]);
    return await this.getCart({ userId, sessionId });
  }

  static async clearCart({ userId = null, sessionId = null }) {
    const cart = await this.getOrCreateCart({ userId, sessionId });
    await pool.query("DELETE FROM cart_items WHERE cart_id = ?", [cart.id]);
    return await this.getCart({ userId, sessionId });
  }

  // Merge Guest Cart into User Cart on Login (Atomic Database Transaction)
  static async mergeGuestCartToUser(sessionId, userId) {
    if (!sessionId || !userId) return;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [guestCarts] = await connection.query("SELECT id FROM carts WHERE session_id = ? LIMIT 1 FOR UPDATE", [sessionId]);
      if (!guestCarts[0]) {
        await connection.commit();
        return;
      }

      const guestCartId = guestCarts[0].id;
      
      let userCartId;
      const [userCarts] = await connection.query("SELECT id FROM carts WHERE user_id = ? LIMIT 1 FOR UPDATE", [userId]);
      if (userCarts[0]) {
        userCartId = userCarts[0].id;
      } else {
        const [createResult] = await connection.query("INSERT INTO carts (user_id) VALUES (?)", [userId]);
        userCartId = createResult.insertId;
      }

      const [guestItems] = await connection.query("SELECT * FROM cart_items WHERE cart_id = ?", [guestCartId]);
      if (!guestItems || guestItems.length === 0) {
        await connection.query("DELETE FROM carts WHERE id = ?", [guestCartId]);
        await connection.commit();
        return;
      }

      for (const item of guestItems) {
        const [userItems] = await connection.query(
          "SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? LIMIT 1",
          [userCartId, item.product_id]
        );

        // Check stock limit
        const [products] = await connection.query("SELECT stock_quantity FROM products WHERE id = ? LIMIT 1", [item.product_id]);
        const maxStock = products[0] ? products[0].stock_quantity : 99;

        if (userItems[0]) {
          const mergedQty = Math.min(userItems[0].quantity + item.quantity, maxStock);
          await connection.query(
            "UPDATE cart_items SET quantity = ?, price_at_addition = ? WHERE id = ?",
            [mergedQty, item.price_at_addition, userItems[0].id]
          );
        } else {
          const initialQty = Math.min(item.quantity, maxStock);
          await connection.query(
            "INSERT INTO cart_items (cart_id, product_id, quantity, price_at_addition) VALUES (?, ?, ?, ?)",
            [userCartId, item.product_id, initialQty, item.price_at_addition]
          );
        }
      }

      // Delete guest cart and items after merging
      await connection.query("DELETE FROM cart_items WHERE cart_id = ?", [guestCartId]);
      await connection.query("DELETE FROM carts WHERE id = ?", [guestCartId]);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error("[TRANSACTION ROLLBACK] Cart merge failed:", error.message);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = CartModel;
