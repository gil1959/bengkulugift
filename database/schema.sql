-- ============================================================
-- Schema Database: BengkuluGift - Oleh-Oleh Bengkulu
-- Sesuai ERD: Pengguna, Produk, Kategori, Pemesanan,
--             Pembayaran, Ulasan, Favorit, Keranjang
-- ============================================================

CREATE DATABASE IF NOT EXISTS oleholeh_db;
USE oleholeh_db;

-- ─────────────────────────────────────────────────────────────
-- ENTITAS: Pengguna (ERD: Pengguna)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,  -- Id_Pengguna (PK)
    name        VARCHAR(100) NOT NULL,           -- Nama
    email       VARCHAR(100) NOT NULL UNIQUE,    -- Email
    password    VARCHAR(255) NOT NULL,           -- Password
    no_hp       VARCHAR(20) DEFAULT NULL,        -- No_hp
    role        ENUM('admin', 'user') DEFAULT 'user',
    is_verified TINYINT(1) DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- ENTITAS: Admin (ERD: Admin) — TERPISAH dari Pengguna
-- Login admin menggunakan tabel ini, bukan tabel users
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
    id          INT AUTO_INCREMENT PRIMARY KEY,  -- Id_Admin (PK)
    nama_admin  VARCHAR(100) NOT NULL,           -- Nama_Admin
    email_admin VARCHAR(100) NOT NULL UNIQUE,    -- Email_Admin
    password    VARCHAR(255) NOT NULL,           -- Password
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- ENTITAS: Kategori (ERD: Kategori)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id         INT AUTO_INCREMENT PRIMARY KEY,  -- Id_Kategori (PK)
    name       VARCHAR(100) NOT NULL,           -- Nama_Kategori
    icon       VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- ENTITAS: Produk (ERD: Produk)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id          INT AUTO_INCREMENT PRIMARY KEY,  -- Id_Produk (PK)
    category_id INT,                             -- Id_Kategori (FK -> Kategori)
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    price       DECIMAL(10,2) NOT NULL,
    image       VARCHAR(255),
    stock       INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────
-- ENTITAS: Pemesanan (ERD: Pemesanan)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id           INT AUTO_INCREMENT PRIMARY KEY,   -- Id_Pemesanan (PK)
    user_id      INT,                              -- Id_Pengguna (FK -> users)
    total_amount DECIMAL(10,2) NOT NULL,           -- Total_Harga_Pemesanan
    status       ENUM('pending','paid','diproses','dikirim','selesai','cancelled') DEFAULT 'pending', -- Status_Pemesanan
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Tanggal_Pemesanan
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- Detail item tiap pesanan (relasi Produk <-> Pemesanan)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    order_id   INT,    -- FK -> orders
    product_id INT,    -- FK -> products
    quantity   INT NOT NULL,
    price      DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- ENTITAS: Pembayaran (ERD: Pembayaran)
-- Dipisah dari orders sesuai ERD
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id                 INT AUTO_INCREMENT PRIMARY KEY,  -- Id_Pembayaran (PK)
    order_id           INT NOT NULL,                    -- Id_Pemesanan (FK -> orders)
    status_pembayaran  ENUM('menunggu','lunas','ditolak') DEFAULT 'menunggu', -- Status_Pembayaran
    bukti_pembayaran   VARCHAR(255) DEFAULT NULL,       -- Bukti_Pembayaran
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- ENTITAS: Ulasan (ERD: Ulasan)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id         INT AUTO_INCREMENT PRIMARY KEY,  -- Id_Ulasan (PK)
    user_id    INT,                             -- Id_Pengguna (FK -> users)
    product_id INT,                             -- Id_Produk (FK -> products)
    rating     INT CHECK (rating >= 1 AND rating <= 5), -- Rating
    comment    TEXT,                            -- Komentar
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- ENTITAS: Favorit (ERD: Favorit)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
    id         INT AUTO_INCREMENT PRIMARY KEY,  -- Id_Favorit (PK)
    user_id    INT NOT NULL,                    -- Id_Pengguna (FK -> users)
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_favorite (user_id, product_id),
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- ENTITAS: Keranjang (ERD: Keranjang)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart (
    id         INT AUTO_INCREMENT PRIMARY KEY,  -- Id_Keranjang (PK)
    user_id    INT,                             -- Id_Pengguna (FK -> users)
    product_id INT,
    quantity   INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- Tabel pendukung sistem OTP (di luar ERD - sistem verifikasi)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_verifications (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(100) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    no_hp      VARCHAR(20) DEFAULT NULL,
    otp        VARCHAR(10) NOT NULL,
    otp_expiry DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_resets (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(100) NOT NULL,
    otp        VARCHAR(10) NOT NULL,
    otp_expiry DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- Default admin (password: admin123)
-- ─────────────────────────────────────────────────────────────
INSERT INTO admins (nama_admin, email_admin, password)
VALUES ('Admin', 'admin@bengkulugift.com', '$2b$10$EP/k2.bX0P2r3D3Qc1Uq/e4l0FwRz5t1s5F6L5yZ9h8A6m5n5k5m5')
ON DUPLICATE KEY UPDATE id=id;
