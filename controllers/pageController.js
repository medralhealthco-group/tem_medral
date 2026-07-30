const { getSeoMetadata } = require("../utils/seoHelper");

// Allowed views whitelist to prevent Path Traversal / LFI
const ALLOWED_PAGES = new Set([
  "about-us",
  "b2b-white-labeling",
  "capsules",
  "certifications",
  "contact",
  "effervescent-tablets",
  "faqs",
  "gummies",
  "privacy-policy",
  "sachets",
  "shots",
  "softgel-capsules",
  "terms-and-conditions"
]);

const PAGE_SEO = {
  "about-us": {
    title: "About Us | Medral Health Co",
    description:
      "Learn about Medral Health Co — India's premier B2B nutraceutical contract manufacturer delivering private label and custom formulations."
  },
  "b2b-white-labeling": {
    title: "B2B White Labeling | Medral Health Co",
    description:
      "Launch your brand with Medral's B2B white-label and private-label supplement manufacturing services across dosage forms."
  },
  capsules: {
    title: "Capsule Manufacturing | Medral Health Co",
    description:
      "GMP-certified capsule manufacturing for nutraceutical and sports nutrition brands. Private label and contract production."
  },
  certifications: {
    title: "Certifications | Medral Health Co",
    description:
      "View Medral Health Co quality certifications including ISO, GMP, FSSAI, HACCP and global manufacturing standards."
  },
  contact: {
    title: "Contact | Medral Health Co",
    description:
      "Contact Medral Health Co for manufacturing enquiries, private label partnerships, and B2B nutraceutical production."
  },
  "effervescent-tablets": {
    title: "Effervescent Tablet Manufacturing | Medral Health Co",
    description:
      "Contract manufacturing of effervescent tablets with quality assurance for wellness and sports nutrition brands."
  },
  faqs: {
    title: "Frequently Asked Questions | Medral Health Co",
    description:
      "Answers to common questions about Medral's contract manufacturing, private label services, MOQs, and quality standards."
  },
  gummies: {
    title: "Gummy Manufacturing | Medral Health Co",
    description:
      "Premium nutraceutical gummy manufacturing for private label and contract brands with consistent quality."
  },
  "privacy-policy": {
    title: "Privacy Policy | Medral Health Co",
    description: "How Medral Health Co collects, uses, and protects personal information on our website and services."
  },
  sachets: {
    title: "Sachet Manufacturing | Medral Health Co",
    description:
      "Powder sachet contract manufacturing for supplements and sports nutrition — private label ready."
  },
  shots: {
    title: "Shot Manufacturing | Medral Health Co",
    description:
      "Ready-to-drink supplement shot manufacturing for wellness brands seeking private label production."
  },
  "softgel-capsules": {
    title: "Softgel Capsule Manufacturing | Medral Health Co",
    description:
      "Softgel capsule contract manufacturing with GMP processes for nutraceutical and wellness brands."
  },
  "terms-and-conditions": {
    title: "Terms and Conditions | Medral Health Co",
    description: "Terms and conditions for using the Medral Health Co website and related services."
  }
};

const ALLOWED_BLOG_ARTICLES = new Set([
  "best-protein-supplement-manufacturer-for-quality-products",
  "custom-supplement-manufacturing-by-nutrolife-science",
  "discover-the-benefits-of-vegan-sports-nutrition-from-a-top-manufacturer",
  "nutrolife-science-high-quality-protein-powder-manufacturing",
  "private-label-manufacturing-launch-your-own-protein-brand",
  "private-label-whey-protein-manufacturing-for-your-brand",
  "the-rise-of-whey-products-innovations-in-manufacturing",
  "the-science-behind-the-manufacturing-of-protein-powder",
  "the-ultimate-guide-to-private-label-supplements-in-india",
  "top-protein-supplement-manufacturer-for-quality-products",
  "top-reasons-to-choose-a-quality-whey-protein-manufacturer",
  "why-iso-certification-matters-for-supplement-manufacturers",
  "your-trusted-protein-powder-manufacturer-for-quality-products"
]);

/**
 * Controller methods for rendering application views
 */
exports.renderHome = (req, res) => {
  const seo = getSeoMetadata(
    "Medral Health Co | Custom Supplement & Sports Nutrition Manufacturer",
    "Leading private label and contract supplement manufacturer in India. Premium protein powders, gummies, capsules, and wellness products. ISO 9001 · GMP · FSSAI · HACCP.",
    req,
    { type: "website" }
  );
  res.render("index", { seo });
};

exports.renderProductsByForms = (req, res) => {
  const seo = getSeoMetadata(
    "Products by Dosage Form | Medral Health Co",
    "Explore our manufacturing capabilities across capsules, gummies, sachets, effervescent tablets, softgels, shots, and powders.",
    req
  );
  res.render("products-by-forms", { seo });
};

exports.renderPage = (req, res, next) => {
  let pageParam = req.params.page || "";
  if (pageParam.endsWith(".html")) {
    pageParam = pageParam.slice(0, -5);
  }

  if (pageParam === "products-by-forms") {
    return res.redirect(301, "/products-by-forms");
  }

  if (pageParam === "what-we-manufacturer" || pageParam === "success-stories") {
    return res.redirect(301, "/pages/about-us");
  }

  if (!ALLOWED_PAGES.has(pageParam)) {
    const error = new Error("Page Not Found");
    error.status = 404;
    return next(error);
  }

  const pageMeta = PAGE_SEO[pageParam] || {
    title: `${pageParam.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} | Medral Health Co`,
    description: `Learn more about ${pageParam.replace(/-/g, " ")} at Medral Health Co.`
  };

  const seo = getSeoMetadata(pageMeta.title, pageMeta.description, req);

  const renderLocals = {
    seo,
    error: null,
    formData: {},
    reqQueryError: req.query.error || null
  };

  res.render(`pages/${pageParam}`, renderLocals, (err, html) => {
    if (err) {
      return next(err);
    }
    res.send(html);
  });
};

exports.renderBlogIndex = (req, res) => {
  const seo = getSeoMetadata(
    "News & Articles | Medral Health Co",
    "Latest insights and updates on supplement manufacturing, nutrition trends, and quality certifications.",
    req
  );
  res.render("blogs/news", { seo });
};

exports.renderBlogArticle = (req, res) => {
  return res.redirect(301, "/blogs/news");
};
