const OrderModel = require('../models/orderModel');

class OrderService {
  static async createOrder({
    userId = null,
    sessionId = null,
    shippingData,
    paymentMethod = 'cod'
  }) {
    return await OrderModel.createOrderFromCart({
      userId,
      sessionId,
      shippingData,
      paymentMethod
    });
  }

  static async getOrderByNumber(orderNumber) {
    return await OrderModel.getOrderByNumber(orderNumber);
  }

  static async getOrderById(id, userId = null) {
    return await OrderModel.getOrderById(id, userId);
  }

  static async getCustomerOrders(userId) {
    return await OrderModel.getCustomerOrders(userId);
  }

  static async getAdminOrdersPaginated(options) {
    return await OrderModel.getAdminOrdersPaginated(options);
  }

  static async getAdminOrdersCount(options) {
    return await OrderModel.getAdminOrdersCount(options);
  }

  static async updateOrderStatus(id, orderStatus) {
    return await OrderModel.updateOrderStatus(id, orderStatus);
  }

  static async updatePaymentStatus(id, paymentStatus) {
    return await OrderModel.updatePaymentStatus(id, paymentStatus);
  }

  static async getAdminDashboardOrderStats() {
    return await OrderModel.getAdminDashboardOrderStats();
  }
}

module.exports = OrderService;
