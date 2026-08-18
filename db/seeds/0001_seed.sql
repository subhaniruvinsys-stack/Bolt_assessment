-- Seed Data for Bolt OTP Login & Checkout
-- Execute this script in your Supabase SQL Editor to seed test data

-- 1. Insert Sample Registered Shoppers
INSERT INTO users (id, email, first_name, last_name, login_code, code_expires_at, created_at)
VALUES 
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'alex.smith@example.com',
    'Alex',
    'Smith',
    '123456',
    NOW() + INTERVAL '10 days',
    NOW()
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'jane.doe@example.com',
    'Jane',
    'Doe',
    '654321',
    NOW() + INTERVAL '10 days',
    NOW()
  ),
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'bolt.shopper@example.com',
    'Bolt',
    'Shopper',
    '888888',
    NOW() + INTERVAL '10 days',
    NOW()
  )
ON CONFLICT (email) DO UPDATE SET
  login_code = EXCLUDED.login_code,
  code_expires_at = EXCLUDED.code_expires_at;

-- 2. Insert Sample Orders
INSERT INTO orders (id, user_id, email, phone, shipping_address, idempotency_key, created_at)
VALUES
  (
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'alex.smith@example.com',
    '+1 (555) 234-5678',
    '{"fullName": "Alex Smith", "street": "500 Howard Street", "city": "San Francisco", "state": "CA", "zipCode": "94105", "country": "United States"}'::jsonb,
    'seed_key_alex_001',
    NOW() - INTERVAL '1 day'
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    NULL,
    'guest.shopper@example.com',
    '+1 (555) 987-6543',
    '{"fullName": "Guest Shopper", "street": "742 Evergreen Terrace", "city": "Springfield", "state": "IL", "zipCode": "62701", "country": "United States"}'::jsonb,
    'seed_key_guest_001',
    NOW() - INTERVAL '2 hours'
  )
ON CONFLICT (idempotency_key) DO NOTHING;
