const express = require("express");
const router = express.Router();
const adminCategoryController = require("../controllers/adminCategoryController");
const { requireAdminAuth } = require("../middlewares/authMiddleware");

// All category administration routes require admin authentication
router.use(requireAdminAuth);

// Category List & Search
router.get("/", adminCategoryController.listCategories);

// Category Create
router.get("/create", adminCategoryController.renderCreateForm);
router.post("/create", adminCategoryController.handleCreate);

// Category Edit
router.get("/edit/:id", adminCategoryController.renderEditForm);
router.post("/edit/:id", adminCategoryController.handleEdit);

// Category Delete
router.post("/delete/:id", adminCategoryController.handleDelete);

module.exports = router;
