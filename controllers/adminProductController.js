const CatalogService = require("../services/catalogService");
const { getSeoMetadata } = require("../utils/seoHelper");
const { cleanupUploadedFiles } = require("../middlewares/uploadMiddleware");

// List Products with Pagination, Filters, and Search
exports.listProducts = async (req, res) => {
  const seo = getSeoMetadata("Products | Medral Health Admin", "Manage catalog products for Medral Health store.", req);
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "10", 10);
  const search = (req.query.search || "").trim();
  const categoryId = req.query.category_id ? parseInt(req.query.category_id, 10) : null;
  const status = req.query.status || null;
  const isFeatured = req.query.is_featured || null;

  try {
    const products = await CatalogService.getAdminProductsPaginated({ page, limit, search, categoryId, status, isFeatured });
    const totalCount = await CatalogService.getAdminProductsCount({ search, categoryId, status, isFeatured });
    const categories = await CatalogService.getAllCategories(false);
    const totalPages = Math.ceil(totalCount / limit) || 1;

    res.render("admin/products/index", {
      seo,
      products,
      categories,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        search,
        categoryId,
        status,
        isFeatured
      },
      activePage: "products",
      currentAdmin: req.session.admin,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error("[ADMIN PRODUCT ERROR] listProducts:", error.message);
    res.status(500).render("admin/products/index", {
      seo,
      products: [],
      categories: [],
      pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1, search: "", categoryId: null, status: null, isFeatured: null },
      activePage: "products",
      currentAdmin: req.session.admin,
      success: null,
      error: "Error loading products database records."
    });
  }
};

// Render Create Product Form
exports.renderCreateForm = async (req, res) => {
  const seo = getSeoMetadata("Add Product | Medral Health Admin", "Manage catalog products for Medral Health store.", req);
  try {
    const categories = await CatalogService.getAllCategories(false);
    if (!categories || categories.length === 0) {
      return res.redirect("/admin/categories/create?error=" + encodeURIComponent("Please create a category first before adding products."));
    }

    res.render("admin/products/form", {
      seo,
      product: null,
      categories,
      subcategories: [],
      isEdit: false,
      activePage: "products",
      currentAdmin: req.session.admin,
      error: null
    });
  } catch (error) {
    console.error("[ADMIN PRODUCT ERROR] renderCreateForm:", error.message);
    res.redirect("/admin/products?error=" + encodeURIComponent("Error loading categories."));
  }
};

// Handle Product Creation
exports.handleCreate = async (req, res) => {
  const seo = getSeoMetadata("Add Product | Medral Health Admin", "Manage catalog products for Medral Health store.", req);
  const { category_id } = req.body;

  try {
    const title = req.body.title ? req.body.title.trim() : "";
    await CatalogService.createProduct(req.body, req.files);

    res.redirect("/admin/products?success=" + encodeURIComponent(`Product "${title}" created successfully.`));
  } catch (error) {
    cleanupUploadedFiles(req.files);
    const categories = await CatalogService.getAllCategories(false).catch(() => []);
    const subcategories = category_id ? await CatalogService.getSubcategoriesByCategoryId(category_id, false).catch(() => []) : [];

    return res.status(400).render("admin/products/form", {
      seo,
      product: req.body,
      categories,
      subcategories,
      isEdit: false,
      activePage: "products",
      currentAdmin: req.session.admin,
      error: error.message || "An unexpected error occurred while saving product."
    });
  }
};

// Render Edit Product Form
exports.renderEditForm = async (req, res) => {
  const seo = getSeoMetadata("Edit Product | Medral Health Admin", "Manage catalog products for Medral Health store.", req);
  const { id } = req.params;

  try {
    const product = await CatalogService.getProductById(id);
    if (!product) {
      return res.redirect("/admin/products?error=" + encodeURIComponent("Product not found."));
    }

    const categories = await CatalogService.getAllCategories(false);
    const subcategories = product.category_id ? await CatalogService.getSubcategoriesByCategoryId(product.category_id, false) : [];

    res.render("admin/products/form", {
      seo,
      product,
      categories,
      subcategories,
      isEdit: true,
      activePage: "products",
      currentAdmin: req.session.admin,
      error: null
    });
  } catch (error) {
    console.error("[ADMIN PRODUCT ERROR] renderEditForm:", error.message);
    res.redirect("/admin/products?error=" + encodeURIComponent("Error loading product."));
  }
};

// Handle Product Update
exports.handleEdit = async (req, res) => {
  const seo = getSeoMetadata("Edit Product | Medral Health Admin", "Manage catalog products for Medral Health store.", req);
  const { id } = req.params;
  const { category_id } = req.body;

  try {
    const product = await CatalogService.getProductById(id);
    if (!product) {
      return res.redirect("/admin/products?error=" + encodeURIComponent("Product not found."));
    }

    const title = req.body.title ? req.body.title.trim() : "";
    await CatalogService.updateProduct(id, req.body, req.files);

    res.redirect("/admin/products?success=" + encodeURIComponent(`Product "${title}" updated successfully.`));
  } catch (error) {
    cleanupUploadedFiles(req.files);
    const categories = await CatalogService.getAllCategories(false).catch(() => []);
    const subcategories = category_id ? await CatalogService.getSubcategoriesByCategoryId(category_id, false).catch(() => []) : [];

    return res.status(400).render("admin/products/form", {
      seo,
      product: { ...req.body, id },
      categories,
      subcategories,
      isEdit: true,
      activePage: "products",
      currentAdmin: req.session.admin,
      error: error.message || "An unexpected error occurred while updating product."
    });
  }
};

// Delete Product Image
exports.handleDeleteImage = async (req, res) => {
  const { imageId } = req.params;
  const productId = req.body.product_id;
  try {
    await CatalogService.deleteProductImage(imageId);
    res.redirect("/admin/products/edit/" + productId + "?success=" + encodeURIComponent("Image deleted successfully."));
  } catch (error) {
    console.error("[ADMIN PRODUCT ERROR] handleDeleteImage:", error.message);
    res.redirect("/admin/products/edit/" + productId + "?error=" + encodeURIComponent("Failed to delete image."));
  }
};

// Delete Product
exports.handleDelete = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await CatalogService.getProductById(id);
    if (!product) {
      return res.redirect("/admin/products?error=" + encodeURIComponent("Product not found."));
    }

    await CatalogService.deleteProduct(id);
    res.redirect("/admin/products?success=" + encodeURIComponent(`Product "${product.title}" deleted successfully.`));
  } catch (error) {
    console.error("[ADMIN PRODUCT ERROR] handleDelete:", error.message);
    res.redirect("/admin/products?error=" + encodeURIComponent("Failed to delete product."));
  }
};

// Quick Toggle Status (Draft <-> Published)
exports.handleToggleStatus = async (req, res) => {
  const { id } = req.params;
  try {
    await CatalogService.toggleProductStatus(id);
    res.redirect("/admin/products?success=" + encodeURIComponent("Product status updated successfully."));
  } catch (error) {
    console.error("[ADMIN PRODUCT ERROR] handleToggleStatus:", error.message);
    res.redirect("/admin/products?error=" + encodeURIComponent("Failed to update status."));
  }
};

// AJAX Helper: Get subcategories by Category ID
exports.getSubcategoriesByCategory = async (req, res) => {
  const { categoryId } = req.params;
  try {
    const subcategories = await CatalogService.getSubcategoriesByCategoryId(categoryId, false);
    res.json({ success: true, subcategories });
  } catch (error) {
    res.json({ success: false, subcategories: [] });
  }
};
