const CatalogService = require("../services/catalogService");
const { getSeoMetadata } = require("../utils/seoHelper");

// List Categories with Pagination and Search
exports.listCategories = async (req, res) => {
  const seo = getSeoMetadata("Categories | Medral Health Admin", "Manage product categories for Medral Health store.", req);
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "10", 10);
  const search = (req.query.search || "").trim();

  try {
    const categories = await CatalogService.getAdminCategoriesPaginated({ page, limit, search });
    const totalCount = await CatalogService.getAdminCategoriesCount(search);
    const totalPages = Math.ceil(totalCount / limit) || 1;

    res.render("admin/categories/index", {
      seo,
      categories,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        search
      },
      activePage: "categories",
      currentAdmin: req.session.admin,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error("[ADMIN CATEGORY ERROR] listCategories:", error.message);
    res.status(500).render("admin/categories/index", {
      seo,
      categories: [],
      pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1, search: "" },
      activePage: "categories",
      currentAdmin: req.session.admin,
      success: null,
      error: "Error loading categories database records."
    });
  }
};

// Render Create Category Form
exports.renderCreateForm = (req, res) => {
  const seo = getSeoMetadata("Add Category | Medral Health Admin", "Manage product categories for Medral Health store.", req);
  res.render("admin/categories/form", {
    seo,
    category: null,
    isEdit: false,
    activePage: "categories",
    currentAdmin: req.session.admin,
    error: null
  });
};

// Handle Category Creation
exports.handleCreate = async (req, res) => {
  const seo = getSeoMetadata("Add Category | Medral Health Admin", "Manage product categories for Medral Health store.", req);
  const { name, slug, description, image_url, is_active, display_order } = req.body;

  try {
    await CatalogService.createCategory({
      name,
      description,
      image_url,
      display_order,
      is_active
    });

    res.redirect("/admin/categories?success=" + encodeURIComponent("Category created successfully."));
  } catch (error) {
    return res.status(400).render("admin/categories/form", {
      seo,
      category: { name, slug, description, image_url, is_active, display_order },
      isEdit: false,
      activePage: "categories",
      currentAdmin: req.session.admin,
      error: error.message || "An unexpected error occurred while saving category."
    });
  }
};

// Render Edit Category Form
exports.renderEditForm = async (req, res) => {
  const seo = getSeoMetadata("Edit Category | Medral Health Admin", "Manage product categories for Medral Health store.", req);
  const { id } = req.params;

  try {
    const category = await CatalogService.getCategoryById(id);
    if (!category) {
      return res.redirect("/admin/categories?error=" + encodeURIComponent("Category not found."));
    }

    res.render("admin/categories/form", {
      seo,
      category,
      isEdit: true,
      activePage: "categories",
      currentAdmin: req.session.admin,
      error: null
    });
  } catch (error) {
    console.error("[ADMIN CATEGORY ERROR] renderEditForm:", error.message);
    res.redirect("/admin/categories?error=" + encodeURIComponent("Error loading category."));
  }
};

// Handle Category Update
exports.handleEdit = async (req, res) => {
  const seo = getSeoMetadata("Edit Category | Medral Health Admin", "Manage product categories for Medral Health store.", req);
  const { id } = req.params;
  const { name, slug, description, image_url, is_active, display_order } = req.body;

  try {
    await CatalogService.updateCategory(id, {
      name,
      description,
      image_url,
      display_order,
      is_active
    });

    res.redirect("/admin/categories?success=" + encodeURIComponent("Category updated successfully."));
  } catch (error) {
    return res.status(400).render("admin/categories/form", {
      seo,
      category: { id, name, slug, description, image_url, is_active, display_order },
      isEdit: true,
      activePage: "categories",
      currentAdmin: req.session.admin,
      error: error.message || "An unexpected error occurred while updating category."
    });
  }
};

// Handle Category Deletion
exports.handleDelete = async (req, res) => {
  const { id } = req.params;
  try {
    const category = await CatalogService.getCategoryById(id);
    if (!category) {
      return res.redirect("/admin/categories?error=" + encodeURIComponent("Category not found."));
    }

    await CatalogService.deleteCategory(id);
    res.redirect("/admin/categories?success=" + encodeURIComponent(`Category "${category.name}" deleted successfully.`));
  } catch (error) {
    console.error("[ADMIN CATEGORY ERROR] handleDelete:", error.message);
    res.redirect("/admin/categories?error=" + encodeURIComponent("Cannot delete category. It may have linked subcategories or products."));
  }
};
