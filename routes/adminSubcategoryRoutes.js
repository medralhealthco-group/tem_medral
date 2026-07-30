const express = require("express");
const router = express.Router();
const adminSubcategoryController = require("../controllers/adminSubcategoryController");
const { requireAdminAuth } = require("../middlewares/authMiddleware");

// All subcategory administration routes require admin authentication
router.use(requireAdminAuth);

// Subcategory List & Search
router.get("/", adminSubcategoryController.listSubcategories);

// Subcategory Create
router.get("/create", adminSubcategoryController.renderCreateForm);
router.post("/create", adminSubcategoryController.handleCreate);

// Subcategory Edit
router.get("/edit/:id", adminSubcategoryController.renderEditForm);
router.post("/edit/:id", adminSubcategoryController.handleEdit);

// Subcategory Delete
router.post("/delete/:id", adminSubcategoryController.handleDelete);

module.exports = router;
