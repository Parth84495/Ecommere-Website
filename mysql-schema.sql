CREATE DATABASE IF NOT EXISTS eshop
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE eshop;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    dob DATE,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    brand VARCHAR(120),
    price DECIMAL(10,2) NOT NULL,
    image TEXT,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(32) NOT NULL UNIQUE,
    email VARCHAR(190) NOT NULL,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(30),
    address TEXT,
    pincode VARCHAR(20),
    cart JSON,
    total DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'pending',
    payment_method VARCHAR(80),
    payment_details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL,
    INDEX idx_orders_email (email)
);

-- SUPPORT TABLE
CREATE TABLE IF NOT EXISTS support_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(32) NOT NULL UNIQUE,
    email VARCHAR(190) NOT NULL,
    order_number VARCHAR(80),
    issue_type VARCHAR(120) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'received',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_support_email (email)
);