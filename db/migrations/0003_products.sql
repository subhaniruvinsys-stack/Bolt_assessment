-- Migration 0003: Create products table for dynamic store collection
CREATE TABLE IF NOT EXISTS products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price       NUMERIC(10, 2) NOT NULL,
    category    TEXT NOT NULL DEFAULT 'Apparel',
    image_emoji TEXT NOT NULL DEFAULT '📦',
    stock       INT NOT NULL DEFAULT 100,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for category lookups
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Disable RLS since API handles authorization
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Insert initial catalog
INSERT INTO products (name, description, price, category, image_emoji, stock) VALUES
('Classic Cotton Tee', 'Size: M | Color: Navy', 2999.00, 'Apparel', '👕', 50),
('Minimalist Cap', 'Color: Charcoal', 1499.00, 'Accessories', '🧢', 75),
('Leather Zip Wallet', 'Genuine Grain Leather', 1999.00, 'Accessories', '👛', 30),
('Wireless Studio Earbuds', 'Noise Cancellation', 4999.00, 'Electronics', '🎧', 20),
('Urban Denim Jacket', 'Vintage Wash Cotton', 5999.00, 'Apparel', '🧥', 15)
ON CONFLICT DO NOTHING;
