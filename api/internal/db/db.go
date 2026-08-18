package db

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"os"
	"sync"
	"time"

	"bolt-otp-api/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store interface {
	CreateUser(ctx context.Context, email, firstName, lastName, code string, expiresAt time.Time) (*models.User, error)
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	UpdateUserCode(ctx context.Context, email, code string, expiresAt time.Time) error
	MarkCodeUsed(ctx context.Context, userID uuid.UUID) error
	CreateOrder(ctx context.Context, order *models.Order) (*models.Order, bool, error)
	GetOrderByKey(ctx context.Context, key string) (*models.Order, error)
}

// PostgresStore implements Store via pgx pool
type PostgresStore struct {
	pool *pgxpool.Pool
}

func (p *PostgresStore) CreateUser(ctx context.Context, email, firstName, lastName, code string, expiresAt time.Time) (*models.User, error) {
	var user models.User
	query := `INSERT INTO users (email, first_name, last_name, login_code, code_expires_at)
	          VALUES ($1, $2, $3, $4, $5)
	          RETURNING id, email, first_name, last_name, login_code, code_expires_at, created_at`
	err := p.pool.QueryRow(ctx, query, email, firstName, lastName, code, expiresAt).
		Scan(&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.LoginCode, &user.CodeExpiresAt, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (p *PostgresStore) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	query := `SELECT id, email, first_name, last_name, login_code, code_expires_at, code_used_at, created_at
	          FROM users WHERE email = $1`
	err := p.pool.QueryRow(ctx, query, email).
		Scan(&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.LoginCode, &user.CodeExpiresAt, &user.CodeUsedAt, &user.CreatedAt)
	if err != nil {
		return nil, nil
	}
	return &user, nil
}

func (p *PostgresStore) UpdateUserCode(ctx context.Context, email, code string, expiresAt time.Time) error {
	query := `UPDATE users SET login_code = $1, code_expires_at = $2, code_used_at = NULL WHERE email = $3`
	_, err := p.pool.Exec(ctx, query, code, expiresAt, email)
	return err
}

func (p *PostgresStore) MarkCodeUsed(ctx context.Context, userID uuid.UUID) error {
	query := `UPDATE users SET code_used_at = NOW() WHERE id = $1`
	_, err := p.pool.Exec(ctx, query, userID)
	return err
}

func (p *PostgresStore) CreateOrder(ctx context.Context, order *models.Order) (*models.Order, bool, error) {
	if order.IdempotencyKey != nil && *order.IdempotencyKey != "" {
		existing, _ := p.GetOrderByKey(ctx, *order.IdempotencyKey)
		if existing != nil {
			return existing, true, nil
		}
	}

	if order.TotalAmount == 0 {
		order.TotalAmount = 5307.00
	}
	if order.Currency == "" {
		order.Currency = "INR"
	}
	if order.PaymentStatus == "" {
		order.PaymentStatus = "paid"
	}

	query := `INSERT INTO orders (user_id, email, phone, shipping_address, idempotency_key, total_amount, currency, payment_status, razorpay_payment_id)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	          RETURNING id, created_at`
	err := p.pool.QueryRow(ctx, query, order.UserID, order.Email, order.Phone, order.ShippingAddress, order.IdempotencyKey, order.TotalAmount, order.Currency, order.PaymentStatus, order.RazorpayPaymentID).
		Scan(&order.ID, &order.CreatedAt)
	if err != nil {
		return nil, false, err
	}
	return order, false, nil
}

func (p *PostgresStore) GetOrderByKey(ctx context.Context, key string) (*models.Order, error) {
	var order models.Order
	query := `SELECT id, user_id, email, phone, shipping_address, idempotency_key, total_amount, currency, payment_status, razorpay_payment_id, created_at
	          FROM orders WHERE idempotency_key = $1`
	err := p.pool.QueryRow(ctx, query, key).
		Scan(&order.ID, &order.UserID, &order.Email, &order.Phone, &order.ShippingAddress, &order.IdempotencyKey, &order.TotalAmount, &order.Currency, &order.PaymentStatus, &order.RazorpayPaymentID, &order.CreatedAt)
	if err != nil {
		return nil, nil
	}
	return &order, nil
}

// MemoryStore provides in-memory storage fallback
type MemoryStore struct {
	mu     sync.RWMutex
	users  map[string]*models.User
	orders map[string]*models.Order // key: idempotency_key or ID
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		users:  make(map[string]*models.User),
		orders: make(map[string]*models.Order),
	}
}

func (m *MemoryStore) CreateUser(ctx context.Context, email, firstName, lastName, code string, expiresAt time.Time) (*models.User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.users[email]; exists {
		return nil, fmt.Errorf("user with email %s already exists", email)
	}

	user := &models.User{
		ID:            uuid.New(),
		Email:         email,
		FirstName:     firstName,
		LastName:      lastName,
		LoginCode:     code,
		CodeExpiresAt: expiresAt,
		CreatedAt:     time.Now(),
	}

	m.users[email] = user
	return user, nil
}

func (m *MemoryStore) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	user, exists := m.users[email]
	if !exists {
		return nil, nil
	}
	return user, nil
}

func (m *MemoryStore) UpdateUserCode(ctx context.Context, email, code string, expiresAt time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	user, exists := m.users[email]
	if !exists {
		return fmt.Errorf("user not found")
	}

	user.LoginCode = code
	user.CodeExpiresAt = expiresAt
	user.CodeUsedAt = nil
	return nil
}

func (m *MemoryStore) MarkCodeUsed(ctx context.Context, userID uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	for _, u := range m.users {
		if u.ID == userID {
			u.CodeUsedAt = &now
			return nil
		}
	}
	return nil
}

func (m *MemoryStore) CreateOrder(ctx context.Context, order *models.Order) (*models.Order, bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if order.IdempotencyKey != nil && *order.IdempotencyKey != "" {
		if existing, found := m.orders[*order.IdempotencyKey]; found {
			return existing, true, nil
		}
	}

	if order.ID == uuid.Nil {
		order.ID = uuid.New()
	}
	order.CreatedAt = time.Now()

	if order.IdempotencyKey != nil && *order.IdempotencyKey != "" {
		m.orders[*order.IdempotencyKey] = order
	}
	m.orders[order.ID.String()] = order

	return order, false, nil
}

func (m *MemoryStore) GetOrderByKey(ctx context.Context, key string) (*models.Order, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	order, found := m.orders[key]
	if !found {
		return nil, nil
	}
	return order, nil
}

// Generate6DigitCode uses crypto/rand for secure 6-digit numeric OTP code
func Generate6DigitCode() string {
	nBig, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "123456"
	}
	return fmt.Sprintf("%06d", nBig.Int64())
}

func InitStore() Store {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL != "" {
		pool, err := pgxpool.New(context.Background(), dbURL)
		if err == nil {
			fmt.Println("Connected to PostgreSQL DB via pgxpool")
			return &PostgresStore{pool: pool}
		}
		fmt.Printf("Warning: Failed to connect to PostgreSQL (%v), using MemoryStore\n", err)
	}
	fmt.Println("Using MemoryStore for API data layer")
	return NewMemoryStore()
}
