package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"time"

	embeddedpostgres "github.com/fergusstrange/embedded-postgres"
	"github.com/fnb/server/internal/api"
	"github.com/fnb/server/internal/middleware"
	"github.com/fnb/server/internal/sse"
	"github.com/fnb/server/internal/store"
	"github.com/go-chi/chi/v5"
)

func main() {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "fnb-secret-key-change-in-production"
	}

	databaseURL := os.Getenv("DATABASE_URL")
	var embeddedDB *embeddedpostgres.EmbeddedPostgres

	if databaseURL == "" {
		pgPort := uint32(5433)
		pgUser := "postgres"
		pgPassword := "postgres"
		pgDatabase := "fnb"

		log.Println("starting embedded PostgreSQL...")
		embeddedDB = embeddedpostgres.NewDatabase(
			embeddedpostgres.DefaultConfig().
				Port(pgPort).
				Database(pgDatabase).
				Username(pgUser).
				Password(pgPassword).
				DataPath("data/pg/data").
				BinariesPath("data/pg/bin"),
		)
		if err := embeddedDB.Start(); err != nil {
			log.Fatalf("failed to start embedded postgres: %v", err)
		}
		defer func() {
			log.Println("stopping embedded PostgreSQL...")
			if err := embeddedDB.Stop(); err != nil {
				log.Printf("error stopping embedded postgres: %v", err)
			}
		}()

		databaseURL = fmt.Sprintf("postgres://%s:%s@127.0.0.1:%d/%s?sslmode=disable",
			pgUser, pgPassword, pgPort, pgDatabase)
		log.Println("embedded PostgreSQL started")
	}

	httpPort := os.Getenv("PORT")
	if httpPort == "" {
		httpPort = "20080"
	}

	tlsPort := os.Getenv("TLS_PORT")
	if tlsPort == "" {
		tlsPort = "20443"
	}

	s, err := store.New(databaseURL)
	if err != nil {
		log.Fatalf("failed to init store: %v", err)
	}
	defer s.Close()

	authHandler := api.NewAuthHandler(s, jwtSecret)
	menuHandler := api.NewMenuHandler(s)
	adminHandler := api.NewAdminHandler(s)
	settingsHandler := api.NewSettingsHandler(s)

	if err := adminHandler.EnsureAdmin(); err != nil {
		log.Fatalf("failed to ensure admin: %v", err)
	}
	log.Println("default admin user ensured (admin / admin123)")

	if err := s.EnsureDefaultSettings(); err != nil {
		log.Fatalf("failed to ensure settings: %v", err)
	}
	log.Println("default settings ensured")

	r := chi.NewRouter()
	r.Use(middleware.CORS)

	r.Route("/api", func(r chi.Router) {
		r.Post("/auth/register", authHandler.Register)
		r.Post("/auth/login", authHandler.Login)

		r.Get("/menu", menuHandler.ListMenuItems)
		r.Get("/menu/{id}", menuHandler.GetMenuItem)
		r.Get("/categories", menuHandler.ListCategories)
		r.Get("/settings", settingsHandler.GetSettings)
		r.Get("/events", sse.DefaultBroker.ServeHTTP)

		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(jwtSecret))

			r.Post("/orders", middleware.RateLimit(menuHandler.CreateOrder))
			r.Get("/orders", menuHandler.ListOrders)
			r.Get("/orders/{id}", menuHandler.GetOrder)
		})
	})

	r.Route("/api/admin", func(r chi.Router) {
		r.Use(middleware.JWTAuth(jwtSecret))
		r.Use(middleware.AdminOnly)

		r.Get("/orders", adminHandler.ListOrders)
		r.Get("/orders/{id}", adminHandler.GetOrder)
		r.Put("/orders/{id}/status", adminHandler.UpdateOrderStatus)
		r.Put("/orders/{id}/items/{itemId}", adminHandler.UpdateOrderItem)
		r.Delete("/orders/{id}/items/{itemId}", adminHandler.DeleteOrderItem)

		r.Get("/menu", adminHandler.ListMenuItems)
		r.Post("/menu", adminHandler.CreateMenuItem)
		r.Put("/menu/{id}", adminHandler.UpdateMenuItem)
		r.Delete("/menu/{id}", adminHandler.DeleteMenuItem)

		r.Get("/categories", adminHandler.ListCategories)
		r.Post("/categories", adminHandler.CreateCategory)
		r.Put("/categories/{id}", adminHandler.UpdateCategory)
		r.Delete("/categories/{id}", adminHandler.DeleteCategory)

		r.Get("/users", adminHandler.ListUsers)
		r.Post("/users", adminHandler.CreateUser)
		r.Put("/users/{id}", adminHandler.UpdateUser)
		r.Post("/seed", adminHandler.SeedData)
		r.Put("/settings", settingsHandler.UpdateSetting)
		r.Get("/sales", adminHandler.GetSales)
		r.Get("/sales/hourly", adminHandler.GetHourlySales)
		r.Get("/sales/hourly-today", adminHandler.GetHourlySalesToday)
		r.Get("/sales/item-today", adminHandler.GetItemSalesPie)
        r.Get("/stats/today", adminHandler.GetTodayStats)
        r.Post("/ai/chat", adminHandler.Chat)
	})

	r.Route("/api/kitchen", func(r chi.Router) {
		r.Use(middleware.JWTAuth(jwtSecret))
		r.Use(middleware.KitchenOnly)

		r.Get("/orders", adminHandler.ListOrders)
		r.Get("/orders/{id}", adminHandler.GetOrder)
		r.Put("/orders/{id}/status", adminHandler.UpdateOrderStatus)
		r.Put("/orders/{id}/items/{itemId}", adminHandler.UpdateOrderItem)
	})

	go func() {
		log.Printf("HTTP server starting on :%s", httpPort)
		if err := http.ListenAndServe(":"+httpPort, r); err != nil {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	certFile := os.Getenv("TLS_CERT_FILE")
	keyFile := os.Getenv("TLS_KEY_FILE")
	if certFile != "" && keyFile != "" {
		log.Printf("HTTPS server starting on :%s", tlsPort)
		if err := http.ListenAndServeTLS(":"+tlsPort, certFile, keyFile, r); err != nil {
			log.Fatalf("HTTPS server error: %v", err)
		}
	} else {
		log.Printf("HTTPS server starting on :%s (self-signed)", tlsPort)
		cert, err := generateSelfSignedCert()
		if err != nil {
			log.Fatalf("failed to generate cert: %v", err)
		}
		listener, err := tls.Listen("tcp", ":"+tlsPort, &tls.Config{
			Certificates: []tls.Certificate{*cert},
		})
		if err != nil {
			log.Fatalf("HTTPS listener error: %v", err)
		}
		if err := http.Serve(listener, r); err != nil {
			log.Fatalf("HTTPS server error: %v", err)
		}
	}
}

func generateSelfSignedCert() (*tls.Certificate, error) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, err
	}

	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return nil, err
	}

	tmpl := &x509.Certificate{
		SerialNumber: serial,
		Subject: pkix.Name{
			Organization: []string{"FNB Dev"},
		},
		NotBefore:             time.Now(),
		NotAfter:              time.Now().Add(365 * 24 * time.Hour),
		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		IPAddresses:           []net.IP{net.ParseIP("127.0.0.1")},
	}

	certDER, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		return nil, err
	}

	certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: certDER})
	keyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(key),
	})

	tlsCert, err := tls.X509KeyPair(certPEM, keyPEM)
	if err != nil {
		return nil, err
	}

	return &tlsCert, nil
}
