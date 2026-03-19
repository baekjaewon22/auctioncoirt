-- MySQL 용 스키마 (크롤러 전용)
-- 사용법: mysql -u root auctioncourt < db/schema.sql

CREATE DATABASE IF NOT EXISTS auctioncourt DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE auctioncourt;

CREATE TABLE IF NOT EXISTS courts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  court_code VARCHAR(10) NOT NULL UNIQUE,
  court_name VARCHAR(50) NOT NULL,
  region VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS auction_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  case_no VARCHAR(30) NOT NULL,
  item_no INT DEFAULT 1,
  court_id INT NOT NULL,

  address_full VARCHAR(500),
  sido VARCHAR(20),
  sigu VARCHAR(30),
  dong VARCHAR(30),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),

  item_type VARCHAR(30),
  item_detail VARCHAR(200),
  land_area DECIMAL(12,2),
  building_area DECIMAL(12,2),
  floor_info VARCHAR(50),

  appraisal_price BIGINT,
  min_bid_price BIGINT,
  bid_rate DECIMAL(5,2),

  sale_date DATE,
  sale_time TIME,

  status VARCHAR(20),
  fail_count INT DEFAULT 0,

  winning_price BIGINT,
  winning_rate DECIMAL(5,2),

  appraisal_pdf_url VARCHAR(500),
  survey_pdf_url VARCHAR(500),
  spec_pdf_url VARCHAR(500),

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_case_item (case_no, item_no),
  FOREIGN KEY (court_id) REFERENCES courts(id),
  INDEX idx_sido_sigu (sido, sigu),
  INDEX idx_item_type (item_type),
  INDEX idx_sale_date (sale_date),
  INDEX idx_price (appraisal_price),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS sale_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  auction_item_id BIGINT NOT NULL,
  sale_date DATE,
  min_bid_price BIGINT,
  result VARCHAR(20),
  winning_price BIGINT,
  bidder_count INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (auction_item_id) REFERENCES auction_items(id),
  UNIQUE KEY uk_item_date (auction_item_id, sale_date)
);

CREATE TABLE IF NOT EXISTS tenants (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  auction_item_id BIGINT NOT NULL,
  tenant_type VARCHAR(20),
  deposit BIGINT,
  move_in_date DATE,
  is_priority BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (auction_item_id) REFERENCES auction_items(id)
);

CREATE TABLE IF NOT EXISTS region_codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sido_code VARCHAR(5),
  sido_name VARCHAR(20),
  sigu_code VARCHAR(5),
  sigu_name VARCHAR(30),
  dong_code VARCHAR(5),
  dong_name VARCHAR(30),
  UNIQUE KEY uk_region (sido_code, sigu_code, dong_code)
);
