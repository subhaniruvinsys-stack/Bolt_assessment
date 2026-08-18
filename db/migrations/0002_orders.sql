-- Migration 0002: Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    email               TEXT NOT NULL,
    phone               TEXT NOT NULL,
    shipping_address    JSONB NOT NULL,
    idempotency_key     TEXT UNIQUE,
    total_amount        NUMERIC(10, 2) DEFAULT 5307.00,
    currency            TEXT DEFAULT 'INR',
    payment_status      TEXT DEFAULT 'paid',
    razorpay_payment_id TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alter table to ensure existing tables get the new columns seamlessly
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2) DEFAULT 5307.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- Indexes for email lookup and idempotency key uniqueness check
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders(idempotency_key);

-- Disable Row Level Security (RLS) since backend Go API handles access control
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

