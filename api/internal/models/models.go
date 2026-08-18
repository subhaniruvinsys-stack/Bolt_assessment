package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID            uuid.UUID  `json:"id"`
	Email         string     `json:"email"`
	FirstName     string     `json:"firstName"`
	LastName      string     `json:"lastName"`
	LoginCode     string     `json:"-"`
	CodeExpiresAt time.Time  `json:"codeExpiresAt"`
	CodeUsedAt    *time.Time `json:"codeUsedAt,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
}

type Product struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Price       float64   `json:"price"`
	Category    string    `json:"category"`
	ImageEmoji  string    `json:"imageEmoji"`
	Stock       int       `json:"stock"`
	CreatedAt   time.Time `json:"createdAt"`
}

type OrderItem struct {
	ProductID string  `json:"productId"`
	Name      string  `json:"name"`
	Price     float64 `json:"price"`
	Quantity  int     `json:"quantity"`
}

type Order struct {
	ID                uuid.UUID       `json:"id"`
	UserID            *uuid.UUID      `json:"userId,omitempty"`
	Email             string          `json:"email"`
	Phone             string          `json:"phone"`
	ShippingAddress   ShippingAddress `json:"shippingAddress"`
	Items             []OrderItem     `json:"items,omitempty"`
	IdempotencyKey    *string         `json:"idempotencyKey,omitempty"`
	TotalAmount       float64         `json:"totalAmount"`
	Currency          string          `json:"currency"`
	PaymentStatus     string          `json:"paymentStatus"`
	RazorpayPaymentID *string         `json:"razorpayPaymentId,omitempty"`
	CreatedAt         time.Time       `json:"createdAt"`
}

type ShippingAddress struct {
	FullName string `json:"fullName"`
	Street   string `json:"street"`
	City     string `json:"city"`
	State    string `json:"state"`
	ZipCode  string `json:"zipCode"`
	Country  string `json:"country"`
}

// Request and Response payload definitions

type RegisterRequest struct {
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

type RegisterResponse struct {
	Code      string    `json:"code"`
	Email     string    `json:"email"`
	ExpiresAt time.Time `json:"expiresAt"`
	Message   string    `json:"message"`
}

type RecognizeRequest struct {
	Email string `json:"email"`
}

type RecognizeResponse struct {
	Recognized bool   `json:"recognized"`
	Email      string `json:"email"`
}

type LoginRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

type LoginResponse struct {
	Authenticated bool   `json:"authenticated"`
	FirstName     string `json:"firstName"`
	LastName      string `json:"lastName"`
	Email         string `json:"email"`
}

type ResendCodeRequest struct {
	Email string `json:"email"`
}

type ResendCodeResponse struct {
	Code      string    `json:"code"`
	ExpiresAt time.Time `json:"expiresAt"`
	Message   string    `json:"message"`
}

type CheckoutRequest struct {
	Email             string          `json:"email"`
	Phone             string          `json:"phone"`
	ShippingAddress   ShippingAddress `json:"shippingAddress"`
	Items             []OrderItem     `json:"items,omitempty"`
	RazorpayPaymentID string          `json:"razorpayPaymentId,omitempty"`
	TotalAmount       float64         `json:"totalAmount,omitempty"`
}

type CreateProductRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Category    string  `json:"category"`
	ImageEmoji  string  `json:"imageEmoji"`
	Stock       int     `json:"stock"`
}

type CheckoutResponse struct {
	OrderID   uuid.UUID `json:"orderId"`
	Status    string    `json:"status"`
	Message   string    `json:"message"`
	Duplicate bool      `json:"duplicate,omitempty"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}
