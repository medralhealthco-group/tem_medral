const express = require("express");
const router = express.Router();
const adminProductController = require("../controllers/adminProductController");
const { requireAdminAuth } = require("../middlewares/authMiddleware");
const { uploadProductImages } = require("../middlewares/uploadMiddleware");
const { csrfAfterMultipart } = require("../middlewares/securityMiddleware");

// All product administration routes require admin authentication
router.use(requireAdminAuth);

// AJAX helper route for fetching subcategories dynamically
router.get("/api/subcategories/:categoryId", adminProductController.getSubcategoriesByCategory);

// Product List & Search
router.get("/", adminProductController.listProducts);

// Product Create (multipart: CSRF validated after multer parses body fields)
router.get("/create", adminProductController.renderCreateForm);
router.post("/create", ...uploadProductImages, csrfAfterMultipart, adminProductController.handleCreate);

// Product Edit
router.get("/edit/:id", adminProductController.renderEditForm);
router.post("/edit/:id", ...uploadProductImages, csrfAfterMultipart, adminProductController.handleEdit);

// Delete Image
router.post("/delete-image/:imageId", adminProductController.handleDeleteImage);

// Toggle Status (Draft / Published)
router.post("/toggle-status/:id", adminProductController.handleToggleStatus);

// Product Delete
router.post("/delete/:id", adminProductController.handleDelete);

module.exports = router;
