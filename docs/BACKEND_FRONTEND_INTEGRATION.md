# Backend-Frontend Integration Architecture

## Executive Summary

This document outlines the integration architecture between the Go backend API and Next.js frontend for the COLDET debt collection platform. The system supports multiple integration patterns including direct API calls, tRPC implementation, and hybrid database access strategies.

## Current Architecture Overview

### Backend (Go API Server)
- **Framework**: Gin with GORM ORM
- **Database**: PostgreSQL with UUID primary keys
- **Port**: 8080 (configurable via PORT env var)
- **Key Features**: Webhooks, REST API, dynamic page generation

### Frontend (Next.js 15.3.4)
- **Framework**: Next.js with App Router
- **Language**: TypeScript
- **UI Library**: Radix UI components with Tailwind CSS
- **State Management**: React Hook Form with Zod validation

## Integration Patterns

### Pattern 1: Traditional REST API (Current Implementation)

**Architecture:**
```
┌─────────────────┐    HTTP/REST    ┌─────────────────┐
│   Next.js App   │ ────────────► │   Go API Server │
│   (Port 3000)   │ ◄──────────── │   (Port 8080)   │
└─────────────────┘                └─────────────────┘
                                            │
                                            ▼
                                   ┌─────────────────┐
                                   │   PostgreSQL    │
                                   └─────────────────┘
```

**Current Endpoints:**
```go
// Webhook endpoints
POST /webhook/email         // AWS SES email webhooks
POST /webhook/stripe        // Stripe payment webhooks  
POST /webhook/twilio        // Twilio voice/SMS webhooks

// API endpoints
GET  /api/debtors/:token    // Get debtor by unique token
PUT  /api/debtors/:token    // Update debtor information
POST /api/emails/send       // Send email via AWS SES
POST /api/calls/outbound    // Initiate outbound call
GET  /api/communications/:debtor_id  // Get communication history
POST /api/payment-links     // Create Stripe payment link
GET  /api/payments/:debtor_id       // Get payment history

// Dynamic debtor pages (Go serves HTML)
GET  /debtor/:token         // Debtor landing page
GET  /pay/:token           // Payment page
GET  /info/:token          // Account information page

// Tracking
POST /track/page-view      // Page view analytics
```

**Pros:**
- Simple implementation
- Clear separation of concerns
- Standard HTTP patterns
- Works with existing codebase

**Cons:**
- No type safety between frontend/backend
- Manual API client management
- Potential for API drift
- More boilerplate code

### Pattern 2: tRPC Integration (Recommended)

**Architecture:**
```
┌─────────────────┐    tRPC/HTTP    ┌─────────────────┐
│   Next.js App   │ ────────────► │   Go API Server │
│   (tRPC Client) │ ◄──────────── │  (tRPC Adapter) │
└─────────────────┘                └─────────────────┘
                                            │
                                            ▼
                                   ┌─────────────────┐
                                   │   PostgreSQL    │
                                   └─────────────────┘
```

**Implementation Strategy:**

1. **Go Backend tRPC Adapter**:
   - Create tRPC-compatible JSON-RPC HTTP handler
   - Maintain existing Gin routes for webhooks
   - Generate TypeScript types from Go structs

2. **Next.js Frontend tRPC Client**:
   - Full type safety with generated types
   - Automatic API documentation
   - Built-in error handling and caching

**Example tRPC Router Structure:**
```typescript
// Generated from Go backend
export const appRouter = {
  debtors: {
    getByToken: procedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        // Type-safe call to Go backend
      }),
    
    update: procedure
      .input(UpdateDebtorSchema)
      .mutation(async ({ input }) => {
        // Type-safe mutation
      }),
  },
  
  communications: {
    getHistory: procedure
      .input(z.object({ debtorId: z.string().uuid() }))
      .query(async ({ input }) => {
        // Get communication history
      }),
      
    sendEmail: procedure
      .input(SendEmailSchema)
      .mutation(async ({ input }) => {
        // Send email via AWS SES
      }),
  },
  
  payments: {
    createLink: procedure
      .input(CreatePaymentLinkSchema)
      .mutation(async ({ input }) => {
        // Create Stripe payment link
      }),
      
    getHistory: procedure
      .input(z.object({ debtorId: z.string().uuid() }))
      .query(async ({ input }) => {
        // Get payment history
      }),
  },
};
```

**Benefits:**
- End-to-end type safety
- Auto-generated API documentation
- Reduced boilerplate
- Better developer experience
- Automatic error handling

### Pattern 3: Hybrid Database Access (Recommended for Performance)

**Architecture:**
```
┌─────────────────┐    
│   Next.js App   │    
│                 │    Direct DB Access (Read-Heavy)
│   ┌─────────────┤    ┌─────────────────┐
│   │ DB Client   │────┤   PostgreSQL    │
│   └─────────────┤    └─────────────────┘
│                 │             │
│                 │             │ Complex Operations
│                 │             ▼
│                 │    ┌─────────────────┐
│                 │────┤   Go API Server │
└─────────────────┘    └─────────────────┘
```

**Database Access Pattern:**

**Next.js Direct Database Operations:**
```typescript
// Read-heavy operations (dashboards, reports)
const debtors = await db.debtor.findMany({
  where: { status: 'active' },
  include: {
    communications: true,
    payments: true,
  },
});

// Simple CRUD operations
const debtor = await db.debtor.update({
  where: { id: debtorId },
  data: { phone_consent: true },
});
```

**Go API Complex Operations:**
```go
// AI-powered operations
func (s *Server) generateAIResponse(c *gin.Context) {
    // Complex AI processing
    // Multi-step database operations
    // External API integrations
}

// Webhook processing
func (s *Server) handleStripeWebhook(c *gin.Context) {
    // Payment processing logic
    // Multi-table updates
    // Compliance logging
}
```

**When to Use Each:**

| Operation Type | Use Next.js | Use Go API | Reason |
|---|---|---|---|
| Dashboard data | ✅ | ❌ | Fast reads, simple queries |
| Reports/Analytics | ✅ | ❌ | Complex aggregations |
| Simple CRUD | ✅ | ❌ | Reduced latency |
| AI Operations | ❌ | ✅ | Complex processing |
| Webhook Processing | ❌ | ✅ | External integrations |
| Payment Processing | ❌ | ✅ | Security & compliance |
| Bulk Operations | ❌ | ✅ | Performance |

## Database Connection Strategy

### Next.js Database Setup

**Option 1: Prisma (Recommended)**
```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Debtor {
  id          String   @id @default(dbgenerated("gen_random_uuid()"))
  firstName   String   @map("first_name")
  lastName    String   @map("last_name")
  email       String?  @unique
  phone       String?
  // ... other fields
  
  debts         Debt[]
  communications Communication[]
  
  @@map("debtors")
}

model Debt {
  id            String   @id @default(dbgenerated("gen_random_uuid()"))
  debtorId      String   @map("debtor_id")
  totalOwed     Decimal  @map("total_owed")
  amountPaid    Decimal  @map("amount_paid")
  uniqueToken   String   @unique @map("unique_token")
  status        String   @default("active")
  // ... other fields
  
  debtor        Debtor   @relation(fields: [debtorId], references: [id])
  payments      Payment[]
  communications Communication[]
  
  @@map("debts")
}
```

**Option 2: Drizzle ORM (Alternative)**
```typescript
// db/schema.ts
import { pgTable, uuid, varchar, decimal, timestamp } from 'drizzle-orm/pg-core';

export const debtors = pgTable('debtors', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  phone: varchar('phone', { length: 20 }),
  // ... other fields
});

export const debts = pgTable('debts', {
  id: uuid('id').primaryKey().defaultRandom(),
  debtorId: uuid('debtor_id').notNull().references(() => debtors.id),
  totalOwed: decimal('total_owed', { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal('amount_paid', { precision: 10, scale: 2 }).notNull(),
  uniqueToken: varchar('unique_token', { length: 50 }).unique().notNull(),
  status: varchar('status', { length: 20 }).default('active'),
  // ... other fields
});
```

### Connection Pooling

**Next.js Connection Management:**
```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Go Connection Management:**
```go
// Already implemented in main.go
func setupDatabase() *gorm.DB {
    dsn := os.Getenv("DATABASE_URL")
    if dsn == "" {
        dsn = "postgres://user:password@localhost/coldet?sslmode=disable"
    }
    
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    
    return db
}
```

## API Design Patterns

### RESTful API Structure

**Current Go API Routes:**
```go
// Webhook routes (keep in Go for security)
POST /webhook/email         // AWS SES webhook
POST /webhook/stripe        // Stripe webhook
POST /webhook/twilio        // Twilio webhook

// API routes (can be replaced with tRPC)
GET  /api/debtors/:token    // Get debtor info
PUT  /api/debtors/:token    // Update debtor
POST /api/emails/send       // Send email
POST /api/calls/outbound    // Make call
GET  /api/communications/:debtor_id  // Get comms
POST /api/payment-links     // Create payment link
GET  /api/payments/:debtor_id       // Get payments

// Dynamic pages (keep in Go)
GET  /debtor/:token         // Debtor landing page
GET  /pay/:token           // Payment page
GET  /info/:token          // Account info page
```

### tRPC Implementation

**1. Go Backend tRPC Handler:**
```go
// trpc/handler.go
package trpc

import (
    "encoding/json"
    "net/http"
    "github.com/gin-gonic/gin"
)

type TRPCRequest struct {
    ID     string                 `json:"id"`
    Method string                 `json:"method"`
    Params map[string]interface{} `json:"params"`
}

type TRPCResponse struct {
    ID     string      `json:"id"`
    Result interface{} `json:"result,omitempty"`
    Error  *TRPCError  `json:"error,omitempty"`
}

type TRPCError struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
}

func (s *Server) handleTRPC(c *gin.Context) {
    var req TRPCRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, TRPCResponse{
            ID:    req.ID,
            Error: &TRPCError{Code: -32700, Message: "Parse error"},
        })
        return
    }
    
    // Route to appropriate handler
    switch req.Method {
    case "debtors.getByToken":
        s.handleGetDebtor(c, req)
    case "debtors.update":
        s.handleUpdateDebtor(c, req)
    case "communications.send":
        s.handleSendCommunication(c, req)
    default:
        c.JSON(http.StatusNotFound, TRPCResponse{
            ID:    req.ID,
            Error: &TRPCError{Code: -32601, Message: "Method not found"},
        })
    }
}
```

**2. Next.js tRPC Client:**
```typescript
// lib/trpc.ts
import { createTRPCNext } from '@trpc/next';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../types/api';

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: process.env.NEXT_PUBLIC_API_URL + '/trpc',
          // Optional: add auth headers
          headers() {
            return {
              // authorization: getAuthCookie(),
            };
          },
        }),
      ],
    };
  },
});
```

**3. Type-Safe API Calls:**
```typescript
// pages/debtor/[token].tsx
import { trpc } from '../../lib/trpc';

export default function DebtorPage({ token }: { token: string }) {
  const { data: debtor, isLoading, error } = trpc.debtors.getByToken.useQuery({ token });
  const updateDebtor = trpc.debtors.update.useMutation();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  const handleUpdatePhone = async (phone: string) => {
    await updateDebtor.mutateAsync({
      token,
      data: { phone },
    });
  };
  
  return (
    <div>
      <h1>{debtor.firstName} {debtor.lastName}</h1>
      <p>Balance: ${debtor.totalOwed}</p>
      {/* ... rest of component */}
    </div>
  );
}
```

## Security Considerations

### Authentication Strategy

**JWT Token Implementation:**
```go
// Go backend
func (s *Server) generateJWT(debtorID string) (string, error) {
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "sub": debtorID,
        "exp": time.Now().Add(time.Hour * 24).Unix(),
        "iat": time.Now().Unix(),
    })
    
    return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

func (s *Server) validateJWT(tokenString string) (*jwt.Token, error) {
    return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        return []byte(os.Getenv("JWT_SECRET")), nil
    })
}
```

**Next.js Auth Middleware:**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from './lib/auth';

export function middleware(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const decoded = verifyJWT(token);
    // Add user info to request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.sub);
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

export const config = {
  matcher: ['/api/:path*'],
};
```

### Database Security

**Row-Level Security (RLS):**
```sql
-- Enable RLS on sensitive tables
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Policy for debtor access
CREATE POLICY debtor_access_policy ON debtors
  USING (id = current_setting('app.current_debtor_id'));

-- Policy for debt access
CREATE POLICY debt_access_policy ON debts
  USING (debtor_id = current_setting('app.current_debtor_id'));
```

**Environment Variables:**
```bash
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/coldet
JWT_SECRET=your-super-secret-jwt-key
STRIPE_SECRET_KEY=sk_test_...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
```

## Development Workflow

### Local Development Setup

**1. Database Setup:**
```bash
# Docker PostgreSQL
docker run --name coldet-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15

# Create database
createdb coldet

# Run migrations
cd api && go run main.go migrate
```

**2. Go Backend:**
```bash
cd api
go mod tidy
go run main.go
# Server runs on http://localhost:8080
```

**3. Next.js Frontend:**
```bash
cd ..
npm install
npm run dev
# App runs on http://localhost:3000
```

### API Integration Testing

**Go API Tests:**
```go
// api/main_test.go
func TestGetDebtorByToken(t *testing.T) {
    router := setupRouter()
    w := httptest.NewRecorder()
    
    req, _ := http.NewRequest("GET", "/api/debtors/test-token", nil)
    router.ServeHTTP(w, req)
    
    assert.Equal(t, 200, w.Code)
    
    var debtor Debtor
    err := json.Unmarshal(w.Body.Bytes(), &debtor)
    assert.NoError(t, err)
    assert.Equal(t, "John", debtor.FirstName)
}
```

**Next.js API Tests:**
```typescript
// __tests__/api/debtors.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/debtors/[token]';

describe('/api/debtors/[token]', () => {
  it('should return debtor data', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { token: 'test-token' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.firstName).toBe('John');
  });
});
```

## Performance Optimization

### Database Optimization

**Indexes for Performance:**
```sql
-- Core lookup indexes
CREATE INDEX idx_debtors_email ON debtors(email);
CREATE INDEX idx_debtors_phone ON debtors(phone);
CREATE INDEX idx_debts_token ON debts(unique_token);
CREATE INDEX idx_debts_debtor_status ON debts(debtor_id, status);
CREATE INDEX idx_communications_debt_timestamp ON communications(debt_id, timestamp);
CREATE INDEX idx_payments_debt_status ON payments(debt_id, status);
```

**Query Optimization:**
```typescript
// Optimized queries with proper indexing
const debtorWithDetails = await prisma.debtor.findUnique({
  where: { id: debtorId },
  include: {
    debts: {
      include: {
        communications: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    },
  },
});
```

### Caching Strategy

**Next.js Caching:**
```typescript
// Static generation for debtor pages
export async function generateStaticParams() {
  const tokens = await prisma.debt.findMany({
    select: { uniqueToken: true },
    where: { status: 'active' },
  });
  
  return tokens.map((debt) => ({
    token: debt.uniqueToken,
  }));
}

// Revalidate every hour
export const revalidate = 3600;
```

**Go API Caching:**
```go
// Redis cache implementation
func (s *Server) getCachedDebtor(token string) (*Debtor, error) {
    key := fmt.Sprintf("debtor:%s", token)
    
    cached, err := s.redis.Get(key).Result()
    if err == redis.Nil {
        // Cache miss - fetch from database
        debtor, err := s.getDebtorFromDB(token)
        if err != nil {
            return nil, err
        }
        
        // Cache for 1 hour
        s.redis.Set(key, debtor, time.Hour)
        return debtor, nil
    }
    
    var debtor Debtor
    json.Unmarshal([]byte(cached), &debtor)
    return &debtor, nil
}
```

## Monitoring and Logging

### Structured Logging

**Go Backend Logging:**
```go
import "github.com/sirupsen/logrus"

func (s *Server) logCommunication(debtorID string, method string, success bool) {
    logrus.WithFields(logrus.Fields{
        "debtor_id": debtorID,
        "method":    method,
        "success":   success,
        "timestamp": time.Now(),
    }).Info("Communication logged")
}
```

**Next.js Logging:**
```typescript
// lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

export default logger;
```

### Error Handling

**Go API Error Handling:**
```go
type APIError struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Details string `json:"details,omitempty"`
}

func (s *Server) handleError(c *gin.Context, err error, code int) {
    logrus.WithError(err).Error("API error occurred")
    
    c.JSON(code, APIError{
        Code:    code,
        Message: err.Error(),
        Details: getErrorDetails(err),
    })
}
```

**Next.js Error Handling:**
```typescript
// pages/api/error-handler.ts
import { NextApiRequest, NextApiResponse } from 'next';
import logger from '../../lib/logger';

export default function errorHandler(err: Error, req: NextApiRequest, res: NextApiResponse) {
  logger.error('API error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
```

## Deployment Strategy

### Docker Configuration

**Go API Dockerfile:**
```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
```

**Next.js Dockerfile:**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

### Docker Compose

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  database:
    image: postgres:15
    environment:
      POSTGRES_DB: coldet
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build: ./api
    environment:
      DATABASE_URL: postgres://user:password@database:5432/coldet?sslmode=disable
      PORT: 8080
    depends_on:
      - database
    ports:
      - "8080:8080"

  frontend:
    build: .
    environment:
      NEXT_PUBLIC_API_URL: http://api:8080
      DATABASE_URL: postgres://user:password@database:5432/coldet?sslmode=disable
    depends_on:
      - database
      - api
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

## Implementation Recommendations

### Recommended Architecture

**Phase 1: Hybrid Approach (Current + Enhancements)**
- Keep Go API for webhooks and complex operations
- Add Next.js API routes for simple CRUD operations
- Implement direct database access in Next.js for read-heavy operations
- Use traditional REST API calls where tRPC isn't needed

**Phase 2: tRPC Integration**
- Gradually migrate REST endpoints to tRPC
- Implement type-safe API calls
- Add automatic API documentation
- Maintain webhooks in Go for security

**Phase 3: Full Integration**
- Optimize database queries with proper indexing
- Add caching layers (Redis)
- Implement comprehensive monitoring
- Add automated testing

### Technology Stack Recommendations

**Required Dependencies:**
```json
{
  "dependencies": {
    "@trpc/client": "^10.45.0",
    "@trpc/next": "^10.45.0",
    "@trpc/react-query": "^10.45.0",
    "@trpc/server": "^10.45.0",
    "@prisma/client": "^5.7.0",
    "prisma": "^5.7.0",
    "zod": "^3.22.4",
    "react-query": "^3.39.3"
  }
}
```

**Go Dependencies:**
```go
module coldet-api

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/golang-jwt/jwt/v5 v5.2.0
    github.com/redis/go-redis/v9 v9.3.1
    github.com/sirupsen/logrus v1.9.3
    github.com/stripe/stripe-go/v76 v76.16.0
    gorm.io/driver/postgres v1.5.4
    gorm.io/gorm v1.25.5
)
```

## Next Steps

1. **Immediate (Week 1)**:
   - Set up Prisma schema matching Go GORM models
   - Create tRPC client setup in Next.js
   - Implement basic tRPC routes in Go

2. **Short-term (Weeks 2-4)**:
   - Migrate critical API endpoints to tRPC
   - Add database connection pooling
   - Implement authentication middleware

3. **Medium-term (Weeks 5-8)**:
   - Add caching layers
   - Implement comprehensive error handling
   - Add monitoring and logging

4. **Long-term (Weeks 9-12)**:
   - Performance optimization
   - Advanced security features
   - Automated testing suite

This architecture provides a solid foundation for the COLDET platform, balancing performance, security, and developer experience while maintaining the flexibility to evolve with business requirements.