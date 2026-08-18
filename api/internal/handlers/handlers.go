package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"bolt-otp-api/internal/db"
	"bolt-otp-api/internal/middleware"
	"bolt-otp-api/internal/models"
)

type Handler struct {
	store       db.Store
	rateLimiter *middleware.RateLimiter
}

func NewHandler(store db.Store) *Handler {
	return &Handler{
		store:       store,
		rateLimiter: middleware.NewRateLimiter(5, 15*time.Minute), // 5 attempts per 15 min
	}
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, errStr, message string) {
	writeJSON(w, status, models.ErrorResponse{
		Error:   errStr,
		Message: message,
	})
}

// Health check endpoints
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "timestamp": time.Now().Format(time.RFC3339)})
}

func (h *Handler) Ready(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "bolt-otp-api"})
}

// POST /api/register
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "Invalid JSON request body")
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	firstName := strings.TrimSpace(req.FirstName)
	lastName := strings.TrimSpace(req.LastName)

	if email == "" || firstName == "" || lastName == "" {
		writeError(w, http.StatusUnprocessableEntity, "validation_error", "Email, firstName, and lastName are required")
		return
	}

	existing, _ := h.store.GetUserByEmail(r.Context(), email)
	if existing != nil {
		writeError(w, http.StatusConflict, "user_exists", "A user with this email address is already registered")
		return
	}

	code := db.Generate6DigitCode()
	expiresAt := time.Now().Add(10 * time.Minute)

	user, err := h.store.CreateUser(r.Context(), email, firstName, lastName, code, expiresAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", "Failed to create user")
		return
	}

	writeJSON(w, http.StatusCreated, models.RegisterResponse{
		Code:      user.LoginCode,
		Email:     user.Email,
		ExpiresAt: user.CodeExpiresAt,
		Message:   "User registered successfully. Use the provided 6-digit code to log in.",
	})
}

// POST /api/recognize
func (h *Handler) Recognize(w http.ResponseWriter, r *http.Request) {
	var req models.RecognizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "Invalid JSON request body")
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" {
		writeJSON(w, http.StatusOK, models.RecognizeResponse{Recognized: false, Email: ""})
		return
	}

	user, err := h.store.GetUserByEmail(r.Context(), email)
	if err != nil || user == nil {
		writeJSON(w, http.StatusOK, models.RecognizeResponse{Recognized: false, Email: email})
		return
	}

	writeJSON(w, http.StatusOK, models.RecognizeResponse{Recognized: true, Email: email})
}

// POST /api/login
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "Invalid JSON request body")
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	code := strings.TrimSpace(req.Code)

	if email == "" || code == "" {
		writeError(w, http.StatusUnprocessableEntity, "validation_error", "Email and code are required")
		return
	}

	// Rate limiting check
	allowed, attempts, retryAfter := h.rateLimiter.Allow(email)
	if !allowed {
		w.Header().Set("Retry-After", string(rune(int(retryAfter.Seconds()))))
		writeError(w, http.StatusTooManyRequests, "rate_limit_exceeded", "Too many failed attempts. Please wait 15 minutes before trying again.")
		return
	}

	user, err := h.store.GetUserByEmail(r.Context(), email)
	if err != nil || user == nil {
		writeError(w, http.StatusUnauthorized, "invalid_code", "Invalid email or verification code")
		return
	}

	if time.Now().After(user.CodeExpiresAt) {
		writeError(w, http.StatusUnauthorized, "code_expired", "The verification code has expired. Please request a new code.")
		return
	}

	if user.CodeUsedAt != nil {
		writeError(w, http.StatusUnauthorized, "code_used", "This verification code has already been used. Please request a new code.")
		return
	}

	if user.LoginCode != code {
		remaining := 5 - attempts
		writeError(w, http.StatusUnauthorized, "invalid_code", map[string]interface{}{
			"message":           "Invalid verification code",
			"remainingAttempts": remaining,
		}["message"].(string))
		return
	}

	// Code match! Reset rate limiter and mark code used
	h.rateLimiter.Reset(email)
	_ = h.store.MarkCodeUsed(r.Context(), user.ID)

	// Set session cookie — SameSite=None + Secure for cross-origin (Vercel→Railway)
	sameSite := http.SameSiteLaxMode
	secure := false
	if os.Getenv("SECURE_COOKIES") == "true" {
		sameSite = http.SameSiteNoneMode
		secure = true
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    user.Email,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
		Expires:  time.Now().Add(24 * time.Hour),
	})

	writeJSON(w, http.StatusOK, models.LoginResponse{
		Authenticated: true,
		FirstName:     user.FirstName,
		LastName:      user.LastName,
		Email:         user.Email,
	})
}

// POST /api/resend-code
func (h *Handler) ResendCode(w http.ResponseWriter, r *http.Request) {
	var req models.ResendCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "Invalid JSON request body")
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" {
		writeError(w, http.StatusUnprocessableEntity, "validation_error", "Email is required")
		return
	}

	user, err := h.store.GetUserByEmail(r.Context(), email)
	if err != nil || user == nil {
		writeError(w, http.StatusNotFound, "user_not_found", "No account found with this email address")
		return
	}

	newCode := db.Generate6DigitCode()
	expiresAt := time.Now().Add(10 * time.Minute)

	if err := h.store.UpdateUserCode(r.Context(), email, newCode, expiresAt); err != nil {
		writeError(w, http.StatusInternalServerError, "db_error", "Failed to regenerate verification code")
		return
	}

	writeJSON(w, http.StatusOK, models.ResendCodeResponse{
		Code:      newCode,
		ExpiresAt: expiresAt,
		Message:   "A new 6-digit code has been generated.",
	})
}

// GET /api/me
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session")
	if err != nil || cookie.Value == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Not logged in")
		return
	}

	user, err := h.store.GetUserByEmail(r.Context(), cookie.Value)
	if err != nil || user == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Session expired or user not found")
		return
	}

	writeJSON(w, http.StatusOK, models.LoginResponse{
		Authenticated: true,
		FirstName:     user.FirstName,
		LastName:      user.LastName,
		Email:         user.Email,
	})
}

// POST /api/logout
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	sameSite := http.SameSiteLaxMode
	secure := false
	if os.Getenv("SECURE_COOKIES") == "true" {
		sameSite = http.SameSiteNoneMode
		secure = true
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	})

	writeJSON(w, http.StatusOK, map[string]string{"message": "Logged out successfully"})
}

// POST /api/checkout
func (h *Handler) Checkout(w http.ResponseWriter, r *http.Request) {
	var req models.CheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "Invalid JSON request body")
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	phone := strings.TrimSpace(req.Phone)

	if email == "" || phone == "" {
		writeError(w, http.StatusUnprocessableEntity, "validation_error", "Email and phone are required")
		return
	}

	idempotencyKey := r.Header.Get("Idempotency-Key")

	var keyPtr *string
	if idempotencyKey != "" {
		keyPtr = &idempotencyKey
	}

	var userIDPtr *models.User
	cookie, err := r.Cookie("session")
	if err == nil && cookie.Value != "" {
		user, _ := h.store.GetUserByEmail(r.Context(), cookie.Value)
		if user != nil {
			userIDPtr = user
		}
	}

	var rzpPtr *string
	if req.RazorpayPaymentID != "" {
		rzpPtr = &req.RazorpayPaymentID
	}

	totalAmt := req.TotalAmount
	if totalAmt <= 0 {
		totalAmt = 5307.00
	}

	order := &models.Order{
		Email:             email,
		Phone:             phone,
		ShippingAddress:   req.ShippingAddress,
		IdempotencyKey:    keyPtr,
		RazorpayPaymentID: rzpPtr,
		TotalAmount:       totalAmt,
		Currency:          "INR",
		PaymentStatus:     "paid",
	}

	if userIDPtr != nil {
		order.UserID = &userIDPtr.ID
	}

	createdOrder, isDuplicate, err := h.store.CreateOrder(r.Context(), order)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "checkout_failed", "Failed to process checkout order")
		return
	}

	if isDuplicate {
		writeJSON(w, http.StatusOK, models.CheckoutResponse{
			OrderID:   createdOrder.ID,
			Status:    "confirmed",
			Message:   "Order already processed (idempotent submission)",
			Duplicate: true,
		})
		return
	}

	writeJSON(w, http.StatusCreated, models.CheckoutResponse{
		OrderID:   createdOrder.ID,
		Status:    "confirmed",
		Message:   "Order placed successfully!",
		Duplicate: false,
	})
}
