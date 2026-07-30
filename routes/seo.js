const express = require("express");
const router = express.Router();
const CatalogService = require("../services/catalogService");
const { getSiteOrigin } = require("../utils/seoHelper");

const STATIC_PAGES = [
  "",
  "products-by-forms",
  "pages/about-us",
  "pages/b2b-white-labeling",
  "pages/capsules",
  "pages/certifications",
  "pages/contact",
  "pages/effervescent-tablets",
  "pages/faqs",
  "pages/gummies",
  "pages/privacy-policy",
  "pages/sachets",
  "pages/shots",
  "pages/softgel-capsules",
  "pages/terms-and-conditions",
  "blogs/news",
  "shop"
];

function getBaseUrl(req) {
  return getSiteOrigin(req);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Master Sitemap Index XML
router.get("/sitemap.xml", (req, res) => {
  const baseUrl = getBaseUrl(req);
  const now = new Date().toISOString().split("T")[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${escapeXml(baseUrl)}/sitemap-main.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${escapeXml(baseUrl)}/sitemap-categories.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${escapeXml(baseUrl)}/sitemap-products.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;

  res.header("Content-Type", "application/xml; charset=utf-8");
  res.send(xml);
});

// Main Static Pages Sitemap XML
router.get("/sitemap-main.xml", (req, res) => {
  const baseUrl = getBaseUrl(req);
  const now = new Date().toISOString().split("T")[0];

  const urls = STATIC_PAGES.map((p) => {
    const loc = p ? `${baseUrl}/${p}` : baseUrl;
    const priority = p === "" ? "1.0" : p === "shop" ? "0.9" : "0.8";
    return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  res.header("Content-Type", "application/xml; charset=utf-8");
  res.send(xml);
});

// Dynamic Categories Sitemap XML
router.get("/sitemap-categories.xml", async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const now = new Date().toISOString().split("T")[0];

  try {
    const categories = await CatalogService.getAllCategories(true);
    const urls = categories.map((cat) => {
      const lastmod = cat.updated_at ? new Date(cat.updated_at).toISOString().split("T")[0] : now;
      return `  <url>\n    <loc>${escapeXml(`${baseUrl}/shop/category/${cat.slug}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

    res.header("Content-Type", "application/xml; charset=utf-8");
    res.send(xml);
  } catch (error) {
    console.error("[SEO ERROR] sitemap-categories:", error.message);
    res.status(500).send("Error generating categories sitemap");
  }
});

// Dynamic Products Sitemap XML (paginated — no hard 1000 cap)
router.get("/sitemap-products.xml", async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const now = new Date().toISOString().split("T")[0];

  try {
    const products = [];
    const pageSize = 200;
    let page = 1;

    while (page <= 50) {
      const catalog = await CatalogService.getShopCatalog({
        page,
        limit: pageSize,
        sort: "newest"
      });
      const batch = (catalog && catalog.products) || [];
      if (!batch.length) break;
      products.push(...batch);
      if (batch.length < pageSize) break;
      page += 1;
    }

    const urls = products.map((prod) => {
      const lastmod = prod.updated_at ? new Date(prod.updated_at).toISOString().split("T")[0] : now;
      return `  <url>\n    <loc>${escapeXml(`${baseUrl}/shop/product/${prod.slug}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>`;
    }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

    res.header("Content-Type", "application/xml; charset=utf-8");
    res.send(xml);
  } catch (error) {
    console.error("[SEO ERROR] sitemap-products:", error.message);
    res.status(500).send("Error generating products sitemap");
  }
});

// Dynamic Robots.txt Endpoint
router.get("/robots.txt", (req, res) => {
  const baseUrl = getBaseUrl(req);
  const robots = `User-agent: *
Allow: /

Disallow: /admin/
Disallow: /cart
Disallow: /checkout
Disallow: /account/
Disallow: /pages/thank-you

Sitemap: ${baseUrl}/sitemap.xml
`;

  res.header("Content-Type", "text/plain; charset=utf-8");
  res.send(robots);
});

module.exports = router;
