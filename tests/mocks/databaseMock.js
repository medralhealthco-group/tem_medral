'use strict';

/**
 * In-memory Mock Database & Connection Pool for Medral Health Co Unit Tests.
 * Simulates MySQL queries, transactions (beginTransaction, commit, rollback), and row returns.
 */

class MockDatabase {
  constructor() {
    this.tables = {
      users: [],
      admin_users: [],
      categories: [],
      subcategories: [],
      products: [],
      product_images: [],
      cart_items: [],
      orders: [],
      order_items: []
    };
    this.autoIncrement = 100;
  }

  reset() {
    this.tables = {
      users: [],
      admin_users: [],
      categories: [],
      subcategories: [],
      products: [],
      product_images: [],
      cart_items: [],
      orders: [],
      order_items: []
    };
    this.autoIncrement = 100;
  }

  createPoolMock() {
    const db = this;

    const connectionMock = {
      query: async (sql, params = []) => db.executeQuery(sql, params),
      execute: async (sql, params = []) => db.executeQuery(sql, params),
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {}
    };

    const poolMock = {
      query: async (sql, params = []) => db.executeQuery(sql, params),
      execute: async (sql, params = []) => db.executeQuery(sql, params),
      getConnection: async () => connectionMock,
      end: async () => {}
    };

    return poolMock;
  }

  executeQuery(sql, params = []) {
    const cleanSql = sql.trim().toUpperCase();

    // SELECT 1 (Health check)
    if (cleanSql === 'SELECT 1') {
      return [[{ 1: 1 }]];
    }

    // Customer / Admin User Queries
    if (cleanSql.includes('FROM USERS WHERE EMAIL =')) {
      const email = params[0];
      const user = this.tables.users.find(u => u.email === email);
      return [[user || null].filter(Boolean)];
    }

    if (cleanSql.includes('FROM USERS WHERE ID =')) {
      const id = params[0];
      const user = this.tables.users.find(u => u.id === id);
      return [[user || null].filter(Boolean)];
    }

    if (cleanSql.includes('INSERT INTO USERS')) {
      const id = ++this.autoIncrement;
      const newUser = {
        id,
        email: params[0],
        password_hash: params[1],
        first_name: params[2],
        last_name: params[3],
        phone: params[4],
        role: 'customer',
        is_active: 1
      };
      this.tables.users.push(newUser);
      return [{ insertId: id, affectedRows: 1 }];
    }

    if (cleanSql.includes('UPDATE USERS SET FIRST_NAME =')) {
      const id = params[3];
      const user = this.tables.users.find(u => u.id === id);
      if (user) {
        user.first_name = params[0];
        user.last_name = params[1];
        user.phone = params[2];
      }
      return [{ affectedRows: user ? 1 : 0 }];
    }

    if (cleanSql.includes('UPDATE USERS SET PASSWORD_HASH =')) {
      const id = params[1];
      const user = this.tables.users.find(u => u.id === id);
      if (user) {
        user.password_hash = params[0];
      }
      return [{ affectedRows: user ? 1 : 0 }];
    }

    if (cleanSql.includes('FROM ADMIN_USERS WHERE EMAIL =')) {
      const email = params[0];
      const admin = this.tables.admin_users.find(a => a.email === email);
      return [[admin || null].filter(Boolean)];
    }

    if (cleanSql.includes('FROM ADMIN_USERS WHERE ID =')) {
      const id = params[0];
      const admin = this.tables.admin_users.find(a => a.id === id);
      return [[admin || null].filter(Boolean)];
    }

    // Default fallback mock query response
    return [[], { affectedRows: 1, insertId: ++this.autoIncrement }];
  }
}

module.exports = MockDatabase;
