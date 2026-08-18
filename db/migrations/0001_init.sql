-- Migration 0001: Create users table
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    login_code      TEXT NOT NULL,
    code_expires_at TIMESTAMPTZ NOT NULL,
    code_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast background email recognition lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Disable Row Level Security (RLS) since backend Go API handles access control
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
