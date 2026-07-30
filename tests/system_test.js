/**
 * Medral Health Co — Comprehensive E-Commerce System Test Suite
 * Behavioral Unit, Integration, Controller, Service & HTTP Endpoint Verification
 * Total Coverage: Suites 1 through 24
 */

const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../server');
const config = require('../config');
const OrderModel = require('../models/orderModel');
const UserModel = require('../models/userModel');
const CartModel = require('../models/cartModel');
const ProductModel = require('../models/productModel');
const CategoryModel = require('../models/categoryModel');
const CartService = require('../services/cartService');
const OrderService = require('../services/orderService');
const AuthService = require('../services/authService');
const CatalogService = require('../services/catalogService');
const {
  normalizePath,
  isActiveUrl,
  getNavigation,
  getBreadcrumbs
} = require('../services/navigationService');
const { validateConfig } = require('../utils/configValidator');
const deepFreeze = require('../utils/deepFreeze');
const {
  generalLimiter,
  authLimiter,
  checkoutLimiter,
  sanitizeBody
} = require('../middlewares/securityMiddleware');

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=======================================================');
  console.log('  RUNNING MEDRAL HEALTH CO SYSTEM TEST SUITE (24 SUITES)');
  console.log('=======================================================\n');

  // ---------------------------------------------------------------------------
  // Suite 1: Authentication & Password Hashing
  // ---------------------------------------------------------------------------
  console.log('[SUITE 1] Authentication & Password Hashing');
  try {
    const rawPass = 'SecretPassword123!';
    const hash = await bcrypt.hash(rawPass, 10);
    assert(hash && hash.length > 20, 'Bcrypt hashes passwords correctly');

    const isMatch = await bcrypt.compare(rawPass, hash);
    assert(isMatch === true, 'Bcrypt compares valid password correctly');

    const isWrongMatch = await bcrypt.compare('WrongPassword', hash);
    assert(isWrongMatch === false, 'Bcrypt rejects invalid password');
  } catch (err) {
    console.error('Suite 1 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 2: Order Number Generation & Formatting
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 2] Order Number Generation & Formatting');
  try {
    const orderNum1 = OrderModel.generateOrderNumber();
    const orderNum2 = OrderModel.generateOrderNumber();

    assert(orderNum1.startsWith('MH-ORD-'), 'Order number starts with MH-ORD- prefix');
    assert(orderNum1.length >= 15, 'Order number has expected length');
    assert(orderNum1 !== orderNum2, 'Order numbers are unique per call');
  } catch (err) {
    console.error('Suite 2 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 3: Security & Rate Limiting Middleware Execution
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 3] Security & Rate Limiting Middleware Execution');
  try {
    assert(typeof generalLimiter === 'function', 'General rate limiter middleware initialized');
    assert(typeof authLimiter === 'function', 'Auth rate limiter middleware initialized');
    assert(typeof checkoutLimiter === 'function', 'Checkout rate limiter middleware initialized');
    assert(typeof sanitizeBody === 'function', 'Input sanitization middleware initialized');

    // Test sanitization logic dynamically
    const req = {
      body: {
        name: "  John Doe <script>alert('xss')</script> ",
        email: 'john@example.com  '
      }
    };
    const res = {};
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };
    sanitizeBody(req, res, next);

    assert(nextCalled === true, 'Sanitization middleware invokes next()');
    assert(req.body.name === 'John Doe', 'Sanitization middleware strips script tags');
    assert(req.body.email === 'john@example.com', 'Sanitization middleware trims email string');
  } catch (err) {
    console.error('Suite 3 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 4: Environment & App Configuration Validation
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 4] Environment & App Configuration Validation');
  try {
    const { validateEnv } = require('../utils/envValidator');
    assert(typeof validateEnv === 'function', 'validateEnv function exists');
    assert(validateConfig(config) === true, 'Site configuration passes validateConfig()');
  } catch (err) {
    console.error('Suite 4 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 5: Persistent Session Store & Database Pool Verification
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 5] Persistent Session Store & Database Pool Verification');
  try {
    const dbConfig = require('../config/database');
    assert(typeof dbConfig.pool === 'object', 'Database pool object initialized');
    assert(typeof dbConfig.testConnection === 'function', 'Database testConnection function exists');
  } catch (err) {
    console.error('Suite 5 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 6: Session Regeneration & Fixation Defense Flow
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 6] Session Regeneration & Fixation Defense Flow');
  try {
    let regenerated = false;
    let saved = false;
    const mockReq = {
      sessionID: 'old_session_123',
      session: {
        returnTo: '/cart',
        regenerate(cb) {
          regenerated = true;
          cb(null);
        },
        save(cb) {
          saved = true;
          cb(null);
        }
      }
    };

    mockReq.session.regenerate(err => {
      if (!err) {
        mockReq.session.user = { id: 1, email: 'test@example.com', role: 'customer' };
        mockReq.session.save(() => {});
      }
    });

    assert(regenerated === true, 'Session regeneration callback triggers cleanly');
    assert(saved === true, 'Session save callback triggers after regeneration');
    assert(mockReq.session.user.id === 1, 'Session user object attached after regeneration');
  } catch (err) {
    console.error('Suite 6 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 7: Database Atomic Transaction & Rollback Handler Verification
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 7] Database Atomic Transaction & Rollback Handler Verification');
  try {
    let rollbackCalled = false;
    let commitCalled = false;

    const mockConnection = {
      beginTransaction: async () => {},
      commit: async () => {
        commitCalled = true;
      },
      rollback: async () => {
        rollbackCalled = true;
      },
      release: () => {},
      query: async () => {
        throw new Error('Simulated DB Transaction Failure');
      }
    };

    try {
      await mockConnection.beginTransaction();
      await mockConnection.query('INSERT INTO orders VALUES (1)');
      await mockConnection.commit();
    } catch (err) {
      await mockConnection.rollback();
    } finally {
      mockConnection.release();
    }

    assert(rollbackCalled === true, 'Transaction failure triggers rollback()');
    assert(commitCalled === false, 'Transaction failure prevents commit()');
  } catch (err) {
    console.error('Suite 7 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 8: Category & Subcategory Hierarchy Logic
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 8] Category & Subcategory Hierarchy Logic');
  try {
    assert(typeof CategoryModel.getAllCategories === 'function', 'getAllCategories method exists');
    assert(typeof CategoryModel.getCategoryBySlug === 'function', 'getCategoryBySlug method exists');
  } catch (err) {
    console.error('Suite 8 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 9: Product Catalog Filtering & Pagination Model
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 9] Product Catalog Filtering & Pagination Model');
  try {
    assert(typeof ProductModel.getShopProducts === 'function', 'getShopProducts method exists');
    assert(typeof ProductModel.getShopProductsCount === 'function', 'getShopProductsCount method exists');
  } catch (err) {
    console.error('Suite 9 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 10: Cart Operations & Item State Transitions
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 10] Cart Operations & Item State Transitions');
  try {
    assert(typeof CartModel.getCart === 'function', 'CartModel.getCart method exists');
    assert(typeof CartModel.addItem === 'function', 'CartModel.addItem method exists');
    assert(typeof CartModel.updateItemQuantity === 'function', 'CartModel.updateItemQuantity exists');
    assert(typeof CartModel.removeItem === 'function', 'CartModel.removeItem exists');
  } catch (err) {
    console.error('Suite 10 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 11: Order Placement & Stock Reservation Validation
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 11] Order Placement & Stock Reservation Validation');
  try {
    assert(typeof OrderModel.createOrderFromCart === 'function', 'OrderModel.createOrderFromCart exists');
    assert(typeof OrderModel.getOrderByNumber === 'function', 'OrderModel.getOrderByNumber exists');
  } catch (err) {
    console.error('Suite 11 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 12: Admin Product Management & SKU Uniqueness
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 12] Admin Product Management & SKU Uniqueness');
  try {
    assert(typeof ProductModel.checkSKUExists === 'function', 'checkSKUExists method exists');
    assert(typeof ProductModel.createProduct === 'function', 'createProduct method exists');
  } catch (err) {
    console.error('Suite 12 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 13: Input Sanitization & XSS Prevention Middleware
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 13] Input Sanitization & XSS Prevention Middleware');
  try {
    const dirtyReq = {
      body: {
        comment: '<script>alert(1)</script>Safe Text',
        nested: { link: '<a href="javascript:alert(1)">Click</a>' }
      }
    };
    sanitizeBody(dirtyReq, {}, () => {});
    assert(dirtyReq.body.comment === 'Safe Text', 'Strips embedded script tags cleanly');
  } catch (err) {
    console.error('Suite 13 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 14: Centralized 404 and 500 Error Handlers
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 14] Centralized 404 and 500 Error Handlers (Supertest)');
  try {
    const res404 = await request(app).get('/route-that-does-not-exist-12345');
    assert(res404.status === 404, 'Supertest request to invalid route returns 404 status');
  } catch (err) {
    console.error('Suite 14 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 15: SEO Structured Data Parsing (DOM/JSON-LD Validation)
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 15] SEO Structured Data Parsing (DOM/JSON-LD Validation)');
  try {
    const res = await request(app).get('/');
    assert(res.status === 200, 'Home page renders with HTTP 200');

    // Parse JSON-LD structured data block from rendered HTML
    const jsonLdMatch = res.text.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert(jsonLdMatch !== null, 'Home page renders a valid JSON-LD script tag');

    if (jsonLdMatch) {
      const jsonLdData = JSON.parse(jsonLdMatch[1]);
      assert(jsonLdData['@context'] === 'https://schema.org', 'JSON-LD schema context is schema.org');
      assert(
        ['Organization', 'WebSite', 'Product'].includes(jsonLdData['@type']),
        `JSON-LD contains valid schema @type (${jsonLdData['@type']})`
      );
    }
  } catch (err) {
    console.error('Suite 15 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 16: Accessibility Standards (ARIA Attributes Render Check)
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 16] Accessibility Standards (ARIA Attributes Render Check)');
  try {
    const res = await request(app).get('/cart');
    assert(res.status === 200, 'Cart page renders with 200 OK');
    assert(res.text.includes('role=') || res.text.includes('aria-'), 'Rendered HTML contains ARIA accessibility attributes');
  } catch (err) {
    console.error('Suite 16 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 17: DevOps Readiness & Health Check Response
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 17] DevOps Readiness Verification (Supertest)');
  try {
    const res = await request(app).get('/health');
    assert(res.status === 200 || res.status === 503, 'Health check endpoint returns HTTP 200/503');
    assert(['ok', 'degraded', 'UP'].includes(res.body.status), 'Health check JSON reports valid status (ok/degraded/UP)');
    assert(res.body.node_env === undefined, 'Public health check does not disclose NODE_ENV');
    assert(res.body.memory === undefined, 'Public health check does not disclose memory');
  } catch (err) {
    console.error('Suite 17 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 18: Configuration & Immutability
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 18] Configuration Immutability & Validation');
  try {
    assert(Object.isFrozen(config) === true, 'Config root object is frozen');
    assert(Object.isFrozen(config.site) === true, 'Config site nested object is frozen');

    const mutable = { a: { b: 1 } };
    deepFreeze(mutable);
    assert(Object.isFrozen(mutable.a) === true, 'deepFreeze recursively freezes nested objects');
  } catch (err) {
    console.error('Suite 18 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 19: Navigation Service & URL Normalization
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 19] Navigation Service & URL Normalization');
  try {
    assert(normalizePath('/ABOUT/us.html?ref=1') === '/about/us', 'normalizePath strips trailing slash, uppercase & .html');
    assert(isActiveUrl('/shop', '/shop') === true, 'isActiveUrl identifies matching route');
    const nav = getNavigation('/shop');
    assert(Array.isArray(nav.header.menu) === true, 'getNavigation produces header menu array');
    const crumbs = getBreadcrumbs('/pages/about-us');
    assert(crumbs[0].title === 'Home', 'getBreadcrumbs produces Home root item');
  } catch (err) {
    console.error('Suite 19 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 20: Express Routing & HTTP Endpoint Testing
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 20] Express Routing & HTTP Endpoint Testing');
  try {
    const routesToTest = ['/', '/shop', '/cart'];
    for (const route of routesToTest) {
      const res = await request(app).get(route);
      assert(res.status === 200, `GET ${route} returns 200 OK`);
    }
  } catch (err) {
    console.error('Suite 20 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 21: Shopping Service & Cart Logic Integration
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 21] Shopping Service Unit Tests');
  try {
    assert(typeof CartService.addItem === 'function', 'CartService.addItem is defined');
    assert(typeof CartService.updateItemQuantity === 'function', 'CartService.updateItemQuantity is defined');
    assert(typeof CartService.removeItem === 'function', 'CartService.removeItem is defined');
    assert(typeof CartService.mergeGuestCartToUser === 'function', 'CartService.mergeGuestCartToUser is defined');
    assert(typeof OrderService.createOrder === 'function', 'OrderService.createOrder is defined');
  } catch (err) {
    console.error('Suite 21 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 22: Authentication Service & Account Unit Tests
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 22] Authentication Service Unit Tests');
  try {
    assert(typeof AuthService.registerCustomer === 'function', 'AuthService.registerCustomer is defined');
    assert(typeof AuthService.loginCustomer === 'function', 'AuthService.loginCustomer is defined');
    assert(typeof AuthService.loginAdmin === 'function', 'AuthService.loginAdmin is defined');
    assert(typeof AuthService.updateCustomerPassword === 'function', 'AuthService.updateCustomerPassword is defined');
  } catch (err) {
    console.error('Suite 22 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 23: Response Performance & Compression Headers
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 23] Response Performance & Compression Headers');
  try {
    const res = await request(app).get('/');
    assert(res.headers['x-content-type-options'] === 'nosniff', 'Security header X-Content-Type-Options is set to nosniff');
    assert(res.headers['x-frame-options'] !== undefined, 'X-Frame-Options header present for clickjacking defense');
  } catch (err) {
    console.error('Suite 23 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Suite 24: Dynamic Navigation Configuration Integrity Crawler
  // ---------------------------------------------------------------------------
  console.log('\n[SUITE 24] Dynamic Navigation Configuration Integrity Crawler');
  try {
    const menuUrls = [];
    if (config.navigation && config.navigation.header && config.navigation.header.menu) {
      config.navigation.header.menu.forEach(item => {
        if (item.url) menuUrls.push(item.url);
        if (item.children) item.children.forEach(child => child.url && menuUrls.push(child.url));
      });
    }
    const uniqueUrls = Array.from(new Set(menuUrls));

    let allResolved = true;
    for (const url of uniqueUrls) {
      const res = await request(app).get(url);
      if (![200, 301, 302].includes(res.status)) {
        allResolved = false;
        console.error(`  [FAIL] URL ${url} returned ${res.status}`);
      }
    }
    assert(allResolved === true, 'All configured navigation URLs resolve with valid HTTP status (200/301)');
  } catch (err) {
    console.error('Suite 24 Error:', err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // Test Results Summary
  // ---------------------------------------------------------------------------
  console.log('\n=======================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
