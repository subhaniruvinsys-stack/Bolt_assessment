# Bolt Assessment — OTP-Based User Login — Implementation Plan
## Implementation Plan — Bolt OTP Login Assignment (2-day budget, ~7–8 focused hrs/day)

### Day 1 — Backend + data layer first (this is what's actually graded)

1. **Scaffold Go module** — `chi` router, `/health` + `/ready` endpoints, CORS middleware, Makefile with `run`/`test` targets.
2. **Wire Postgres** — `pgx` connection pool reading `DATABASE_URL`, `golang-migrate` setup pointing at `db/migrations`.
3. **Migrations** — `0001_init.sql` (users table with `code_expires_at`), `0002_orders.sql` (orders table with `idempotency_key`). Run both against Supabase.
4. **Core handlers** — `/register`, `/recognize`, `/login` (with in-memory rate limiter: 5 attempts/15min), `/me`, `/logout`, `/checkout` (idempotency-key check), `/resend-code`.
5. **Cross-cutting** — structured JSON request logging middleware.
6. **Tests** — table-driven Go tests: register happy/duplicate, login correct/wrong/expired, checkout idempotency reuse.
7. **CI + repo hygiene** — GitHub Actions workflow (`go test`), `openapi.yaml` spec, push repo and add `boltapp-hiring` as collaborator **now**, not at the deadline.

### Day 2 — Frontend + integration + deploy

8. **Scaffold frontend** — Vite + React + TS, `shadcn/ui` init with Tailwind, theme tokens (canvas `#F6F7F9`, ink `#12131A`, primary `#4338CA`, success `#10B981`, error `#E11D48`), `lib/api.ts` fetch wrapper.
9. **Registration page** — form → POST `/register` → display code in monospace/tabular-nums.
10. **Checkout page** — two-column layout (form + sticky order-summary panel), debounced email validation → background `/recognize` call, skeleton while in flight.
11. **OTP UI** — `OtpBoxInput` (6-box, auto-advance, paste support) + `OtpModal` (skip link, error/attempts state, expiry countdown, resend button).
12. **Feedback layer** — `sonner` toasts for success/error states.
13. **Recognition reveal** — on login success, animate name + checkmark badge into the summary panel.
14. **Checkout submit** — POST `/checkout` with generated `Idempotency-Key` header, success toast, form reset.
15. **Deploy** — Supabase (DB) → Render (Go API) → Vercel (frontend, `VITE_API_URL` pointed at Render URL), CORS locked to the Vercel origin with credentials enabled.
16. **Wrap-up** — `README.md` (including a short "what I'd change for production" paragraph) + final pass on `prompts.md`.

### Priority if time runs short
Core flow (register → recognize → OTP login → checkout write) beats every add-on. If something has to be cut, cut in this order: resend code → expiry countdown → dark polish → openapi.yaml — never the idempotency key, rate limiter, or CI, since those three map directly to what the JD says the team actually does.


## 0. What's actually being asked (in plain terms)

Two flows, one app:

1. **Registration** — collect email/first/last name → generate a random 6-digit code → show it on screen (no email delivery needed).
2. **Checkout with recognition** — a checkout form (email, phone, shipping address). As soon as the email field is a valid, complete email, fire a background "is this a known user?" check without blocking the rest of the form. If recognized, pop a modal asking for the 6-digit code (with a "skip" escape hatch). Correct code → log in, close modal, show name at top of form, continue checkout. Submitting the form just writes a row to a DB table — no real payment.

Deliverables: public URL, GitHub repo (access for `boltapp-hiring`, schema as `.sql` files), and a `prompts.md` listing every LLM prompt used.

This maps almost 1:1 onto what the actual Bolt role does day to day (shopper recognition, checkout, Postgres schemas) — so the assignment doubles as your audition for exactly this job. Treat it that way.

---

## 1. Tech stack — recommendation

| Layer | Choice | Why |
|---|---|---|
| Frontend | **React + TypeScript + Vite** | Matches JD ("React or similar"), fast to scaffold, deploys trivially to Vercel |
| UI layer | **Tailwind CSS + shadcn/ui** (Radix primitives) | Gets you accessible, polished components (Dialog, Input, Toast, Skeleton) for free instead of hand-rolling a modal — this is what "premium" actually means for a checkout: fast, accessible, unfussy, not decorated |
| Backend | **Go** (`chi` router + `pgx`) | JD explicitly wants "genuine interest in writing Go." Using Go here — not Java/Python which you already know well — is the single highest-signal decision in this whole assignment. Go's syntax is simple enough that AI-assisted dev makes the unfamiliarity a non-issue in 2 days. |
| DB | **PostgreSQL via Supabase** (free tier) | JD lists Postgres directly; Supabase gives you a hosted instance + connection string in minutes, and the assignment explicitly greenlights it |
| Migrations | **golang-migrate**, plain `.sql` files | Assignment requires schema checked in as `.sql` — this gives you clean, reviewable, versioned migration files instead of a hand-dumped schema |
| Auth | Signed **HTTP-only cookie session** (not JWT) | Simpler to reason about for a short-lived checkout session, avoids token-storage footguns, and is what you'd actually want in a real checkout — shows judgment |
| CI | **GitHub Actions** (`go test` + frontend build) | JD literally says "open PRs (with automated tests)" — a green CI badge in your README is a direct signal match |
| Backend hosting | **Render** (free web service) or **Fly.io** | Both take a Go binary via Docker or native buildpack; Render is the path of least resistance |
| Frontend hosting | **Vercel** | Zero-config for Vite/React |

Skip GraphQL — REST is faster to build correctly in 2 days and the JD lists both as acceptable ("REST/GraphQL").

---

## 2. Architecture

```
frontend/          React + TS (Vite)
  src/
    pages/Register.tsx
    pages/Checkout.tsx
    components/
      OtpModal.tsx
      OtpBoxInput.tsx      <- the signature 6-box code input
      OrderSummaryPanel.tsx
      ui/                  <- shadcn generated components
    lib/api.ts        <- fetch wrapper, VITE_API_URL
    lib/utils.ts       <- shadcn cn() helper

api/                Go
  cmd/server/main.go
  internal/
    handlers/  (register, recognize, login, checkout)
    db/        (pgx pool, queries)
    middleware/ (session, cors, logging, ratelimit)
  db/migrations/
    0001_init.sql
    0002_orders.sql

.github/workflows/ci.yml   <- go test + frontend build on every PR
prompts.md          <- log of every LLM prompt used
README.md
```

Three distinct layers as required: frontend (React), API (Go), DB (Postgres) — each independently deployable.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/register` | body: `{email, firstName, lastName}` → creates user, generates 6-digit code, returns `{code}` to display once |
| POST | `/api/recognize` | body: `{email}` → `{recognized: bool}` — called in background once email is well-formed |
| POST | `/api/login` | body: `{email, code}` → validates, sets session cookie, returns `{firstName, lastName}` |
| POST | `/api/logout` | clears session |
| POST | `/api/checkout` | body: `{email, phone, shippingAddress}` (+ `Idempotency-Key` header) → inserts order row |
| GET | `/api/me` | returns current session user if any (restores name on refresh) |
| GET | `/api/health`, `/api/ready` | liveness vs readiness — small production-instinct signal |

### Schema (`db/migrations/0001_init.sql`)

```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    login_code    TEXT NOT NULL,        -- store hashed in a real system; note this in README
    code_expires_at TIMESTAMPTZ NOT NULL,
    code_used_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

```sql
-- 0002_orders.sql
CREATE TABLE orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID REFERENCES users(id),   -- nullable: guest checkout allowed
    email             TEXT NOT NULL,
    phone             TEXT NOT NULL,
    shipping_address  JSONB NOT NULL,
    idempotency_key   TEXT UNIQUE,                 -- prevents duplicate order rows on retry/double-click
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Using `JSONB` for the address keeps the assignment fast without a fight over which address fields to normalize — mention in the README that you'd split this into a proper `addresses` table with FK in a real system.

---

## 3. UI direction — a premium, checkout-specific design system

Skip generic AI-default looks (cream + terracotta, or near-black + neon) — this is a checkout, so the design should read as fast, trustworthy, and precise, the way Stripe/Bolt's own product does. Concrete token system:

**Color**
| Token | Hex | Use |
|---|---|---|
| Canvas | `#F6F7F9` | page background — cool paper, not cream |
| Ink | `#12131A` | body text, near-black with a blue cast |
| Surface | `#FFFFFF` | cards/form panel, 1px border `#E5E7EB` |
| Primary | `#4338CA` | CTA buttons, links, focus rings — a decisive indigo, not terracotta or neon |
| Recognized/success | `#10B981` | "we know you" checkmark, success toasts |
| Error | `#E11D48` | wrong-code state, validation errors |

**Type**
- UI/body face: **Inter** (or Geist) — a clean grotesk for labels, inputs, buttons. A checkout is a functional surface; it shouldn't compete with the form for attention.
- Numeric face: **tabular numerals / JetBrains Mono** for the 6-digit code display and the OTP boxes specifically — monospace digits read as precise and secure (it's what Stripe/banks use for card numbers and codes), and it's a small detail that visually separates your build from a default template.
- One serif moment, used exactly once: a large `Fraunces` line for the post-login confirmation ("You're in.") — the single decorative flourish, spent deliberately rather than sprinkled everywhere.

**Layout**
- Desktop: two-column checkout — form on the left (~60%), a sticky order-summary panel on the right (~40%). Recognition becomes visible reward, not a black box: once login succeeds, the shopper's name and a small emerald checkmark badge slide into that summary panel instead of just closing a modal.
- Mobile: single column; the summary panel collapses to a slim bar above the form.
- Modal: centered, blurred backdrop, OTP boxes as the visual focus; "skip for now" styled as a quiet text link, not a button, so it doesn't compete with "Verify."

**Signature element**: a 6-box OTP input with auto-advance between boxes, paste support (paste a 6-digit code and it fills all boxes), and a small per-box fill animation — paired with the name-reveal in the summary panel. That's the one place motion/craft budget goes; everything else stays quiet.

**Setup**
```bash
npx shadcn@latest init
npx shadcn@latest add dialog input button sonner skeleton badge avatar
```
Radix under the hood gives you focus-trap and Esc-to-close on the modal for free — accessible by default, not bolted on.

---

## 4. Add-on features for best impression

**High-impact (do these once the core flow works — 30–90 min each):**
- Boxed 6-digit OTP input with auto-advance + paste support (the signature UI element above)
- Live "recognized" indicator on the email field — a small checkmark/avatar fading in before the modal opens, so recognition doesn't feel like a black box
- Skeleton loading state during the background `/recognize` call instead of a blank pause
- Toast notifications (shadcn `sonner`) for success/error instead of inline alert boxes
- Idempotency key on checkout submit — prevents duplicate order rows on double-click or network retry; this is a real payments-engineering concern and echoes the JD's fraud-prevention language directly
- Rate limiting on `/api/login` with a visible cooldown message ("Too many attempts — try again in 30s")
- GitHub Actions CI running `go test` + frontend build/lint on every PR, badge in the README
- A hand-written `openapi.yaml` for the API — shows you think of the API as a contract, not just a set of handlers

**Nice-to-have polish (only if time remains):**
- Code expiry countdown shown inside the modal (matches the new `code_expires_at` column)
- "Resend code" button (regenerates and redisplays, since no email is being sent)
- Structured JSON logging in the Go API — mirrors "Datadog for observability" from the JD; note in the README you'd pipe this to Datadog in production
- `/api/health` vs `/api/ready` distinction
- Dark mode toggle

---

## 5. Build sequence (2-day budget, ~7–8 focused hrs/day)

**Day 1 — backend + data layer first (this is what's actually being graded)**
1. Scaffold Go module, `chi` router, health/ready endpoints, CORS middleware.
2. Wire Supabase Postgres via `pgx` pool; write and run migrations 0001 + 0002.
3. Implement `/register`, `/login`, `/recognize`, `/me`, `/logout` with session cookies and code expiry.
4. Add rate limiting on `/login` and the idempotency key check on `/checkout`.
5. Basic tests for register + login happy path and the wrong-code/expired-code paths.
6. Set up GitHub Actions CI running the test suite. Push repo, add `boltapp-hiring` as collaborator now — don't leave this to the end.

**Day 2 — frontend + integration + deploy**
7. Scaffold Vite React+TS app, `shadcn/ui` init, `lib/api.ts` fetch wrapper.
8. Registration page → calls `/register`, displays the 6-digit code in the monospace treatment.
9. Checkout page: debounced email validation → fires `/recognize` in background without blocking other fields; skeleton while it's in flight.
10. `OtpBoxInput` + `OtpModal` — 6-box code entry, skip link, error state, expiry countdown.
11. On login success, reveal name + checkmark in the sticky order-summary panel.
12. Checkout submit → `/checkout` with idempotency header, success toast.
13. Deploy: Supabase (DB) → Render (API) → Vercel (frontend, `VITE_API_URL` pointed at Render URL).
14. Write `README.md` (including the "what I'd change for production" paragraph) and finalize `prompts.md`.

Keep a running note of every prompt as you go — reconstructing `prompts.md` from memory at the end is where people lose points on that deliverable.

---

## 6. `prompts.md` — ready-to-use prompt sequence

Copy these into your `prompts.md` as you actually use them — that's the deliverable itself.

```markdown
# Prompts used

1. "Scaffold a Go module using chi router with /health and /ready endpoints, structured
   as cmd/server/main.go + internal/handlers, internal/db, internal/middleware packages.
   Include a Makefile with `run` and `test` targets."

2. "Set up a pgx connection pool reading DATABASE_URL from env, with a graceful
   shutdown on SIGTERM. Add a golang-migrate setup pointing at db/migrations."

3. "Write migration 0001_init.sql creating a users table: id uuid pk default
   gen_random_uuid(), email unique not null, first_name, last_name, login_code text,
   code_expires_at timestamptz not null, code_used_at timestamptz, created_at
   timestamptz default now()."

4. "Write migration 0002_orders.sql creating an orders table with id uuid pk, nullable
   user_id fk to users, email, phone, shipping_address jsonb, idempotency_key text
   unique, created_at."

5. "Implement POST /api/register in Go: validate email/first/last name are present,
   generate a random 6-digit numeric code (crypto/rand, not math/rand), set
   code_expires_at to now()+10min, insert the user, return {code} in the response.
   Return 409 if email already registered."

6. "Implement POST /api/recognize: body {email}, return {recognized: bool} based on
   whether a user with that email exists. Single indexed lookup, keep it fast."

7. "Implement POST /api/login: body {email, code}. Reject if code is expired or already
   used. On match, create a signed HTTP-only session cookie and return {firstName,
   lastName}. On mismatch, 401 with a generic error message. Add a simple in-memory
   rate limiter: max 5 attempts per email per 15 minutes."

8. "Implement GET /api/me returning the session user if present, 401 otherwise.
   Implement POST /api/logout clearing the session cookie."

9. "Implement POST /api/checkout: body {email, phone, shippingAddress}, reading an
   Idempotency-Key header. If an order with that key already exists, return the
   existing order instead of creating a duplicate. Attach user_id if a session
   exists, otherwise insert as guest."

10. "Add table-driven Go tests for /register (happy path, duplicate email), /login
    (correct code, wrong code, expired code), and /checkout (idempotency key reused
    returns same order)."

11. "Set up GitHub Actions workflow that runs `go test ./...` on the api/ directory
    and `npm run build` on the frontend/ directory for every pull request."

12. "Scaffold a Vite + React + TypeScript app, run shadcn/ui init with Tailwind, add
    dialog, input, button, sonner, skeleton, badge, avatar components. Configure the
    Tailwind theme with canvas #F6F7F9, ink #12131A, primary #4338CA, success #10B981,
    error #E11D48."

13. "Build the Register page: form for email/firstName/lastName, POST to /api/register
    on submit, display the returned 6-digit code in a monospace/tabular-nums style
    with a note that it's needed to log in later."

14. "Build the Checkout page as a two-column layout: form on the left, a sticky order
    summary panel on the right. Add real-time email validation with a 400ms debounce;
    once the email looks complete, fire /api/recognize in the background without
    blocking the rest of the form, showing a skeleton while it's in flight."

15. "Build an OtpBoxInput component: 6 separate single-digit boxes, auto-advance focus
    on input, backspace moves focus back, and paste of a 6-digit string fills all
    boxes at once."

16. "Build OtpModal using the OtpBoxInput: shown when recognize returns true, submit
    calls /api/login, shows inline error and remaining-attempts state on 401, includes
    a 'skip for now' text link that just closes the modal, and a countdown showing
    code expiry. On success, close the modal and refetch /api/me, then animate the
    shopper's name and a checkmark badge into the order summary panel."

17. "Wire the checkout submit button to POST /api/checkout with the form state and a
    generated Idempotency-Key header (persist the key in component state so retries
    reuse it), show a success toast, and reset the form."

18. "Review the Go handlers for missing input validation, SQL injection risk, and
    missing CORS config for the Vercel origin with credentials enabled. Suggest fixes."
```

Adjust the wording to match what you actually type — the point of the file is an honest log, not a perfect script. Add/remove entries as your real session goes.

---

## 7. Deployment steps

1. **Supabase**: new project → copy the Postgres connection string → run `migrate -path db/migrations -database $DATABASE_URL up` locally against it once to confirm schema applies cleanly.
2. **Render**: new Web Service from your GitHub repo's `api/` directory → set `DATABASE_URL` and `SESSION_SECRET` env vars → build command `go build -o app ./cmd/server` → start command `./app`. Note the free tier spins down on idle — mention this in the README so a reviewer isn't confused by a slow first request.
3. **Vercel**: import repo, set root directory to `frontend/`, add `VITE_API_URL=https://<your-render-app>.onrender.com`.
4. **CORS**: allow your exact Vercel origin (not `*`) in the Go middleware, with credentials enabled since you're using cookies.
5. **GitHub**: add `boltapp-hiring` as a collaborator on day 1, not day 2 — access issues at the deadline are a self-inflicted wound.

---

## 8. Small touches that read as senior without costing much time

- Store `login_code` hashed (even a simple sha256) rather than plaintext — mention in README even if you keep it plain for demo speed.
- A one-paragraph "what I'd change for production" note in the README (hash the code, real email delivery, split address into its own table, GraphQL if the client needs partial fetches, real observability via Datadog). This paragraph often matters more than any extra feature — it shows you know the corners you're cutting and why.
- Commit in small, reviewable chunks with clear messages rather than one giant commit — it's what "open PRs with automated tests" in the JD is really asking you to demonstrate you're capable of.




