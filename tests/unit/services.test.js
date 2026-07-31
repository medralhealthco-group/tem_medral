'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

const config = require('../../config');
const { validateConfig } = require('../../utils/configValidator');
const deepFreeze = require('../../utils/deepFreeze');
const {
  normalizePath,
  isActiveUrl,
  getNavigation,
  getBreadcrumbs
} = require('../../services/navigationService');
const CartService = require('../../services/cartService');
const OrderService = require('../../services/orderService');
const AuthService = require('../../services/authService');
const CartModel = require('../../models/cartModel');
const OrderModel = require('../../models/orderModel');
const UserModel = require('../../models/userModel');

// -----------------------------------------------------------------------------
// Suite 18: Configuration
// -----------------------------------------------------------------------------
test('Suite 18: Configuration Unit Tests', async t => {
  await t.test('navigation config structure and immutability', () => {
    assert.ok(config.navigation);
    assert.ok(Array.isArray(config.navigation.header.menu));
    assert.equal(Object.isFrozen(config.navigation), true);
  });

  await t.test('redirects configuration structure', () => {
    assert.ok(Array.isArray(config.redirects));
    config.redirects.forEach(r => {
      assert.ok(r.from);
      assert.ok(r.to);
      assert.ok(r.code);
    });
  });

  await t.test('deepFreeze enforces immutability on arbitrary objects', () => {
    const obj = { nested: { val: 42 } };
    deepFreeze(obj);
    assert.equal(Object.isFrozen(obj.nested), true);
    assert.throws(() => {
      obj.nested.val = 100;
    }, TypeError);
  });

  await t.test('configValidator passes valid configuration and catches invalid rules', () => {
    assert.equal(validateConfig(config), true);
    assert.throws(() => validateConfig(null), /Configuration object is missing/);

    const dupConfig = {
      navigation: {
        header: {
          menu: [
            { id: 'item1', title: 'Item 1', url: '/1' },
            { id: 'item1', title: 'Item 2', url: '/2' }
          ]
        }
      }
    };
    assert.throws(() => validateConfig(dupConfig), /Duplicate item ID detected/);
  });
});

// -----------------------------------------------------------------------------
// Suite 19: Navigation Service
// -----------------------------------------------------------------------------
test('Suite 19: Navigation Service & Dynamic Routing', async t => {
  await t.test('normalizePath standardizes URLs cleanly', () => {
    assert.equal(normalizePath('/PRODUCTS/supplement-1.html?ref=1#top'), '/products/supplement-1');
    assert.equal(normalizePath('//SHOP//'), '/shop');
    assert.equal(normalizePath('/'), '/');
    assert.equal(normalizePath(null), '/');
  });

  await t.test('isActiveUrl correctly evaluates path matching', () => {
    assert.equal(isActiveUrl('/', '/'), true);
    assert.equal(isActiveUrl('/shop', '/shop'), true);
    assert.equal(isActiveUrl('/shop', '/shop/category-1'), true);
    assert.equal(isActiveUrl('/contact', '/about'), false);
  });

  await t.test('getNavigation builds active header/footer navigation items', () => {
    const nav = getNavigation('/shop');
    assert.ok(nav.header);
    assert.ok(nav.footer);

    const shopItem = nav.header.menu.find(m => m.url === '/shop');
    if (shopItem) {
      assert.equal(shopItem.isActive, true);
    }
  });

  await t.test('getBreadcrumbs builds valid trail recursively', () => {
    const crumbs = getBreadcrumbs('/pages/about-us');
    assert.ok(Array.isArray(crumbs));
    assert.equal(crumbs[0].title, 'Home');
    assert.equal(crumbs[0].url, '/');
  });
});

// -----------------------------------------------------------------------------
// Suite 21: Shopping Service & Cart Logic
// -----------------------------------------------------------------------------
test('Suite 21: Shopping Service Unit Tests', async t => {
  const originalGetCart = CartModel.getCart;
  const originalAddItem = CartModel.addItem;
  const originalUpdateItem = CartModel.updateItemQuantity;
  const originalRemoveItem = CartModel.removeItem;
  const originalClearCart = CartModel.clearCart;
  const originalMerge = CartModel.mergeGuestCartToUser;
  const originalCreateOrder = OrderModel.createOrderFromCart;

  t.afterEach(() => {
    CartModel.getCart = originalGetCart;
    CartModel.addItem = originalAddItem;
    CartModel.updateItemQuantity = originalUpdateItem;
    CartModel.removeItem = originalRemoveItem;
    CartModel.clearCart = originalClearCart;
    CartModel.mergeGuestCartToUser = originalMerge;
    OrderModel.createOrderFromCart = originalCreateOrder;
  });

  await t.test('CartService.addItem delegates parameters correctly', async () => {
    let callArgs = null;
    CartModel.addItem = async args => {
      callArgs = args;
      return { id: 1, quantity: args.quantity };
    };

    const res = await CartService.addItem({ userId: 5, productId: 10, quantity: 2 });
    assert.equal(res.quantity, 2);
    assert.equal(callArgs.userId, 5);
    assert.equal(callArgs.productId, 10);
  });

  await t.test('CartService.updateItemQuantity updates item count', async () => {
    let callArgs = null;
    CartModel.updateItemQuantity = async args => {
      callArgs = args;
      return { success: true };
    };

    await CartService.updateItemQuantity({ sessionId: 'sess123', itemId: 99, quantity: 3 });
    assert.equal(callArgs.itemId, 99);
    assert.equal(callArgs.quantity, 3);
  });

  await t.test('CartService.removeItem removes target item', async () => {
    let removedId = null;
    CartModel.removeItem = async ({ itemId }) => {
      removedId = itemId;
      return true;
    };

    await CartService.removeItem({ itemId: 42 });
    assert.equal(removedId, 42);
  });

  await t.test('CartService.mergeGuestCartToUser merges guest session to user ID', async () => {
    let mergedSess = null;
    let mergedUser = null;
    CartModel.mergeGuestCartToUser = async (sess, user) => {
      mergedSess = sess;
      mergedUser = user;
    };

    await CartService.mergeGuestCartToUser('sess_abc', 101);
    assert.equal(mergedSess, 'sess_abc');
    assert.equal(mergedUser, 101);
  });

  await t.test('OrderService.createOrder verifies shipping fields and creates order', async () => {
    OrderModel.createOrderFromCart = async ({ shippingData, paymentMethod }) => {
      if (!shippingData.name) throw new Error('All shipping address fields are required.');
      return { id: 88, orderNumber: 'MH-ORD-20260724-TEST' };
    };

    await assert.rejects(
      async () => {
        await OrderService.createOrder({ shippingData: {} });
      },
      /Enter a valid full name/
    );

    await assert.rejects(
      async () => {
        await OrderService.createOrder({
          shippingData: {
            name: 'John Doe',
            email: 'j@ex.com',
            phone: '123',
            address: '12 MG Road',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001'
          }
        });
      },
      /valid 10-digit Indian mobile/
    );

    const validOrder = await OrderService.createOrder({
      shippingData: {
        name: 'John Doe',
        email: 'j@ex.com',
        phone: '9876543210',
        address: '12 MG Road, Andheri',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001'
      }
    });
    assert.equal(validOrder.id, 88);
    assert.ok(validOrder.orderNumber.startsWith('MH-ORD-'));
  });
});

// -----------------------------------------------------------------------------
// Suite 22: Authentication Service
// -----------------------------------------------------------------------------
test('Suite 22: Authentication Service Unit Tests', async t => {
  const originalFindUser = UserModel.findUserByEmail;
  const originalCreateUser = UserModel.createUser;

  t.afterEach(() => {
    UserModel.findUserByEmail = originalFindUser;
    UserModel.createUser = originalCreateUser;
  });

  await t.test('AuthService.registerCustomer enforces password complexity and uniqueness', async () => {
    // 1. Missing fields
    await assert.rejects(
      async () => {
        await AuthService.registerCustomer({ firstName: 'John' });
      },
      /Please fill in all required fields/
    );

    // 2. Weak password
    await assert.rejects(
      async () => {
        await AuthService.registerCustomer({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'short',
          confirmPassword: 'short'
        });
      },
      /Password must be at least 8 characters long/
    );

    // 3. Passwords mismatch
    await assert.rejects(
      async () => {
        await AuthService.registerCustomer({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'Password123!',
          confirmPassword: 'MismatchPassword123!'
        });
      },
      /Passwords do not match/
    );

    // 4. Duplicate email
    UserModel.findUserByEmail = async () => ({ id: 1, email: 'john@example.com' });
    await assert.rejects(
      async () => {
        await AuthService.registerCustomer({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });
      },
      /An account with this email address already exists/
    );

    // 5. Successful Registration
    UserModel.findUserByEmail = async () => null;
    UserModel.createUser = async user => 55;

    const res = await AuthService.registerCustomer({
      firstName: 'John',
      lastName: 'Doe',
      email: 'John@Example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });

    assert.equal(res.id, 55);
    assert.equal(res.email, 'john@example.com');
  });

  await t.test('AuthService.loginCustomer validates user credentials accurately', async () => {
    const rawPass = 'ValidPassword123!';
    const passwordHash = await bcrypt.hash(rawPass, 10);

    UserModel.findUserByEmail = async email => {
      if (email === 'active@example.com') {
        return {
          id: 10,
          email: 'active@example.com',
          password_hash: passwordHash,
          first_name: 'Active',
          last_name: 'User',
          role: 'customer',
          is_active: 1
        };
      }
      return null;
    };

    // Valid login
    const user = await AuthService.loginCustomer({
      email: 'Active@Example.com',
      password: rawPass
    });
    assert.equal(user.id, 10);
    assert.equal(user.role, 'customer');

    // Invalid password
    await assert.rejects(
      async () => {
        await AuthService.loginCustomer({ email: 'active@example.com', password: 'WrongPassword' });
      },
      /Invalid email or password/
    );
  });
});
