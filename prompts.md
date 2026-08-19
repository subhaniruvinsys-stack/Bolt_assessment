# Prompts used

Built with Google Gemini as the primary AI pair-programming assistant.

## Backend (Go + Postgres)

1. "Scaffold a Go module using chi router with /health and /ready endpoints,
   structured as cmd/server/main.go + internal/handlers, internal/db,
   internal/middleware packages. Include a Makefile with `run` and `test`
   targets."

2. "Set up a pgx connection pool reading DATABASE_URL from env, with a
   graceful shutdown on SIGTERM. Add a golang-migrate setup pointing at
   db/migrations."

3. "Write migration 0001_init.sql creating a users table: id uuid pk default
   gen_random_uuid(), email unique not null, first_name, last_name,
   login_code text, code_expires_at timestamptz not null, code_used_at
   timestamptz, created_at timestamptz default now()."

4. "Write migration 0002_orders.sql creating an orders table with id uuid
   pk, nullable user_id fk to users, email, phone, shipping_address jsonb,
   idempotency_key text unique, created_at."

5. "Implement POST /api/register in Go: validate email/first/last name are
   present, generate a random 6-digit numeric code (crypto/rand, not
   math/rand), set code_expires_at to now()+10min, insert the user, return
   {code} in the response. Return 409 if email already registered."

6. "Implement POST /api/recognize: body {email}, return {recognized: bool}
   based on whether a user with that email exists. Single indexed lookup,
   keep it fast."

7. "Implement POST /api/login: body {email, code}. Reject if code is
   expired or already used. On match, create a signed HTTP-only session
   cookie and return {firstName, lastName}. On mismatch, 401 with a
   generic error message. Add a simple in-memory rate limiter: max 5
   attempts per email per 15 minutes, return 429 with a retry-after
   seconds field once exceeded."

8. "Implement GET /api/me returning the session user if present, 401
   otherwise. Implement POST /api/logout clearing the session cookie."

9. "Implement POST /api/checkout: body {email, phone, shippingAddress},
   reading an Idempotency-Key header. If an order with that key already
   exists, return the existing order instead of creating a duplicate.
   Attach user_id if a session exists, otherwise insert as guest."

10. "Add a POST /api/resend-code endpoint: generates a fresh 6-digit code
    for the given email, resets code_expires_at to now()+10min, and
    returns the new code to display."

11. "Add structured JSON request logging middleware in Go (method, path,
    status, latency, request id) — note in the README this would ship to
    Datadog in production."

12. "Add table-driven Go tests for /register (happy path, duplicate
    email), /login (correct code, wrong code, expired code), and
    /checkout (idempotency key reused returns the same order)."

13. "Set up a GitHub Actions workflow (.github/workflows/ci.yml) that runs
    `go test ./...` in api/ and `npm run build` in frontend/ on every push
    and pull request."

14. "Write an openapi.yaml documenting /api/register, /api/recognize,
    /api/login, /api/logout, /api/checkout, /api/resend-code, and
    /api/me — request/response schemas, status codes, and the
    Idempotency-Key header on checkout."

## Frontend (React + TypeScript + shadcn/ui)

15. "Scaffold a Vite + React + TypeScript app, run shadcn/ui init with
    Tailwind, add dialog, input, button, sonner, skeleton, badge, avatar
    components. Configure the Tailwind theme with canvas #F6F7F9, ink
    #12131A, primary #4338CA, success #10B981, error #E11D48."

16. "Build the Register page: form for email/firstName/lastName, POST to
    /api/register on submit, display the returned 6-digit code in a
    monospace/tabular-nums style with a note that it's needed to log in
    later."

17. "Build the Checkout page as a two-column layout: form on the left, a
    sticky order summary panel on the right. Add real-time email
    validation with a 400ms debounce; once the email looks complete, fire
    /api/recognize in the background without blocking the rest of the
    form, showing a skeleton while it's in flight."

18. "Build an OtpBoxInput component: 6 separate single-digit boxes,
    auto-advance focus on input, backspace moves focus back, paste of a
    6-digit string fills all boxes at once, and an onComplete callback
    fires when all 6 are filled."

19. "Build OtpModal using OtpBoxInput: shown when recognize returns true,
    submit calls /api/login, shows inline error and remaining-attempts
    state on 401, includes a 'skip for now' text link that just closes
    the modal, a countdown showing code expiry (disable submit at zero),
    and a 'Resend code' button that calls /api/resend-code."

20. "Wire up shadcn's sonner toast for checkout success and for login
    errors, replacing any inline alert boxes."

21. "On successful login, close the modal, refetch /api/me, and animate
    the shopper's first name and a checkmark badge into the sticky order
    summary panel."

22. "Wire the checkout submit button to POST /api/checkout with the form
    state and a generated Idempotency-Key header (persist the key in
    component state so retries reuse it), show a success toast, and reset
    the form."

## Review Pass

23. "Review the Go handlers for missing input validation, SQL injection
    risk, and missing CORS config for the Vercel origin with credentials
    enabled. Suggest fixes."

## UI Overhaul & Payment Gateway

24. "Create a Home landing page for the application with a premium dark theme,
    fraunces serif typography, glassmorphism feature cards, floating animated
    orbs, and clear navigation CTAs."

25. "Integrate Razorpay test mode payment gateway with INR (₹) pricing, loading
    checkout.js dynamically on demand, pre-filling shopper details, and passing
    the razorpay_payment_id back to the backend checkout endpoint."

26. "Update database migration 0002_orders.sql to dynamically store total_amount,
    currency, payment_status, and razorpay_payment_id in Postgres."

27. "Configure Dockerfile for Railway backend deployment and set up SameSite=None
    and Secure=true cookies for cross-origin authentication between Vercel and Railway."

## Database & Production Deployment (CockroachDB Cloud & Railway)

28. "Migrate database setup from Supabase to CockroachDB Cloud Serverless (ap-south-1 Mumbai),
    verify pgx connection pool compatibility, and write migration runner for 0001_init.sql,
    0002_orders.sql, 0003_products.sql, and 0001_seed.sql."

29. "Build Superadmin Portal (/admin) with fixed credentials protection (admin@bolt.com / admin123),
    providing full CRUD capabilities for catalog items and store collections stored dynamically in PostgreSQL."

30. "Update Go CORS middleware with AllowOriginFunc to dynamically validate and accept any *.vercel.app
    frontend deployment domain and Railway backend previews."

31. "Update root and api Dockerfiles with working-directory checks (cd api) to support both root
    and subdirectory build contexts on Railway."