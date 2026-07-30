const CatalogService = require("../services/catalogService");
const OrderService = require("../services/orderService");
const UserModel = require("../models/userModel");
const { getSeoMetadata } = require("../utils/seoHelper");

// Render Admin Dashboard
exports.renderDashboard = async (req, res) => {
  const seo = getSeoMetadata("Dashboard | Medral Health Admin", "Medral Health Administration Dashboard", req);

  let totalCategories = 0;
  let totalSubcategories = 0;
  let totalProducts = 0;
  let totalCustomers = 0;
  let orderStats = { totalOrders: 0, pendingOrders: 0, deliveredOrders: 0, totalRevenue: 0 };

  try {
    totalCategories = await CatalogService.getAdminCategoriesCount();
    totalSubcategories = await CatalogService.getAdminSubcategoriesCount();
    totalProducts = await CatalogService.getAdminProductsCount();
    totalCustomers = await UserModel.countCustomers();
    orderStats = await OrderService.getAdminDashboardOrderStats();
  } catch (err) {
    console.warn("[ADMIN DASHBOARD] Could not fetch dashboard metrics:", err.message);
  }

  const stats = {
    totalProducts,
    totalCategories,
    totalSubcategories,
    totalOrders: orderStats.totalOrders,
    pendingOrders: orderStats.pendingOrders,
    totalRevenue: parseFloat(orderStats.totalRevenue || 0).toFixed(2),
    totalCustomers
  };

  res.render("admin/dashboard", {
    seo,
    stats,
    activePage: "dashboard",
    currentAdmin: req.session.admin
  });
};
