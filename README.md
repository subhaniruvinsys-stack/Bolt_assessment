# Bolt Assessment — OTP Shopper Recognition & Checkout

A full-stack, production-grade implementation of Bolt's OTP-based shopper recognition and idempotent checkout flow. Built with **Go** (`chi` + `pgx`), **PostgreSQL** (Supabase), **React** (TypeScript + Vite + Tailwind CSS v4), and **Razorpay** (test mode payment gateway).

![CI Pipeline](https://github.com/boltapp-hiring/bolt-otp-checkout/actions/workflows/ci.yml/badge.svg)

> **Live Demo**: [Frontend](https://your-app.vercel.app) · [API Health](https://your-api.up.railway.app/api/health)

---

## 🚀 Key Features

1. **Shopper Registration & OTP Generation**:
   - Collects shopper details and generates a 6-digit cryptographic verification code (`crypto/rand`) valid for 10 minutes.
   - Monospace tabular numeral visual container with one-click copy support.
2. **Intelligent Email Recognition**:
   - As a shopper types an email on the checkout form, a 400ms debounced background request hits `/api/recognize` without blocking input fields.
   - Shows a subtle skeleton loading state during lookup.
3. **Signature 6-Box OTP Verification Modal**:
   - Auto-advancing single-digit input boxes with backspace navigation and 6-digit paste support.
   - Countdown expiry timer, remaining attempt tracker (max 5 attempts per 15 min), and resend code endpoint (`/api/resend-code`).
   - "Skip for now" escape hatch to proceed as a guest.
4. **Shopper Recognition Reveal**:
   - Upon OTP verification, the shopper's name and an emerald `Bolt Recognized` checkmark badge animate directly into the sticky order summary panel.
5. **Idempotent Checkout Processing**:
   - Every order submission sends an `Idempotency-Key` header generated per checkout session.
   - Prevents duplicate order creation on network retries or repeated button clicks.
6. **Razorpay Payment Gateway (Test Mode)**:
   - Integrated Razorpay checkout flow with INR (₹) pricing.
   - Test mode — no real charges, instant payment simulation.
   - **Credentials**: Key ID: `rzp_test_TR8rObMeDervd4` | Key Secret: `gV3uKJwoCHV103hmvUcBDcGv`
7. **Dynamic Supabase Product Catalog & Cart**:
   - Products dynamically loaded from PostgreSQL database via `/api/products`.
   - Dynamic real-time cart subtotal, 18% GST calculation, and total calculation.
8. **Superadmin Portal (`/admin`)**:
   - Full CRUD dashboard to add, manage, or delete store items & collections directly in Supabase Postgres.
9. **Structured Observability & Rate Limiting**:
   - JSON request logger middleware emitting structured request metrics (method, path, status, latency, request ID).
   - In-memory rate limiter protecting verification endpoints against brute-force attacks.

---

## 🏗️ Architecture

```
frontend/          React + TypeScript (Vite)     → Vercel
  src/
    pages/Home.tsx, Register.tsx, Checkout.tsx
    components/OtpModal.tsx, OtpBoxInput.tsx, OrderSummaryPanel.tsx
    lib/api.ts                                   ← typed fetch wrapper
    types/razorpay.d.ts

api/               Go (chi + pgx)               → Railway
  cmd/server/main.go
  internal/handlers/, db/, middleware/, models/
  Dockerfile                                     ← multi-stage Alpine build

db/                PostgreSQL                    → Supabase
  migrations/0001_init.sql, 0002_orders.sql
  seeds/0001_seed.sql

.github/workflows/ci.yml                        ← go test + npm run build
```

Three distinct, independently deployable layers: **Frontend** (React), **API** (Go), **Database** (PostgreSQL).

---

## 🔑 Environment Setup

### API (`api/.env`)
```env
DATABASE_URL=postgresql://postgres:PASSWORD@db.XXX.supabase.co:5432/postgres?sslmode=require
PORT=8080
CORS_ORIGIN=http://localhost:5173        # Set to Vercel URL in production
SESSION_SECRET=bolt_dev_secret_key_12345
SECURE_COOKIES=false                     # Set to "true" in production
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8080/api   # Set to Railway URL in production
VITE_RAZORPAY_KEY_ID=rzp_test_TR8rObMeDervd4
```

---

## 🗄️ Database Schema & Seeding

### 1. Migrations
Run the migration SQL scripts in your Supabase SQL Editor:
* `db/migrations/0001_init.sql` — Creates `users` table.
* `db/migrations/0002_orders.sql` — Creates `orders` table.

### 2. Seed Data
Run `db/seeds/0001_seed.sql` in your Supabase SQL Editor to populate sample registered shoppers & orders:

| Sample Email | 6-Digit Code | Description |
|---|---|---|
| `alex.smith@example.com` | `123456` | Registered shopper |
| `jane.doe@example.com` | `654321` | Registered shopper |
| `bolt.shopper@example.com` | `888888` | Registered shopper |

---

## 💻 Local Development

### Prerequisites
- Go 1.22+
- Node.js v20+

### Run Locally
```bash
# 1. Start Go API (http://localhost:8080)
cd api
go run ./cmd/server

# 2. Start Frontend (http://localhost:5173)
cd frontend
npm install && npm run dev
```

### Run Tests
```bash
cd api && go test -v ./...
```

---

## 🚢 Deployment Guide

### 1. Database — Supabase (Already done)
Your Supabase Postgres instance with schema + seed data is already running.

### 2. Backend API — Railway

1. Push your code to GitHub
2. Go to [Railway Dashboard](https://railway.app/new) → **Deploy from GitHub Repo**
3. Select the repo → Railway auto-detects the `Dockerfile` at `api/Dockerfile`
4. Set **Root Directory** to `api`
5. Add **Environment Variables** in Railway dashboard:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:XYJ2...@db.ahryus...supabase.co:5432/postgres?sslmode=require` |
| `PORT` | `8080` |
| `CORS_ORIGIN` | `https://your-app.vercel.app` ← update after Vercel deploy |
| `SESSION_SECRET` | Any random secure string |
| `SECURE_COOKIES` | `true` |

6. Deploy → Railway gives you a URL like `https://bolt-api-production.up.railway.app`
7. Verify: `https://YOUR-RAILWAY-URL/api/health` should return `{"status":"ok"}`

### 3. Frontend — Vercel

1. Go to [Vercel Dashboard](https://vercel.com/new) → **Import Git Repository**
2. Select the repo
3. Set **Root Directory** to `frontend`
4. Set **Framework Preset** to `Vite`
5. Add **Environment Variables** in Vercel:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://YOUR-RAILWAY-URL/api` |
| `VITE_RAZORPAY_KEY_ID` | `rzp_test_TR8rObMeDervd4` |

6. Deploy → Vercel gives you a URL like `https://your-app.vercel.app`

### 4. Post-Deploy: Update Railway CORS
After you get your Vercel URL, go back to Railway and update:
```
CORS_ORIGIN=https://your-app.vercel.app
```
Redeploy the Railway service.

---

## 📑 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness health check |
| `GET` | `/api/ready` | Readiness probe |
| `POST` | `/api/register` | Register user & return 6-digit code |
| `POST` | `/api/recognize` | Check if email is a registered shopper |
| `POST` | `/api/login` | Verify code & create HTTP-only session |
| `POST` | `/api/resend-code` | Regenerate fresh 6-digit code |
| `GET` | `/api/me` | Return active session user |
| `POST` | `/api/logout` | Clear session cookie |
| `POST` | `/api/checkout` | Process idempotent order submission |

See full OpenAPI specification in `openapi.yaml`.

---

## 🔮 What I'd Change for Production

If scaling this service to production for millions of checkout transactions:
1. **Cryptographic Hashing of Codes**: Store `login_code` hashed using Argon2id or SHA-256 with per-user salt rather than plaintext in the database.
2. **Distributed Redis Rate Limiting**: Replace the in-memory rate limiter with a distributed Redis sliding window limiter (`token bucket`) across multiple API instances.
3. **Normalized Address Schema**: Split `shipping_address` JSONB into a normalized `addresses` table with standardized ISO country & state validation.
4. **Real SMS / Email Gateway Integration**: Wire Twilio for SMS OTPs or Resend / SendGrid for email magic links instead of displaying codes directly on screen.
5. **Production Observability**: Route the structured JSON logs to Datadog or Grafana Loki, adding OpenTelemetry distributed tracing spans across recognition and checkout handlers.
6. **Razorpay Webhook Verification**: In production, verify payment via server-side webhook signature verification (`razorpay_signature`) rather than client-side handler callback only.
7. **Server-Side Razorpay Order Creation**: Create orders via Razorpay's Orders API server-side before opening the checkout modal, ensuring amount integrity can't be tampered with client-side.
