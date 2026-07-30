const { pool } = require("../config/database");

class CategoryModel {
  // ---------------------------------------------------------------------------
  // Categories Query Methods
  // ---------------------------------------------------------------------------
  static async getAllCategories(onlyActive = true) {
    const sql = onlyActive
      ? "SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC, name ASC"
      : "SELECT * FROM categories ORDER BY display_order ASC, name ASC";
    const [rows] = await pool.query(sql);
    return rows;
  }

  static async getCategoriesPaginated({ page = 1, limit = 10, search = "" }) {
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    let sql = "SELECT * FROM categories";
    const params = [];

    if (search && search.trim()) {
      sql += " WHERE name LIKE ? OR description LIKE ?";
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern);
    }

    sql += " ORDER BY display_order ASC, created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async getCategoriesCount(search = "") {
    let sql = "SELECT COUNT(*) as count FROM categories";
    const params = [];

    if (search && search.trim()) {
      sql += " WHERE name LIKE ? OR description LIKE ?";
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern);
    }

    const [rows] = await pool.query(sql, params);
    return rows[0] ? rows[0].count : 0;
  }

  static async getCategoryBySlug(slug) {
    const [rows] = await pool.query("SELECT * FROM categories WHERE slug = ? LIMIT 1", [slug]);
    return rows[0] || null;
  }

  static async getCategoryById(id) {
    const [rows] = await pool.query("SELECT * FROM categories WHERE id = ? LIMIT 1", [id]);
    return rows[0] || null;
  }

  static async checkSlugExists(slug, excludeId = null) {
    let sql = "SELECT id FROM categories WHERE slug = ?";
    const params = [slug];
    if (excludeId) {
      sql += " AND id != ?";
      params.push(excludeId);
    }
    const [rows] = await pool.query(sql, params);
    return rows.length > 0;
  }

  static async createCategory({ name, slug, description, image_url, is_active, display_order }) {
    const [result] = await pool.query(
      "INSERT INTO categories (name, slug, description, image_url, is_active, display_order) VALUES (?, ?, ?, ?, ?, ?)",
      [name, slug, description || null, image_url || null, is_active !== undefined ? is_active : 1, display_order || 0]
    );
    return result.insertId;
  }

  static async updateCategory(id, { name, slug, description, image_url, is_active, display_order }) {
    await pool.query(
      "UPDATE categories SET name = ?, slug = ?, description = ?, image_url = ?, is_active = ?, display_order = ? WHERE id = ?",
      [name, slug, description || null, image_url || null, is_active ? 1 : 0, display_order || 0, id]
    );
  }

  static async deleteCategory(id) {
    await pool.query("DELETE FROM categories WHERE id = ?", [id]);
  }

  // ---------------------------------------------------------------------------
  // Subcategories Query Methods
  // ---------------------------------------------------------------------------
  static async getSubcategoriesByCategoryId(categoryId, onlyActive = true) {
    const sql = onlyActive
      ? "SELECT * FROM subcategories WHERE category_id = ? AND is_active = 1 ORDER BY display_order ASC, name ASC"
      : "SELECT * FROM subcategories WHERE category_id = ? ORDER BY display_order ASC, name ASC";
    const [rows] = await pool.query(sql, [categoryId]);
    return rows;
  }

  static async getSubcategoriesPaginated({ page = 1, limit = 10, search = "", categoryId = null }) {
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    let sql = `
      SELECT sc.*, c.name as category_name
      FROM subcategories sc
      JOIN categories c ON sc.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (categoryId) {
      sql += " AND sc.category_id = ?";
      params.push(categoryId);
    }

    if (search && search.trim()) {
      sql += " AND (sc.name LIKE ? OR sc.description LIKE ? OR c.name LIKE ?)";
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    sql += " ORDER BY c.name ASC, sc.display_order ASC, sc.name ASC LIMIT ? OFFSET ?";
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async getSubcategoriesCount({ search = "", categoryId = null } = {}) {
    let sql = `
      SELECT COUNT(*) as count
      FROM subcategories sc
      JOIN categories c ON sc.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (categoryId) {
      sql += " AND sc.category_id = ?";
      params.push(categoryId);
    }

    if (search && search.trim()) {
      sql += " AND (sc.name LIKE ? OR sc.description LIKE ? OR c.name LIKE ?)";
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const [rows] = await pool.query(sql, params);
    return rows[0] ? rows[0].count : 0;
  }

  static async getSubcategoryById(id) {
    const [rows] = await pool.query(
      `SELECT sc.*, c.name as category_name
       FROM subcategories sc
       JOIN categories c ON sc.category_id = c.id
       WHERE sc.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  static async getSubcategoryBySlug(slug) {
    const [rows] = await pool.query("SELECT * FROM subcategories WHERE slug = ? LIMIT 1", [slug]);
    return rows[0] || null;
  }

  static async checkSubcategorySlugExists(slug, excludeId = null) {
    let sql = "SELECT id FROM subcategories WHERE slug = ?";
    const params = [slug];
    if (excludeId) {
      sql += " AND id != ?";
      params.push(excludeId);
    }
    const [rows] = await pool.query(sql, params);
    return rows.length > 0;
  }

  static async createSubcategory({ category_id, name, slug, description, is_active, display_order }) {
    const [result] = await pool.query(
      "INSERT INTO subcategories (category_id, name, slug, description, is_active, display_order) VALUES (?, ?, ?, ?, ?, ?)",
      [category_id, name, slug, description || null, is_active !== undefined ? is_active : 1, display_order || 0]
    );
    return result.insertId;
  }

  static async updateSubcategory(id, { category_id, name, slug, description, is_active, display_order }) {
    await pool.query(
      "UPDATE subcategories SET category_id = ?, name = ?, slug = ?, description = ?, is_active = ?, display_order = ? WHERE id = ?",
      [category_id, name, slug, description || null, is_active ? 1 : 0, display_order || 0, id]
    );
  }

  static async deleteSubcategory(id) {
    await pool.query("DELETE FROM subcategories WHERE id = ?", [id]);
  }
}

module.exports = CategoryModel;
