const { pool } = require("../config/database");

class ProductModel {
  static async getProductsPaginated({ page = 1, limit = 10, search = "", categoryId = null, status = null, isFeatured = null }) {
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    let sql = `
      SELECT p.*, c.name as category_name, sc.name as subcategory_name, pi.image_url as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
      WHERE 1=1
    `;
    const params = [];

    if (categoryId) {
      sql += " AND p.category_id = ?";
      params.push(categoryId);
    }

    if (status) {
      sql += " AND p.status = ?";
      params.push(status);
    }

    if (isFeatured !== null && isFeatured !== undefined && isFeatured !== "") {
      sql += " AND p.is_featured = ?";
      params.push(isFeatured === "1" || isFeatured === true ? 1 : 0);
    }

    if (search && search.trim()) {
      sql += " AND (p.title LIKE ? OR p.sku LIKE ? OR p.brand LIKE ? OR p.short_description LIKE ?)";
      const pattern = `%${search.trim()}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    sql += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async getProductsCount({ search = "", categoryId = null, status = null, isFeatured = null } = {}) {
    let sql = "SELECT COUNT(*) as count FROM products p WHERE 1=1";
    const params = [];

    if (categoryId) {
      sql += " AND p.category_id = ?";
      params.push(categoryId);
    }

    if (status) {
      sql += " AND p.status = ?";
      params.push(status);
    }

    if (isFeatured !== null && isFeatured !== undefined && isFeatured !== "") {
      sql += " AND p.is_featured = ?";
      params.push(isFeatured === "1" || isFeatured === true ? 1 : 0);
    }

    if (search && search.trim()) {
      sql += " AND (p.title LIKE ? OR p.sku LIKE ? OR p.brand LIKE ? OR p.short_description LIKE ?)";
      const pattern = `%${search.trim()}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    const [rows] = await pool.query(sql, params);
    return rows[0] ? rows[0].count : 0;
  }

  static async getProductById(id) {
    const [rows] = await pool.query(
      `SELECT p.*, c.name as category_name, sc.name as subcategory_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
       WHERE p.id = ? LIMIT 1`,
      [id]
    );
    if (!rows[0]) return null;

    const product = rows[0];
    const [images] = await pool.query(
      "SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order ASC",
      [product.id]
    );
    product.images = images;
    return product;
  }

  static async getProductBySlug(slug) {
    const [rows] = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug, sc.name as subcategory_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
       WHERE p.slug = ? LIMIT 1`,
      [slug]
    );
    if (!rows[0]) return null;

    const product = rows[0];
    const [images] = await pool.query(
      "SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order ASC",
      [product.id]
    );
    product.images = images;
    product.primary_image = images[0] ? images[0].image_url : null;
    return product;
  }

  static async checkSKUExists(sku, excludeId = null) {
    let sql = "SELECT id FROM products WHERE sku = ?";
    const params = [sku];
    if (excludeId) {
      sql += " AND id != ?";
      params.push(excludeId);
    }
    const [rows] = await pool.query(sql, params);
    return rows.length > 0;
  }

  static async checkSlugExists(slug, excludeId = null) {
    let sql = "SELECT id FROM products WHERE slug = ?";
    const params = [slug];
    if (excludeId) {
      sql += " AND id != ?";
      params.push(excludeId);
    }
    const [rows] = await pool.query(sql, params);
    return rows.length > 0;
  }

  static async createProduct({
    category_id,
    subcategory_id,
    title,
    slug,
    sku,
    brand,
    short_description,
    full_description,
    price,
    sale_price,
    stock_quantity,
    status,
    is_featured
  }) {
    const [result] = await pool.query(
      `INSERT INTO products 
        (category_id, subcategory_id, title, slug, sku, brand, short_description, full_description, price, sale_price, stock_quantity, status, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id,
        subcategory_id || null,
        title,
        slug,
        sku,
        brand || "Medral Health",
        short_description || null,
        full_description || null,
        price || "0.00",
        sale_price || null,
        stock_quantity !== undefined ? parseInt(stock_quantity, 10) : 0,
        status || "draft",
        is_featured ? 1 : 0
      ]
    );
    return result.insertId;
  }

  static async updateProduct(id, {
    category_id,
    subcategory_id,
    title,
    slug,
    sku,
    brand,
    short_description,
    full_description,
    price,
    sale_price,
    stock_quantity,
    status,
    is_featured
  }) {
    await pool.query(
      `UPDATE products 
       SET category_id = ?, subcategory_id = ?, title = ?, slug = ?, sku = ?, brand = ?, 
           short_description = ?, full_description = ?, price = ?, sale_price = ?, 
           stock_quantity = ?, status = ?, is_featured = ?
       WHERE id = ?`,
      [
        category_id,
        subcategory_id || null,
        title,
        slug,
        sku,
        brand || "Medral Health",
        short_description || null,
        full_description || null,
        price || "0.00",
        sale_price || null,
        stock_quantity !== undefined ? parseInt(stock_quantity, 10) : 0,
        status || "draft",
        is_featured ? 1 : 0,
        id
      ]
    );
  }

  static async deleteProduct(id) {
    await pool.query("DELETE FROM products WHERE id = ?", [id]);
  }

  static async toggleProductStatus(id) {
    await pool.query(
      "UPDATE products SET status = IF(status = 'published', 'draft', 'published') WHERE id = ?",
      [id]
    );
  }

  // Gallery Image Operations
  static async addProductImage({ product_id, image_url, alt_text, display_order, is_primary }) {
    const [result] = await pool.query(
      "INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary) VALUES (?, ?, ?, ?, ?)",
      [product_id, image_url, alt_text || null, display_order || 0, is_primary ? 1 : 0]
    );
    return result.insertId;
  }

  static async getProductImageById(imageId) {
    const [rows] = await pool.query('SELECT * FROM product_images WHERE id = ? LIMIT 1', [imageId]);
    return rows[0] || null;
  }

  static async deleteProductImage(imageId) {
    const image = await this.getProductImageById(imageId);
    await pool.query('DELETE FROM product_images WHERE id = ?', [imageId]);
    return image;
  }

  // ---------------------------------------------------------------------------
  // Public Shop Query Methods (Published Products Only)
  // ---------------------------------------------------------------------------
  static async getShopProducts({ page = 1, limit = 12, search = "", categoryId = null, subcategoryId = null, minPrice = null, maxPrice = null, sort = "newest" } = {}) {
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    let sql = `
      SELECT p.*, c.name as category_name, c.slug as category_slug,
             sc.name as subcategory_name, sc.slug as subcategory_slug,
             pi.image_url as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
      WHERE p.status = 'published'
    `;
    const params = [];

    if (categoryId) {
      sql += " AND p.category_id = ?";
      params.push(categoryId);
    }

    if (subcategoryId) {
      sql += " AND p.subcategory_id = ?";
      params.push(subcategoryId);
    }

    if (minPrice !== null && minPrice !== "" && !isNaN(minPrice)) {
      sql += " AND p.price >= ?";
      params.push(parseFloat(minPrice));
    }

    if (maxPrice !== null && maxPrice !== "" && !isNaN(maxPrice)) {
      sql += " AND p.price <= ?";
      params.push(parseFloat(maxPrice));
    }

    if (search && search.trim()) {
      sql += " AND (p.title LIKE ? OR p.brand LIKE ? OR p.short_description LIKE ? OR p.full_description LIKE ? OR p.sku LIKE ?)";
      const pattern = `%${search.trim()}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    // Sorting
    if (sort === "price_asc") {
      sql += " ORDER BY p.price ASC";
    } else if (sort === "price_desc") {
      sql += " ORDER BY p.price DESC";
    } else if (sort === "title") {
      sql += " ORDER BY p.title ASC";
    } else {
      sql += " ORDER BY p.is_featured DESC, p.created_at DESC";
    }

    sql += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async getShopProductsCount({ search = "", categoryId = null, subcategoryId = null, minPrice = null, maxPrice = null } = {}) {
    let sql = "SELECT COUNT(*) as count FROM products p WHERE p.status = 'published'";
    const params = [];

    if (categoryId) {
      sql += " AND p.category_id = ?";
      params.push(categoryId);
    }

    if (subcategoryId) {
      sql += " AND p.subcategory_id = ?";
      params.push(subcategoryId);
    }

    if (minPrice !== null && minPrice !== "" && !isNaN(minPrice)) {
      sql += " AND p.price >= ?";
      params.push(parseFloat(minPrice));
    }

    if (maxPrice !== null && maxPrice !== "" && !isNaN(maxPrice)) {
      sql += " AND p.price <= ?";
      params.push(parseFloat(maxPrice));
    }

    if (search && search.trim()) {
      sql += " AND (p.title LIKE ? OR p.brand LIKE ? OR p.short_description LIKE ? OR p.full_description LIKE ? OR p.sku LIKE ?)";
      const pattern = `%${search.trim()}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    const [rows] = await pool.query(sql, params);
    return rows[0] ? rows[0].count : 0;
  }

  static async getShopPriceBoundaries(categoryId = null) {
    let sql = "SELECT MIN(price) as min_price, MAX(price) as max_price FROM products WHERE status = 'published'";
    const params = [];
    if (categoryId) {
      sql += " AND category_id = ?";
      params.push(categoryId);
    }
    const [rows] = await pool.query(sql, params);
    return rows[0] || { min_price: 0, max_price: 10000 };
  }

  static async getRelatedProducts({ categoryId, excludeId, limit = 4 }) {
    const [rows] = await pool.query(
      `SELECT p.*, c.name as category_name, pi.image_url as primary_image
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = 1
       WHERE p.category_id = ? AND p.id != ? AND p.status = 'published'
       ORDER BY p.is_featured DESC, p.created_at DESC
       LIMIT ?`,
      [categoryId, excludeId, parseInt(limit, 10)]
    );
    return rows;
  }
}

module.exports = ProductModel;
