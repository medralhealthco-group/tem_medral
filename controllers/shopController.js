const CatalogService = require("../services/catalogService");
const { getSeoMetadata } = require("../utils/seoHelper");

// Render Main Shop Page
exports.renderShop = async (req, res) => {
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "12", 10);
  const search = (req.query.search || "").trim();
  const categoryId = req.query.category_id ? parseInt(req.query.category_id, 10) : null;
  const subcategoryId = req.query.subcategory_id ? parseInt(req.query.subcategory_id, 10) : null;
  const minPrice = req.query.min_price || null;
  const maxPrice = req.query.max_price || null;
  const sort = req.query.sort || "newest";

  try {
    const catalog = await CatalogService.getShopCatalog({
      page,
      limit,
      search,
      categoryId,
      subcategoryId,
      minPrice,
      maxPrice,
      sort
    });

    const subcategories = categoryId ? await CatalogService.getSubcategoriesByCategoryId(categoryId, true) : [];
    const totalPages = Math.ceil(catalog.totalProducts / limit) || 1;
    const seo = getSeoMetadata("Our Shop | Medral Health Co", "Browse premium sports nutrition, supplements, and wellness catalog.", req);

    res.render("shop/index", {
      seo,
      products: catalog.products,
      categories: catalog.categories,
      subcategories,
      selectedCategory: null,
      priceBounds: catalog.priceRange,
      pagination: {
        page,
        limit,
        totalCount: catalog.totalProducts,
        totalPages,
        search,
        categoryId,
        subcategoryId,
        minPrice,
        maxPrice,
        sort
      }
    });
  } catch (error) {
    console.error("[SHOP ERROR] renderShop:", error.message);
    const seo = getSeoMetadata("Our Shop | Medral Health Co", "Browse premium products.", req);
    res.status(500).render("shop/index", {
      seo,
      products: [],
      categories: [],
      subcategories: [],
      selectedCategory: null,
      priceBounds: { min_price: 0, max_price: 10000 },
      pagination: { page: 1, limit: 12, totalCount: 0, totalPages: 1, search: "", categoryId: null, subcategoryId: null, minPrice: null, maxPrice: null, sort: "newest" }
    });
  }
};

// Render Category Specific Shop Page
exports.renderCategoryShop = async (req, res) => {
  const { slug } = req.params;
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "12", 10);
  const search = (req.query.search || "").trim();
  const subcategoryId = req.query.subcategory_id ? parseInt(req.query.subcategory_id, 10) : null;
  const minPrice = req.query.min_price || null;
  const maxPrice = req.query.max_price || null;
  const sort = req.query.sort || "newest";

  try {
    const selectedCategory = await CatalogService.getCategoryBySlug(slug);
    if (!selectedCategory || !selectedCategory.is_active) {
      return res.status(404).render("pages/faqs", {
        seo: getSeoMetadata("Category Not Found | Medral Health Co", "Category not found", req)
      });
    }

    const catalog = await CatalogService.getShopCatalog({
      page,
      limit,
      search,
      categoryId: selectedCategory.id,
      subcategoryId,
      minPrice,
      maxPrice,
      sort
    });

    const subcategories = await CatalogService.getSubcategoriesByCategoryId(selectedCategory.id, true);
    const totalPages = Math.ceil(catalog.totalProducts / limit) || 1;

    const seo = getSeoMetadata(
      `${selectedCategory.name} | Medral Health Shop`,
      selectedCategory.description || `Browse ${selectedCategory.name} products at Medral Health.`,
      req
    );

    res.render("shop/category", {
      seo,
      products: catalog.products,
      categories: catalog.categories,
      subcategories,
      selectedCategory,
      priceBounds: catalog.priceRange,
      pagination: {
        page,
        limit,
        totalCount: catalog.totalProducts,
        totalPages,
        search,
        categoryId: selectedCategory.id,
        subcategoryId,
        minPrice,
        maxPrice,
        sort
      }
    });
  } catch (error) {
    console.error("[SHOP ERROR] renderCategoryShop:", error.message);
    res.redirect("/shop");
  }
};

// Render Product Detail Page
exports.renderProductDetail = async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await CatalogService.getProductBySlug(slug);
    if (!result) {
      return res.status(404).render("pages/faqs", {
        seo: getSeoMetadata("Product Not Found | Medral Health Co", "The requested product could not be found.", req)
      });
    }

    const { product, relatedProducts } = result;
    const ogImage =
      product.primary_image ||
      (product.images && product.images[0] && product.images[0].image_url) ||
      null;
    const seo = getSeoMetadata(
      `${product.title} | Medral Health Co`,
      product.short_description || `Buy ${product.title} online at Medral Health. Premium formulation.`,
      req,
      { type: "product", image: ogImage || undefined }
    );

    res.render("shop/product-detail", {
      seo,
      product,
      relatedProducts
    });
  } catch (error) {
    console.error("[SHOP ERROR] renderProductDetail:", error.message);
    res.redirect("/shop");
  }
};

// Instant AJAX Live Search Endpoint
exports.apiLiveSearch = async (req, res) => {
  const query = (req.query.q || "").trim();
  if (!query || query.length < 2) {
    return res.json({ success: true, results: [] });
  }

  try {
    const catalog = await CatalogService.getShopCatalog({
      page: 1,
      limit: 6,
      search: query,
      sort: "newest"
    });

    const results = catalog.products.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      price: parseFloat(p.price).toFixed(2),
      salePrice: p.sale_price ? parseFloat(p.sale_price).toFixed(2) : null,
      primaryImage: p.primary_image || "/assets/images/medrallogo.png",
      categoryName: p.category_name
    }));

    return res.json({ success: true, results });
  } catch (error) {
    console.error("[SHOP ERROR] apiLiveSearch:", error.message);
    return res.status(500).json({ success: false, results: [] });
  }
};
