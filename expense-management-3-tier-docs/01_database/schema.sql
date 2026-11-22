-- RECONSTRUCTED schema based on columns used by backend/server.js.
-- This is not a verified export of the live transactions database.
-- Inspect the existing table with: SHOW CREATE TABLE expenses;

CREATE DATABASE IF NOT EXISTS transactions;
USE transactions;

CREATE TABLE IF NOT EXISTS expenses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NULL,
    expense_date DATE NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_expenses_date_id (expense_date, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
