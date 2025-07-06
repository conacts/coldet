# Next.js Full-Stack Architecture

## Executive Summary

This document outlines the full-stack Next.js architecture for the COLDET debt collection platform. The system uses Next.js for both frontend and backend functionality, with direct database access via Prisma ORM, eliminating the need for a separate Go API server.

## Architecture Overview

### Full-Stack Next.js Application

-   **Framework**: Next.js 15.3.4 with App Router
-   **Language**: TypeScript
-   **Database**: PostgreSQL with Prisma ORM
-   **Authentication**: NextAuth.js or custom JWT implementation
-   **Key Features**: API routes, webhooks, dynamic pages, database operations

## Architecture Pattern

### Full-Stack Next.js Application

**Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js Application                   │
│                                                         │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   Frontend      │    │      Backend API Routes     │ │
│  │   Components    │    │                             │ │
│  │                 │    │  /api/webhooks/email        │ │
│  │  - Dashboard    │    │  /api/webhooks/stripe       │ │
│  │  - Debtor Pages │    │  /api/webhooks/twilio       │ │
│  │  - Payment UI   │    │  /api/debtors/[token]       │ │
│  │                 │    │  /api/communications/send   │ │
│  └─────────────────┘    │  /api/payments/create-link  │ │
│                         │  /api/tracking/page-view    │ │
│                         └─────────────────────────────┘ │
│                                      │                  │
└──────────────────────────────────────┼──────────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │   PostgreSQL    │
                              │   (via Prisma)  │
                              └─────────────────┘
```

**API Routes Structure:**

```typescript
// Webhook endpoints
POST / api / webhooks / email; // AWS SES email webhooks
POST / api / webhooks / stripe; // Stripe payment webhooks
POST / api / webhooks / twilio; // Twilio voice/SMS webhooks

// API endpoints
GET / api / debtors / [id]; // Get debtor by unique token
PUT / api / debtors / [id]; // Update debtor information
POST / api / emails / send; // Send email via AWS SES
POST / api / calls / outbound; // Initiate outbound call
GET / api / communications / [debtorId]; // Get communication history
POST / api / payments / create - link; // Create Stripe payment link
GET / api / payments / [debtorId]; // Get payment history

// Dynamic debtor pages (Next.js pages)
GET / debtor / [id]; // Debtor landing page
GET / pay / [id]; // Payment page
GET / info / [id]; // Account information page
```

**Benefits:**

-   Single codebase for frontend and backend
-   Full TypeScript type safety throughout
-   Shared types between client and server
-   Simplified deployment and development
-   Built-in Next.js optimizations
-   No API client management needed

**Operation Types:**

| Operation Type     | Implementation        | Location                 |
| ------------------ | --------------------- | ------------------------ |
| Dashboard data     | Direct DB queries     | Server Components        |
| Reports/Analytics  | Direct DB queries     | Server Components        |
| Simple CRUD        | Direct DB queries     | Server/Client Components |
| AI Operations      | External API calls    | API Routes               |
| Webhook Processing | External integrations | API Routes               |
| Payment Processing | Stripe integration    | API Routes               |
| Bulk Operations    | Direct DB queries     | API Routes               |

## API Design Patterns

### Next.js API Routes

**API Route Structure:**

```typescript
// Webhook routes
POST / api / webhooks / email; // AWS SES webhook
POST / api / webhooks / stripe; // Stripe webhook
POST / api / webhooks / twilio; // Twilio webhook

// Debtor management
GET / api / debtors / [token]; // Get debtor info
PUT / api / debtors / [token]; // Update debtor

// Communications
POST / api / communications / send; // Send email/SMS
GET / api / communications / [debtorId]; // Get communication history

// Payments
POST / api / payments / create - link; // Create payment link
GET / api / payments / [debtorId]; // Get payment history

// AI Operations
POST / api / ai / generate - response; // Generate AI response
POST / api / ai / analyze - sentiment; // Analyze communication sentiment