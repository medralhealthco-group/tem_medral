const CatalogService = require("../services/catalogService");
const { getSeoMetadata } = require("../utils/seoHelper");

// List Subcategories with Pagination, Category Filter, and Search
exports.listSubcategories = async (req, res) => {
  const seo = getSeoMetadata("Subcategories | Medral Health Admin", "Manage product subcategories for Medral Health store.", req);
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "10", 10);
  const search = (req.query.search || "").trim();
  const categoryId = req.query.category_id ? parseInt(req.query.category_id, 10) : null;

  try {
    const subcategories = await CatalogService.getAdminSubcategoriesPaginated({ page, limit, search, categoryId });
    const totalCount = await CatalogService.getAdminSubcategoriesCount({ search, categoryId });
    const categories = await CatalogService.getAllCategories(false);
    const totalPages = Math.ceil(totalCount / limit) || 1;

    res.render("admin/subcategories/index", {
      seo,
      subcategories,
      categories,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        search,
        categoryId
      },
      activePage: "subcategories",
      currentAdmin: req.session.admin,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error("[ADMIN SUBCATEGORY ERROR] listSubcategories:", error.message);
    res.status(500).render("admin/subcategories/index", {
      seo,
      subcategories: [],
      categories: [],
      pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1, search: "", categoryId: null },
      activePage: "subcategories",
      currentAdmin: req.session.admin,
      success: null,
      error: "Error loading subcategories database records."
    });
  }
};

// Render Create Subcategory Form
exports.renderCreateForm = async (req, res) => {
  const seo = getSeoMetadata("Add Subcategory | Medral Health Admin", "Manage product subcategories for Medral Health store.", req);
  try {
    const categories = await CatalogService.getAllCategories(false);
    if (!categories || categories.length === 0) {
      return res.redirect("/admin/categories/create?error=" + encodeURIComponent("Please create a category first before adding subcategories."));
    }

    res.render("admin/subcategories/form", {
      seo,
      subcategory: null,
      categories,
      isEdit: false,
      activePage: "subcategories",
      currentAdmin: req.session.admin,
      error: null
    });
  } catch (error) {
    console.error("[ADMIN SUBCATEGORY ERROR] renderCreateForm:", error.message);
    res.redirect("/admin/subcategories?error=" + encodeURIComponent("Error loading categories."));
  }
};

// Handle Subcategory Creation
exports.handleCreate = async (req, res) => {
  const seo = getSeoMetadata("Add Subcategory | Medral Health Admin", "Manage product subcategories for Medral Health store.", req);
  const { category_id, name, slug, description, is_active, display_order } = req.body;

  try {
    const categories = await CatalogService.getAllCategories(false);

    await CatalogService.createSubcategory({
      category_id,
      name,
      description,
      display_order,
      is_active
    });

    res.redirect("/admin/subcategories?success=" + encodeURIComponent("Subcategory created successfully."));
  } catch (error) {
    const categories = await CatalogService.getAllCategories(false).catch(() => []);
    return res.status(400).render("admin/subcategories/form", {
      seo,
      subcategory: { category_id, name, slug, description, is_active, display_order },
      categories,
      isEdit: false,
      activePage: "subcategories",
      currentAdmin: req.session.admin,
      error: error.message || "An unexpected error occurred while saving subcategory."
    });
  }
};

// Render Edit Subcategory Form
exports.renderEditForm = async (req, res) => {
  const seo = getSeoMetadata("Edit Subcategory | Medral Health Admin", "Manage product subcategories for Medral Health store.", req);
  const { id } = req.params;

  try {
    const subcategory = await CatalogService.getSubcategoryById(id);
    if (!subcategory) {
      return res.redirect("/admin/subcategories?error=" + encodeURIComponent("Subcategory not found."));
    }

    const categories = await CatalogService.getAllCategories(false);

    res.render("admin/subcategories/form", {
      seo,
      subcategory,
      categories,
      isEdit: true,
      activePage: "subcategories",
      currentAdmin: req.session.admin,
      error: null
    });
  } catch (error) {
    console.error("[ADMIN SUBCATEGORY ERROR] renderEditForm:", error.message);
    res.redirect("/admin/subcategories?error=" + encodeURIComponent("Error loading subcategory."));
  }
};

// Handle Subcategory Update
exports.handleEdit = async (req, res) => {
  const seo = getSeoMetadata("Edit Subcategory | Medral Health Admin", "Manage product subcategories for Medral Health store.", req);
  const { id } = req.params;
  const { category_id, name, slug, description, is_active, display_order } = req.body;

  try {
    const subcategory = await CatalogService.getSubcategoryById(id);
    if (!subcategory) {
      return res.redirect("/admin/subcategories?error=" + encodeURIComponent("Subcategory not found."));
    }

    await CatalogService.updateSubcategory(id, {
      category_id,
      name,
      description,
      display_order,
      is_active
    });

    res.redirect("/admin/subcategories?success=" + encodeURIComponent("Subcategory updated successfully."));
  } catch (error) {
    const categories = await CatalogService.getAllCategories(false).catch(() => []);
    return res.status(400).render("admin/subcategories/form", {
      seo,
      subcategory: { id, category_id, name, slug, description, is_active, display_order },
      categories,
      isEdit: true,
      activePage: "subcategories",
      currentAdmin: req.session.admin,
      error: error.message || "An unexpected error occurred while updating subcategory."
    });
  }
};

// Handle Subcategory Deletion
exports.handleDelete = async (req, res) => {
  const { id } = req.params;
  try {
    const subcategory = await CatalogService.getSubcategoryById(id);
    if (!subcategory) {
      return res.redirect("/admin/subcategories?error=" + encodeURIComponent("Subcategory not found."));
    }

    await CatalogService.deleteSubcategory(id);
    res.redirect("/admin/subcategories?success=" + encodeURIComponent(`Subcategory "${subcategory.name}" deleted successfully.`));
  } catch (error) {
    console.error("[ADMIN SUBCATEGORY ERROR] handleDelete:", error.message);
    res.redirect("/admin/subcategories?error=" + encodeURIComponent("Cannot delete subcategory. It may have linked products."));
  }
};
