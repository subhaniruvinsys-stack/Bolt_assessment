package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"bolt-otp-api/internal/db"
	"bolt-otp-api/internal/handlers"
	"bolt-otp-api/internal/middleware"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	store := db.InitStore()
	h := handlers.NewHandler(store)

	r := chi.NewRouter()

	// Middlewares
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.RequestLogger)
	r.Use(middleware.SessionMiddleware("bolt-secret-key-change-in-prod"))

	// CORS configuration
	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "http://localhost:5173"
	}

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{corsOrigin, "http://localhost:5173", "http://127.0.0.1:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "Idempotency-Key"},
		ExposedHeaders:   []string{"Link", "Retry-After"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// API Routes
	r.Route("/api", func(r chi.Router) {
		r.Get("/health", h.Health)
		r.Get("/ready", h.Ready)

		r.Post("/register", h.Register)
		r.Post("/recognize", h.Recognize)
		r.Post("/login", h.Login)
		r.Post("/resend-code", h.ResendCode)
		r.Get("/me", h.Me)
		r.Post("/logout", h.Logout)
		r.Get("/products", h.GetProducts)
		r.Post("/admin/products", h.CreateProduct)
		r.Delete("/admin/products/{id}", h.DeleteProduct)
		r.Post("/checkout", h.Checkout)
	})

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		fmt.Printf("⚡ Bolt OTP API server running on http://localhost:%s\n", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Graceful shutdown handling
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	fmt.Println("\nShutting down server gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced shutdown: %v", err)
	}

	fmt.Println("Server exited cleanly.")
}
