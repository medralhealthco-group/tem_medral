const express = require("express");
const router = express.Router();
const pageController = require("../controllers/pageController");

// Core routes
router.get("/", pageController.renderHome);
router.get("/products-by-forms", pageController.renderProductsByForms);

// Auth & Page route shortcuts
router.get("/login", (req, res) => res.redirect("/account/login"));
router.get("/register", (req, res) => res.redirect("/account/register"));
router.get("/about-us", (req, res) => res.redirect(301, "/pages/about-us"));

// Legacy products-by-forms redirect
router.get(["/pages/products-by-forms", "/pages/products-by-forms.html"], (req, res) => {
  res.redirect(301, "/products-by-forms");
});

// Static pages
router.get("/pages/:page", pageController.renderPage);

// Support legacy .html URLs seamlessly by redirecting or rendering
router.get("/:page.html", (req, res) => {
  res.redirect(301, `/pages/${req.params.page}`);
});

// Blog routes
router.get(["/blogs/news", "/blogs/news.html"], pageController.renderBlogIndex);
router.get("/blogs/news/:article", pageController.renderBlogArticle);

module.exports = router;
