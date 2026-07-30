const CategoryModel = require('../models/categoryModel');
const ProductModel = require('../models/productModel');
const slugify = require('../utils/slugify');
const { deleteUploadByUrl } = require('../utils/uploadSecurity');
const { invalidateMegaMenuCache } = require('./megamenuService');

class CatalogService {
  // ---------------------------------------------------------------------------
  // Public Shop Catalog Methods
  // ---------------------------------------------------------------------------
  static async getShopCatalog(options) {
    const categories = await CategoryModel.getAllCategories(true);
    const products = await ProductModel.getShopProducts(options);
    const totalProducts = await ProductModel.getShopProductsCount(options);
    const priceRange = await ProductModel.getShopPriceBoundaries(
      options ? options.categoryId : null
    );

    return {
      categories,
      products,
      totalProducts,
      priceRange
    };
  }

  static async getCategoryBySlug(slug) {
    return await CategoryModel.getCategoryBySlug(slug);
  }

  static async getProductBySlug(slug) {
    const product = await ProductModel.getProductBySlug(slug);
    if (!product || product.status !== 'published') {
      return null;
    }
    const relatedProducts = await ProductModel.getRelatedProducts({
      categoryId: product.category_id,
      excludeId: product.id,
      limit: 4
    });
    return { product, relatedProducts };
  }

  // ---------------------------------------------------------------------------
  // Admin Category Operations
  // ---------------------------------------------------------------------------
  static async getAdminCategoriesPaginated(options) {
    return await CategoryModel.getCategoriesPaginated(options);
  }

  static async getAdminCategoriesCount(search) {
    return await CategoryModel.getCategoriesCount(search);
  }

  static async getCategoryById(id) {
    return await CategoryModel.getCategoryById(id);
  }

  static async createCategory({ name, description, image_url, display_order, is_active }) {
    if (!name || !name.trim()) {
      throw new Error('Category Name is required.');
    }
    const generatedSlug = slugify(name);
    const slugExists = await CategoryModel.checkSlugExists(generatedSlug);
    if (slugExists) {
      throw new Error(`A category with slug "${generatedSlug}" already exists.`);
    }

    const categoryId = await CategoryModel.createCategory({
      name: name.trim(),
      slug: generatedSlug,
      description: description ? description.trim() : null,
      image_url: image_url ? image_url.trim() : null,
      display_order: parseInt(display_order || '0', 10),
      is_active: is_active === '1' || is_active === true ? 1 : 0
    });
    invalidateMegaMenuCache();
    return categoryId;
  }

  static async updateCategory(id, { name, description, image_url, display_order, is_active }) {
    if (!name || !name.trim()) {
      throw new Error('Category Name is required.');
    }
    const generatedSlug = slugify(name);
    const slugExists = await CategoryModel.checkSlugExists(generatedSlug, id);
    if (slugExists) {
      throw new Error(`Another category with slug "${generatedSlug}" already exists.`);
    }

    await CategoryModel.updateCategory(id, {
      name: name.trim(),
      slug: generatedSlug,
      description: description ? description.trim() : null,
      image_url: image_url ? image_url.trim() : null,
      display_order: parseInt(display_order || '0', 10),
      is_active: is_active === '1' || is_active === true ? 1 : 0
    });
    invalidateMegaMenuCache();
  }

  static async deleteCategory(id) {
    await CategoryModel.deleteCategory(id);
    invalidateMegaMenuCache();
  }

  // ---------------------------------------------------------------------------
  // Admin Subcategory Operations
  // ---------------------------------------------------------------------------
  static async getAdminSubcategoriesPaginated(options) {
    return await CategoryModel.getSubcategoriesPaginated(options);
  }

  static async getAdminSubcategoriesCount(options) {
    return await CategoryModel.getSubcategoriesCount(options);
  }

  static async getSubcategoryById(id) {
    return await CategoryModel.getSubcategoryById(id);
  }

  static async getAllCategories(onlyActive = true) {
    return await CategoryModel.getAllCategories(onlyActive);
  }

  static async getSubcategoriesByCategoryId(categoryId, onlyActive = true) {
    return await CategoryModel.getSubcategoriesByCategoryId(categoryId, onlyActive);
  }

  static async createSubcategory({ category_id, name, description, display_order, is_active }) {
    if (!category_id || !name || !name.trim()) {
      throw new Error('Parent Category and Subcategory Name are required.');
    }
    const generatedSlug = slugify(name);
    const slugExists = await CategoryModel.checkSubcategorySlugExists(generatedSlug);
    if (slugExists) {
      throw new Error(`A subcategory with slug "${generatedSlug}" already exists.`);
    }

    return await CategoryModel.createSubcategory({
      category_id: parseInt(category_id, 10),
      name: name.trim(),
      slug: generatedSlug,
      description: description ? description.trim() : null,
      display_order: parseInt(display_order || '0', 10),
      is_active: is_active === '1' || is_active === true ? 1 : 0
    });
  }

  static async updateSubcategory(id, { category_id, name, description, display_order, is_active }) {
    if (!category_id || !name || !name.trim()) {
      throw new Error('Parent Category and Subcategory Name are required.');
    }
    const generatedSlug = slugify(name);
    const slugExists = await CategoryModel.checkSubcategorySlugExists(generatedSlug, id);
    if (slugExists) {
      throw new Error(`Another subcategory with slug "${generatedSlug}" already exists.`);
    }

    await CategoryModel.updateSubcategory(id, {
      category_id: parseInt(category_id, 10),
      name: name.trim(),
      slug: generatedSlug,
      description: description ? description.trim() : null,
      display_order: parseInt(display_order || '0', 10),
      is_active: is_active === '1' || is_active === true ? 1 : 0
    });
  }

  static async deleteSubcategory(id) {
    await CategoryModel.deleteSubcategory(id);
  }

  // ---------------------------------------------------------------------------
  // Admin Product Operations
  // ---------------------------------------------------------------------------
  static async getAdminProductsPaginated(options) {
    return await ProductModel.getProductsPaginated(options);
  }

  static async getAdminProductsCount(options) {
    return await ProductModel.getProductsCount(options);
  }

  static async getProductById(id) {
    return await ProductModel.getProductById(id);
  }

  static async createProduct(data, files = []) {
    const {
      category_id,
      subcategory_id,
      title,
      sku,
      brand,
      short_description,
      full_description,
      price,
      sale_price,
      stock_quantity,
      status,
      is_featured
    } = data;

    if (!category_id || !title || !sku || !price) {
      throw new Error('Category, Title, SKU, and Price are required.');
    }

    const cleanSKU = sku.trim().toUpperCase();
    const skuExists = await ProductModel.checkSKUExists(cleanSKU);
    if (skuExists) {
      throw new Error(`Product with SKU "${cleanSKU}" already exists.`);
    }

    const generatedSlug = slugify(title);
    const slugExists = await ProductModel.checkSlugExists(generatedSlug);
    if (slugExists) {
      throw new Error(`Product with title/slug "${generatedSlug}" already exists.`);
    }

    const productId = await ProductModel.createProduct({
      category_id: parseInt(category_id, 10),
      subcategory_id: subcategory_id ? parseInt(subcategory_id, 10) : null,
      title: title.trim(),
      slug: generatedSlug,
      sku: cleanSKU,
      brand: brand ? brand.trim() : 'Medral Health',
      short_description: short_description ? short_description.trim() : null,
      full_description: full_description ? full_description.trim() : null,
      price: parseFloat(price),
      sale_price: sale_price && !isNaN(sale_price) ? parseFloat(sale_price) : null,
      stock_quantity: parseInt(stock_quantity || '0', 10),
      status: status || 'draft',
      is_featured: is_featured === '1' || is_featured === true ? 1 : 0
    });

    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageUrl = `/uploads/${file.filename}`;
        await ProductModel.addProductImage({
          product_id: productId,
          image_url: imageUrl,
          alt_text: title.trim(),
          display_order: i,
          is_primary: i === 0 ? 1 : 0
        });
      }
    }

    invalidateMegaMenuCache();
    return productId;
  }

  static async updateProduct(id, data, files = []) {
    const {
      category_id,
      subcategory_id,
      title,
      sku,
      brand,
      short_description,
      full_description,
      price,
      sale_price,
      stock_quantity,
      status,
      is_featured
    } = data;

    if (!category_id || !title || !sku || !price) {
      throw new Error('Category, Title, SKU, and Price are required.');
    }

    const cleanSKU = sku.trim().toUpperCase();
    const skuExists = await ProductModel.checkSKUExists(cleanSKU, id);
    if (skuExists) {
      throw new Error(`Another product with SKU "${cleanSKU}" already exists.`);
    }

    const generatedSlug = slugify(title);
    const slugExists = await ProductModel.checkSlugExists(generatedSlug, id);
    if (slugExists) {
      throw new Error(`Another product with title/slug "${generatedSlug}" already exists.`);
    }

    await ProductModel.updateProduct(id, {
      category_id: parseInt(category_id, 10),
      subcategory_id: subcategory_id ? parseInt(subcategory_id, 10) : null,
      title: title.trim(),
      slug: generatedSlug,
      sku: cleanSKU,
      brand: brand ? brand.trim() : 'Medral Health',
      short_description: short_description ? short_description.trim() : null,
      full_description: full_description ? full_description.trim() : null,
      price: parseFloat(price),
      sale_price: sale_price && !isNaN(sale_price) ? parseFloat(sale_price) : null,
      stock_quantity: parseInt(stock_quantity || '0', 10),
      status: status || 'draft',
      is_featured: is_featured === '1' || is_featured === true ? 1 : 0
    });

    if (files && files.length > 0) {
      const existingProduct = await ProductModel.getProductById(id);
      const hasPrimary =
        existingProduct && existingProduct.images && existingProduct.images.length > 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageUrl = `/uploads/${file.filename}`;
        await ProductModel.addProductImage({
          product_id: id,
          image_url: imageUrl,
          alt_text: title.trim(),
          display_order: i,
          is_primary: !hasPrimary && i === 0 ? 1 : 0
        });
      }
    }

    invalidateMegaMenuCache();
  }

  static async deleteProduct(id) {
    const product = await ProductModel.getProductById(id);
    const images = (product && product.images) || [];
    await ProductModel.deleteProduct(id);
    for (const image of images) {
      deleteUploadByUrl(image.image_url);
    }
    invalidateMegaMenuCache();
  }

  static async toggleProductStatus(id) {
    await ProductModel.toggleProductStatus(id);
    invalidateMegaMenuCache();
  }

  static async deleteProductImage(imageId) {
    const image = await ProductModel.deleteProductImage(imageId);
    if (image) {
      deleteUploadByUrl(image.image_url);
    }
    invalidateMegaMenuCache();
  }
}

module.exports = CatalogService;
