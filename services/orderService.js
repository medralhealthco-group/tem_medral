const OrderModel = require('../models/orderModel');
const { validateCheckoutFields } = require('../utils/checkoutValidation');

class OrderService {
  static async createOrder({
    userId = null,
    sessionId = null,
    shippingData,
    paymentMethod = 'cod'
  }) {
    const result = validateCheckoutFields({
      ...shippingData,
      payment_method: paymentMethod
    });
    if (!result.ok) {
      const err = new Error(result.message);
      err.fieldErrors = result.errors;
      err.formData = result.formData;
      throw err;
    }

    return await OrderModel.createOrderFromCart({
      userId,
      sessionId,
      shippingData: {
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone,
        address: result.data.address,
        city: result.data.city,
        state: result.data.state,
        pincode: result.data.pincode
      },
      paymentMethod: result.data.payment_method
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
