package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Server struct {
	db     *gorm.DB
	router *gin.Engine
}

func main() {
	// Database connection
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://user:password@localhost/coldet?sslmode=disable"
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto-migrate database tables
	db.AutoMigrate(&Debtor{}, &Communication{}, &Payment{}, &PageView{})

	server := &Server{
		db:     db,
		router: gin.Default(),
	}

	// Setup routes
	server.setupRoutes()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, server.router))
}

func (s *Server) setupRoutes() {
	// Webhook endpoints
	s.router.POST("/webhook/email", s.handleEmailWebhook)
	s.router.POST("/webhook/stripe", s.handleStripeWebhook)
	s.router.POST("/webhook/twilio", s.handleTwilioWebhook)

	// API endpoints
	api := s.router.Group("/api")
	{
		// Debtor management
		api.GET("/debtors/:token", s.getDebtorByToken)
		api.PUT("/debtors/:token", s.updateDebtor)

		// Communication
		api.POST("/emails/send", s.sendEmail)
		api.POST("/calls/outbound", s.initiateCall)
		api.GET("/communications/:debtor_id", s.getCommunications)

		// Payments
		api.POST("/payment-links", s.createPaymentLink)
		api.GET("/payments/:debtor_id", s.getPayments)
	}

	// Dynamic pages for debtors
	s.router.GET("/debtor/:token", s.debtorLandingPage)
	s.router.GET("/pay/:token", s.debtorPaymentPage)
	s.router.GET("/info/:token", s.debtorInfoPage)

	// Page view tracking
	s.router.POST("/track/page-view", s.trackPageView)
}