const CartModel = require('../models/cartModel');

class CartService {
  static async getCart({ userId = null, sessionId = null }) {
    return await CartModel.getCart({ userId, sessionId });
  }

  static async addItem({ userId = null, sessionId = null, productId, quantity = 1 }) {
    return await CartModel.addItem({ userId, sessionId, productId, quantity });
  }

  static async updateItemQuantity({ userId = null, sessionId = null, itemId, quantity }) {
    return await CartModel.updateItemQuantity({ userId, sessionId, itemId, quantity });
  }

  static async removeItem({ userId = null, sessionId = null, itemId }) {
    return await CartModel.removeItem({ userId, sessionId, itemId });
  }

  static async clearCart({ userId = null, sessionId = null }) {
    return await CartModel.clearCart({ userId, sessionId });
  }

  static async mergeGuestCartToUser(sessionId, userId) {
    return await CartModel.mergeGuestCartToUser(sessionId, userId);
  }
}

module.exports = CartService;
