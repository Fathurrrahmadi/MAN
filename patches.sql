-- ============================================================
-- BACKEND PATCHES FOR HAMS v2 (React SPA)
-- Run these SQL statements to extend the database schema
-- ============================================================

-- 1. Add 'nurse' role to auth users table
USE db_auth;
ALTER TABLE users MODIFY COLUMN role ENUM('admin','staff','nurse') DEFAULT 'staff';

-- 2. Maintenance Reports table (in db_assets)
USE db_assets;

CREATE TABLE IF NOT EXISTS maintenance_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    asset_name VARCHAR(255),
    type VARCHAR(100),
    report_date DATE NOT NULL,
    description TEXT NOT NULL,
    reporter VARCHAR(100),
    status ENUM('Dilaporkan','Diperbaiki','Diganti','Selesai') DEFAULT 'Dilaporkan',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS maintenance_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    action_date DATE,
    vendor VARCHAR(100),
    cost DECIMAL(12,2) DEFAULT 0,
    duration_days INT DEFAULT 0,
    status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES maintenance_reports(id) ON DELETE CASCADE
);

-- 3. Transfer history view (db_transfers already has all records)
-- No schema change needed — just add a GET /api/transfers/history endpoint
