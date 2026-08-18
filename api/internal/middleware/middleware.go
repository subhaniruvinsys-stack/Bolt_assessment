package middleware

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
)

type contextKey string

const SessionUserKey contextKey = "sessionUser"

// RateLimiter manages in-memory rate limiting per email/IP
type RateLimiter struct {
	mu          sync.Mutex
	attempts    map[string][]time.Time
	maxAttempts int
	window      time.Duration
}

func NewRateLimiter(maxAttempts int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		attempts:    make(map[string][]time.Time),
		maxAttempts: maxAttempts,
		window:      window,
	}

	// Periodic cleanup of expired entries
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			rl.mu.Lock()
			now := time.Now()
			for k, v := range rl.attempts {
				var valid []time.Time
				for _, t := range v {
					if now.Sub(t) < window {
						valid = append(valid, t)
					}
				}
				if len(valid) == 0 {
					delete(rl.attempts, k)
				} else {
					rl.attempts[k] = valid
				}
			}
			rl.mu.Unlock()
		}
	}()

	return rl
}

func (rl *RateLimiter) Allow(key string) (bool, int, time.Duration) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	timestamps := rl.attempts[key]

	var valid []time.Time
	for _, t := range timestamps {
		if now.Sub(t) < rl.window {
			valid = append(valid, t)
		}
	}

	if len(valid) >= rl.maxAttempts {
		oldest := valid[0]
		retryAfter := rl.window - now.Sub(oldest)
		return false, len(valid), retryAfter
	}

	rl.attempts[key] = append(valid, now)
	return true, len(valid) + 1, 0
}

func (rl *RateLimiter) Reset(key string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	delete(rl.attempts, key)
}

// RequestLogger outputs structured JSON log entries
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		reqID := uuid.New().String()
		ww := &responseWriterWrapper{ResponseWriter: w, statusCode: http.StatusOK}

		r.Header.Set("X-Request-ID", reqID)
		ww.Header().Set("X-Request-ID", reqID)

		next.ServeHTTP(ww, r)

		logEntry := map[string]interface{}{
			"timestamp":  start.Format(time.RFC3339),
			"requestId":  reqID,
			"method":     r.Method,
			"path":       r.URL.Path,
			"status":     ww.statusCode,
			"durationMs": time.Since(start).Milliseconds(),
			"remoteAddr": r.RemoteAddr,
			"userAgent":  r.UserAgent(),
		}

		logBytes, _ := json.Marshal(logEntry)
		log.Println(string(logBytes))
	})
}

type responseWriterWrapper struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriterWrapper) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// SessionMiddleware extracts email from signed cookie
func SessionMiddleware(sessionSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("session")
			if err == nil && cookie.Value != "" {
				ctx := context.WithValue(r.Context(), SessionUserKey, cookie.Value)
				r = r.WithContext(ctx)
			}
			next.ServeHTTP(w, r)
		})
	}
}
