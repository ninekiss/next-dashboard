const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const CryptoJS = require('crypto-js');

const {
  invoices,
  customers,
  revenue,
  users,
} = require('../app/lib/placeholder-data.js');

function main() {
  // 连接数据库
  const db = new sqlite3.Database('./db/dd.db', (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('已成功连接到SQLite数据库');
  });

  seedUsers(db);
  seedCustomers(db);
  seedInvoices(db);
  seedRevenue(db);

  // 关闭数据库
  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('已关闭数据库连接');
  });
}

main();

async function seedUsers(db) {
  try {
    const sql = `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );`;

    CreateTable(db, sql);
    console.log(`Created "users" table`);

    // Insert data into the "users" table
    const contacts = users.map((user) => {
      const hashedPassword = CryptoJS.SHA256(user.password).toString();
      return [user.id, user.name, user.email, hashedPassword];
    });

    Insert(
      db,
      { table: 'users', columns: ['id', 'name', 'email', 'password'] },
      contacts,
    );
    console.log(`Seeded ${contacts.length} users`);
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}

async function seedInvoices(db) {
  try {
    const sql = `CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );`;

    CreateTable(db, sql);
    console.log(`Created "invoices" table`);

    // Insert data into the "invoices" table
    const contacts = invoices.map((invoice) => {
      return [uuidv4(), invoice.customer_id, invoice.amount, invoice.status, invoice.date];
    });

    Insert(
      db,
      { table: 'invoices', columns: ['id', 'customer_id', 'amount', 'status', 'date'] },
      contacts,
    );
    console.log(`Seeded ${contacts.length} invoices`);
  } catch (error) {
    console.error('Error seeding invoices:', error);
    throw error;
  }
}

async function seedCustomers(db) {
  try {
    const sql = `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );`;

    CreateTable(db, sql);
    console.log(`Created "customers" table`);

    // Insert data into the "customers" table
    const contacts = customers.map((customer) => {
      return [customer.id, customer.name, customer.email, customer.image_url];
    });

    Insert(
      db,
      { table: 'customers', columns: ['id', 'name', 'email', 'image_url'] },
      contacts,
    );
    console.log(`Seeded ${contacts.length} customers`);
  } catch (error) {
    console.error('Error seeding customers:', error);
    throw error;
  }
}

async function seedRevenue(db) {
  try {
    const sql = `CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );`;

    CreateTable(db, sql);
    console.log(`Created "revenue" table`);

    // Insert data into the "revenue" table
    const contacts = revenue.map((rev) => {
      return [rev.month, rev.revenue];
    });

    Insert(
      db,
      { table: 'revenue', columns: ['month', 'revenue'] },
      contacts,
    );
    console.log(`Seeded ${contacts.length} revenue`);
  } catch (error) {
    console.error('Error seeding revenue:', error);
    throw error;
  }
}

// 创建表
function CreateTable(db, sql) {
  db.run(sql, (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('已成功创建表');
  });
}

// 插入多行数据
function Insert(db, { table, columns }, records) {
  const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${Array(
    columns.length,
  )
    .fill('?')
    .join(',')})`;
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    records.forEach((record) => {
      db.run(sql, record, function (err) {
        if (err) {
          return console.error(err.message);
        }
        console.log(`已成功插入行，行ID为 ${this.lastID}`);
      });
    });
    db.run('COMMIT');
  });
}
