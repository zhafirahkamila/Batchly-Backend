-- Batchly database schema
-- Run via: npm run db:init
-- The db-init script creates the database and USEs it before executing these statements.

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  business_name VARCHAR(150),
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingredients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  purchase_price DECIMAL(12,2) NOT NULL,
  purchase_qty DECIMAL(10,3) NOT NULL DEFAULT 1,
  purchase_unit VARCHAR(20) NOT NULL,
  price_per_base_unit DECIMAL(14,6) NOT NULL,
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  yield_qty DECIMAL(10,2) NOT NULL,
  yield_unit VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  recipe_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  qty_used DECIMAL(10,3) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS overhead_costs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  period ENUM('per_bulan','per_batch') NOT NULL DEFAULT 'per_bulan',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipe_overhead (
  id INT PRIMARY KEY AUTO_INCREMENT,
  recipe_id INT NOT NULL,
  overhead_cost_id INT NOT NULL,
  estimated_monthly_production INT NOT NULL DEFAULT 1,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (overhead_cost_id) REFERENCES overhead_costs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pricing (
  id INT PRIMARY KEY AUTO_INCREMENT,
  recipe_id INT NOT NULL UNIQUE,
  hpp_per_unit DECIMAL(12,2) NOT NULL,
  target_margin_percent DECIMAL(5,2),
  suggested_price DECIMAL(12,2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

CREATE INDEX idx_ingredients_user ON ingredients(user_id);
CREATE INDEX idx_recipes_user ON recipes(user_id);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_overhead_user ON overhead_costs(user_id);
