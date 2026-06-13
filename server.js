const express = require('express');
const path = require('path');
const fsSync = require('fs');
const fs = require('fs').promises;
const mysql = require('mysql2/promise');

loadEnvFile();

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const productsFile = path.join(dataDir, 'products.json');
const usersFile = path.join(dataDir, 'users.json');

let pool;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env');
    const content = fsSync.readFileSync(envPath, 'utf8');

    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      const separator = trimmed.indexOf('=');
      if (separator === -1) {
        return;
      }

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Could not load .env file:', error.message);
    }
  }
}

function mysqlConfig(includeDatabase = true) {
  const password = process.env.MYSQL_PASSWORD || '';
  if (password === 'your_mysql_password') {
    throw new Error('Update MYSQL_PASSWORD in .env with your real MySQL password. If your MySQL user has no password, set MYSQL_PASSWORD=');
  }

  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password,
    ...(includeDatabase && { database: process.env.MYSQL_DATABASE || 'eshop' }),
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true
  };
}

function safeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    phone: row.phone,
    dob: formatDateOnly(row.dob),
    address: row.address || ''
  };
}

function mapProduct(row) {
  const details = parseJson(row.details, {});
  return {
    ...details,
    id: row.id,
    productId: row.product_id,
    name: row.name,
    brand: row.brand,
    price: Number(row.price),
    image: row.image
  };
}

function mapOrder(row) {
  return {
    orderId: row.order_id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    address: row.address,
    pincode: row.pincode,
    cart: parseJson(row.cart, []),
    total: Number(row.total),
    status: row.status,
    paymentMethod: row.payment_method,
    paymentDetails: parseJson(row.payment_details, null),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    paidAt: row.paid_at instanceof Date ? row.paid_at.toISOString() : row.paid_at
  };
}

function mapSupportRequest(row) {
  return {
    requestId: row.request_id,
    email: row.email,
    orderNumber: row.order_number,
    issueType: row.issue_type,
    message: row.message,
    status: row.status,
    submittedAt: row.submitted_at instanceof Date ? row.submitted_at.toISOString() : row.submitted_at
  };
}

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatDateOnly(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

async function initDb() {
  const database = process.env.MYSQL_DATABASE || 'eshop';
  const connection = await mysql.createConnection(mysqlConfig(false));
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();

  pool = mysql.createPool(mysqlConfig(true));
  await createTables();
  await seedProducts();
  await seedUsers();
}

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(32) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      dob DATE NOT NULL,
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id VARCHAR(32) NOT NULL UNIQUE,
      name VARCHAR(160) NOT NULL,
      brand VARCHAR(120),
      price DECIMAL(10, 2) NOT NULL,
      image TEXT,
      details JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(32) NOT NULL UNIQUE,
      email VARCHAR(190) NOT NULL,
      name VARCHAR(120) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      address TEXT NOT NULL,
      pincode VARCHAR(20) NOT NULL,
      cart JSON NOT NULL,
      total DECIMAL(10, 2) NOT NULL DEFAULT 0,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      payment_method VARCHAR(80),
      payment_details JSON,
      created_at DATETIME NOT NULL,
      paid_at DATETIME,
      INDEX idx_orders_email (email)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_id VARCHAR(32) NOT NULL UNIQUE,
      email VARCHAR(190) NOT NULL,
      order_number VARCHAR(80),
      issue_type VARCHAR(120) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'received',
      submitted_at DATETIME NOT NULL,
      INDEX idx_support_email (email)
    )
  `);
}

async function seedProducts() {
  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM products');
  if (count > 0) {
    return;
  }

  try {
    const content = await fs.readFile(productsFile, 'utf8');
    const products = JSON.parse(content || '[]');
    if (!Array.isArray(products) || products.length === 0) {
      return;
    }

    const values = products.map((product, index) => [
      product.productId?.toString?.() || String(index + 1),
      product.name,
      product.brand || null,
      Number(product.price || 0),
      product.image || null,
      JSON.stringify(product)
    ]);

    await pool.query(
      'INSERT INTO products (product_id, name, brand, price, image, details) VALUES ?',
      [values]
    );
    console.log(`Seeded ${values.length} products from ${productsFile}`);
  } catch (err) {
    console.warn('Could not seed products from JSON file:', err.message);
  }
}

async function seedUsers() {
  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM users');
  if (count > 0) {
    return;
  }

  try {
    const content = await fs.readFile(usersFile, 'utf8');
    const users = JSON.parse(content || '[]');
    if (!Array.isArray(users) || users.length === 0) {
      return;
    }

    const values = users.map(user => [
      user.id?.toString?.() || Date.now().toString(),
      user.name,
      user.email.toLowerCase(),
      user.password,
      user.phone,
      user.dob,
      user.address || ''
    ]);

    await pool.query(
      'INSERT INTO users (id, name, email, password, phone, dob, address) VALUES ?',
      [values]
    );
    console.log(`Seeded ${values.length} users from ${usersFile}`);
  } catch (err) {
    console.warn('Could not seed users from JSON file:', err.message);
  }
}

app.get('/api/products', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM products ORDER BY id ASC');
  res.json(rows.map(mapProduct));
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()]);
  const user = mapUser(rows[0]);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  res.json(safeUser(user));
});

app.post('/api/register', async (req, res) => {
  const { name, email, password, phone, dob } = req.body;
  if (!name || !email || !password || !phone || !dob) {
    return res.status(400).json({ error: 'All registration fields are required.' });
  }

  const newUser = {
    id: Date.now().toString(),
    name,
    email: email.toLowerCase(),
    password,
    phone,
    dob,
    address: ''
  };

  try {
    await pool.execute(
      'INSERT INTO users (id, name, email, password, phone, dob, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [newUser.id, newUser.name, newUser.email, newUser.password, newUser.phone, newUser.dob, newUser.address]
    );
    res.json(safeUser(newUser));
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    throw error;
  }
});

app.get('/api/user', async (req, res) => {
  const email = req.query.email?.toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  const user = mapUser(rows[0]);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  res.json(safeUser(user));
});

app.put('/api/user', async (req, res) => {
  const { email, name, phone, address, dob } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const fields = [];
  const values = [];
  if (name !== undefined) {
    fields.push('name = ?');
    values.push(name);
  }
  if (phone !== undefined) {
    fields.push('phone = ?');
    values.push(phone);
  }
  if (address !== undefined) {
    fields.push('address = ?');
    values.push(address);
  }
  if (dob !== undefined) {
    fields.push('dob = ?');
    values.push(dob);
  }

  if (fields.length > 0) {
    values.push(email.toLowerCase());
    await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE email = ?`, values);
  }

  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()]);
  const user = mapUser(rows[0]);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  res.json(safeUser(user));
});

app.get('/api/orders', async (req, res) => {
  const email = req.query.email?.toLowerCase();
  const [rows] = email
    ? await pool.execute('SELECT * FROM orders WHERE email = ? ORDER BY created_at DESC', [email])
    : await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
  res.json(rows.map(mapOrder));
});

app.post('/api/orders', async (req, res) => {
  const { email, name, phone, address, pincode, cart, total } = req.body;
  if (!email || !name || !phone || !address || !pincode || !cart || !Array.isArray(cart)) {
    return res.status(400).json({ error: 'Order payload is invalid.' });
  }

  const order = {
    orderId: `ES-${Date.now()}`,
    email: email.toLowerCase(),
    name,
    phone,
    address,
    pincode,
    cart,
    total: Number(total || 0),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  await pool.execute(
    `INSERT INTO orders
      (order_id, email, name, phone, address, pincode, cart, total, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      order.orderId,
      order.email,
      order.name,
      order.phone,
      order.address,
      order.pincode,
      JSON.stringify(order.cart),
      order.total,
      order.status,
      new Date(order.createdAt)
    ]
  );
  res.json(order);
});

app.post('/api/orders/:orderId/payment', async (req, res) => {
  const { orderId } = req.params;
  const { paymentMethod, paymentDetails } = req.body;

  if (!paymentMethod) {
    return res.status(400).json({ error: 'Payment method is required.' });
  }

  await pool.execute(
    `UPDATE orders
     SET status = 'paid', payment_method = ?, payment_details = ?, paid_at = ?
     WHERE order_id = ?`,
    [paymentMethod, JSON.stringify(paymentDetails || null), new Date(), orderId]
  );

  const [rows] = await pool.execute('SELECT * FROM orders WHERE order_id = ? LIMIT 1', [orderId]);
  if (!rows[0]) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  res.json(mapOrder(rows[0]));
});

app.post('/api/support', async (req, res) => {
  const { email, orderNumber, issueType, message } = req.body;
  if (!email || !issueType || !message) {
    return res.status(400).json({ error: 'Support request payload is invalid.' });
  }

  const request = {
    requestId: `SR-${Date.now()}`,
    email: email.toLowerCase(),
    orderNumber,
    issueType,
    message,
    status: 'received',
    submittedAt: new Date().toISOString()
  };

  await pool.execute(
    `INSERT INTO support_requests
      (request_id, email, order_number, issue_type, message, status, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      request.requestId,
      request.email,
      request.orderNumber || null,
      request.issueType,
      request.message,
      request.status,
      new Date(request.submittedAt)
    ]
  );
  res.json(request);
});

async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      const config = mysqlConfig(true);
      console.log(`E-SHOP backend is running at http://localhost:${PORT}`);
      console.log(`Connected to MySQL database ${config.database} at ${config.host}:${config.port}`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

startServer();
