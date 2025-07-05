# Next.js Full-Stack Architecture

## Executive Summary

This document outlines the full-stack Next.js architecture for the COLDET debt collection platform. The system uses Next.js for both frontend and backend functionality, with direct database access via Prisma ORM, eliminating the need for a separate Go API server.

## Architecture Overview

### Full-Stack Next.js Application
- **Framework**: Next.js 15.3.4 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js or custom JWT implementation
- **Key Features**: API routes, webhooks, dynamic pages, database operations

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
POST /api/webhooks/email         // AWS SES email webhooks
POST /api/webhooks/stripe        // Stripe payment webhooks  
POST /api/webhooks/twilio        // Twilio voice/SMS webhooks

// API endpoints
GET  /api/debtors/[token]        // Get debtor by unique token
PUT  /api/debtors/[token]        // Update debtor information
POST /api/emails/send            // Send email via AWS SES
POST /api/calls/outbound         // Initiate outbound call
GET  /api/communications/[debtorId]  // Get communication history
POST /api/payments/create-link   // Create Stripe payment link
GET  /api/payments/[debtorId]    // Get payment history

// Dynamic debtor pages (Next.js pages)
GET  /debtor/[token]             // Debtor landing page
GET  /pay/[token]               // Payment page
GET  /info/[token]              // Account information page

// Tracking
POST /api/tracking/page-view     // Page view analytics
```

**Benefits:**
- Single codebase for frontend and backend
- Full TypeScript type safety throughout
- Shared types between client and server
- Simplified deployment and development
- Built-in Next.js optimizations
- No API client management needed

### Database Access Patterns

**Direct Database Operations:**
```typescript
// All operations handled within Next.js
const debtors = await prisma.debtor.findMany({
  where: { status: 'active' },
  include: {
    debts: {
      include: {
        communications: true,
        payments: true,
      },
    },
  },
});

// Simple CRUD operations
const debtor = await prisma.debtor.update({
  where: { id: debtorId },
  data: { phone_consent: true },
});
```

**API Route Operations:**
```typescript
// Complex operations in API routes
export async function POST(request: Request) {
  // AI-powered operations
  // Multi-step database operations
  // External API integrations
  
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });
  
  // Save to database
  await prisma.communication.create({
    data: {
      content: response.choices[0].message.content,
      ai_generated: true,
      debt_id: debtId,
    },
  });
}
```

**Operation Types:**

| Operation Type | Implementation | Location |
|---|---|---|
| Dashboard data | Direct DB queries | Server Components |
| Reports/Analytics | Direct DB queries | Server Components |
| Simple CRUD | Direct DB queries | Server/Client Components |
| AI Operations | External API calls | API Routes |
| Webhook Processing | External integrations | API Routes |
| Payment Processing | Stripe integration | API Routes |
| Bulk Operations | Direct DB queries | API Routes |

## Database Strategy

### Prisma ORM Setup

**Prisma Schema:**
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
  addressLine1 String? @map("address_line1")
  addressLine2 String? @map("address_line2")
  city        String?
  state       String?
  zipCode     String?  @map("zip_code")
  
  // Consent and compliance
  phoneConsent Boolean @default(false) @map("phone_consent")
  emailConsent Boolean @default(true) @map("email_consent")
  dncRegistered Boolean @default(false) @map("dnc_registered")
  
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  debts       Debt[]
  
  @@map("debtors")
}

model Debt {
  id            String   @id @default(dbgenerated("gen_random_uuid()"))
  debtorId      String   @map("debtor_id")
  
  // Debt details
  originalCreditor String  @map("original_creditor")
  totalOwed     Decimal  @map("total_owed")
  amountPaid    Decimal  @default(0) @map("amount_paid")
  status        String   @default("active")
  
  // Tracking
  uniqueToken   String   @unique @map("unique_token")
  totalContacts Int      @default(0) @map("total_contacts")
  
  // Dates
  debtDate      DateTime? @map("debt_date")
  importedAt    DateTime @default(now()) @map("imported_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  
  debtor        Debtor   @relation(fields: [debtorId], references: [id])
  payments      Payment[]
  communications Communication[]
  
  @@map("debts")
}

model Communication {
  id            String   @id @default(dbgenerated("gen_random_uuid()"))
  debtId        String   @map("debt_id")
  
  type          String   // 'email', 'call', 'sms'
  direction     String   // 'inbound', 'outbound'
  subject       String?
  content       String?
  
  // Tracking
  opened        Boolean  @default(false)
  clicked       Boolean  @default(false)
  
  // Metadata
  aiGenerated   Boolean  @default(false) @map("ai_generated")
  complianceChecked Boolean @default(true) @map("compliance_checked")
  
  timestamp     DateTime @default(now())
  createdAt     DateTime @default(now()) @map("created_at")
  
  debt          Debt     @relation(fields: [debtId], references: [id])
  
  @@map("communications")
}

model Payment {
  id            String   @id @default(dbgenerated("gen_random_uuid()"))
  debtId        String   @map("debt_id")
  
  amount        Decimal
  paymentType   String   @map("payment_type") // 'full', 'partial', 'plan'
  
  // Stripe integration
  stripePaymentIntentId String? @map("stripe_payment_intent_id")
  stripeSessionId String? @map("stripe_session_id")
  paymentMethod String?  @map("payment_method")
  
  status        String   @default("pending") // 'pending', 'completed', 'failed', 'refunded'
  
  createdAt     DateTime @default(now()) @map("created_at")
  completedAt   DateTime? @map("completed_at")
  
  debt          Debt     @relation(fields: [debtId], references: [id])
  
  @@map("payments")
}
```

### Database Connection

**Connection Management:**
```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Database Utilities:**
```typescript
// lib/db-utils.ts
import { prisma } from './db';

export async function getDebtorByToken(token: string) {
  return await prisma.debtor.findFirst({
    where: {
      debts: {
        some: {
          uniqueToken: token,
        },
      },
    },
    include: {
      debts: {
        where: {
          uniqueToken: token,
        },
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
}

export async function logCommunication(debtId: string, data: {
  type: string;
  direction: string;
  content?: string;
  subject?: string;
}) {
  return await prisma.communication.create({
    data: {
      debtId,
      ...data,
    },
  });
}
```

## API Design Patterns

### Next.js API Routes

**API Route Structure:**
```typescript
// Webhook routes
POST /api/webhooks/email         // AWS SES webhook
POST /api/webhooks/stripe        // Stripe webhook
POST /api/webhooks/twilio        // Twilio webhook

// Debtor management
GET  /api/debtors/[token]        // Get debtor info
PUT  /api/debtors/[token]        // Update debtor

// Communications
POST /api/communications/send    // Send email/SMS
GET  /api/communications/[debtorId]  // Get communication history

// Payments
POST /api/payments/create-link   // Create payment link
GET  /api/payments/[debtorId]    // Get payment history

// AI Operations
POST /api/ai/generate-response   // Generate AI response
POST /api/ai/analyze-sentiment   // Analyze communication sentiment

// Tracking
POST /api/tracking/page-view     // Track page views
```

### Example API Route Implementation

**1. Debtor API Route:**
```typescript
// app/api/debtors/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getDebtorByToken } from '@/lib/db-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const debtor = await getDebtorByToken(params.token);
    
    if (!debtor) {
      return NextResponse.json({ error: 'Debtor not found' }, { status: 404 });
    }
    
    return NextResponse.json(debtor);
  } catch (error) {
    console.error('Error fetching debtor:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json();
    const { phone, email, phoneConsent, emailConsent } = body;
    
    const debt = await prisma.debt.findUnique({
      where: { uniqueToken: params.token },
    });
    
    if (!debt) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }
    
    const updatedDebtor = await prisma.debtor.update({
      where: { id: debt.debtorId },
      data: {
        phone,
        email,
        phoneConsent,
        emailConsent,
      },
    });
    
    return NextResponse.json(updatedDebtor);
  } catch (error) {
    console.error('Error updating debtor:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**2. Webhook Handler:**
```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = headers().get('stripe-signature');
  
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        
        // Update payment status
        await prisma.payment.update({
          where: { stripePaymentIntentId: paymentIntent.id },
          data: { 
            status: 'completed',
            completedAt: new Date(),
          },
        });
        
        // Update debt balance
        const payment = await prisma.payment.findUnique({
          where: { stripePaymentIntentId: paymentIntent.id },
          include: { debt: true },
        });
        
        if (payment) {
          await prisma.debt.update({
            where: { id: payment.debtId },
            data: {
              amountPaid: {
                increment: payment.amount,
              },
            },
          });
        }
        
        break;
        
      case 'payment_intent.payment_failed':
        // Handle failed payment
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 });
  }
}
```

**3. AI Integration:**
```typescript
// app/api/ai/generate-response/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { debtId, inboundMessage, debtorName, balance } = await request.json();
    
    const prompt = `
      You are an AI assistant for a debt collection agency. 
      Respond to the following message from ${debtorName} who owes $${balance}.
      
      Their message: "${inboundMessage}"
      
      Guidelines:
      - Be professional and empathetic
      - Offer payment options
      - Comply with FDCPA regulations
      - Keep response under 200 words
    `;
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 250,
    });
    
    const aiResponse = response.choices[0].message.content;
    
    // Log the AI response
    await prisma.communication.create({
      data: {
        debtId,
        type: 'email',
        direction: 'outbound',
        content: aiResponse,
        aiGenerated: true,
      },
    });
    
    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
  }
}
```

## Security Considerations

### Authentication Strategy

**JWT Token Implementation:**
```typescript
// lib/auth.ts
import jwt from 'jsonwebtoken';

export function generateJWT(debtorId: string): string {
  return jwt.sign(
    { 
      sub: debtorId,
      iat: Date.now() / 1000,
      exp: Date.now() / 1000 + (24 * 60 * 60), // 24 hours
    },
    process.env.JWT_SECRET!
  );
}

export function verifyJWT(token: string): { sub: string } {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function getDebtorIdFromToken(token: string): string | null {
  try {
    const decoded = verifyJWT(token);
    return decoded.sub;
  } catch {
    return null;
  }
}
```

**Next.js Auth Middleware:**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from './lib/auth';

export function middleware(request: NextRequest) {
  // Skip auth for webhooks and public routes
  if (request.nextUrl.pathname.startsWith('/api/webhooks') || 
      request.nextUrl.pathname.startsWith('/debtor/') ||
      request.nextUrl.pathname.startsWith('/pay/') ||
      request.nextUrl.pathname.startsWith('/info/')) {
    return NextResponse.next();
  }
  
  const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const decoded = verifyJWT(token);
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
  matcher: ['/api/:path*', '/admin/:path*'],
};
```

**Session Management:**
```typescript
// lib/session.ts
import { prisma } from './db';

export async function createSession(debtorId: string) {
  const token = generateJWT(debtorId);
  
  // Store session in database for tracking
  await prisma.session.create({
    data: {
      debtorId,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });
  
  return token;
}

export async function validateSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { debtor: true },
  });
  
  if (!session || session.expiresAt < new Date()) {
    return null;
  }
  
  return session;
}
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

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and API keys
```

**2. Install Dependencies:**
```bash
npm install
```

**3. Database Migration:**
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database (optional)
npx prisma db seed
```

**4. Run Next.js Application:**
```bash
npm run dev
# App runs on http://localhost:3000
# API routes available at http://localhost:3000/api/*
```

### Testing Strategy

**API Route Tests:**
```typescript
// __tests__/api/debtors.test.ts
import { GET, PUT } from '@/app/api/debtors/[token]/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    debtor: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    debt: {
      findUnique: jest.fn(),
    },
  },
}));

describe('/api/debtors/[token]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return debtor data', async () => {
    const mockDebtor = {
      id: '123',
      firstName: 'John',
      lastName: 'Doe',
      debts: [{ uniqueToken: 'test-token' }],
    };

    (prisma.debtor.findFirst as jest.Mock).mockResolvedValue(mockDebtor);

    const request = new NextRequest('http://localhost:3000/api/debtors/test-token');
    const response = await GET(request, { params: { token: 'test-token' } });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.firstName).toBe('John');
  });

  it('should update debtor information', async () => {
    const mockDebt = { id: '456', debtorId: '123' };
    const mockUpdatedDebtor = { id: '123', phone: '555-0123' };

    (prisma.debt.findUnique as jest.Mock).mockResolvedValue(mockDebt);
    (prisma.debtor.update as jest.Mock).mockResolvedValue(mockUpdatedDebtor);

    const request = new NextRequest('http://localhost:3000/api/debtors/test-token', {
      method: 'PUT',
      body: JSON.stringify({ phone: '555-0123' }),
    });

    const response = await PUT(request, { params: { token: 'test-token' } });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.phone).toBe('555-0123');
  });
});
```

**Component Tests:**
```typescript
// __tests__/components/debtor-page.test.tsx
import { render, screen } from '@testing-library/react';
import DebtorPage from '@/app/debtor/[token]/page';

// Mock the database utilities
jest.mock('@/lib/db-utils', () => ({
  getDebtorByToken: jest.fn(),
}));

describe('DebtorPage', () => {
  it('renders debtor information', async () => {
    const mockDebtor = {
      firstName: 'John',
      lastName: 'Doe',
      debts: [{
        totalOwed: 1000,
        amountPaid: 200,
        uniqueToken: 'test-token',
      }],
    };

    (require('@/lib/db-utils').getDebtorByToken as jest.Mock)
      .mockResolvedValue(mockDebtor);

    const props = { params: { token: 'test-token' } };
    render(await DebtorPage(props));

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('$800.00')).toBeInTheDocument(); // remaining balance
  });
});
```

**Integration Tests:**
```typescript
// __tests__/integration/payment-flow.test.ts
import { testApiHandler } from 'next-test-api-route-handler';
import * as paymentsHandler from '@/app/api/payments/create-link/route';

describe('Payment Flow Integration', () => {
  it('should create payment link and process payment', async () => {
    await testApiHandler({
      appHandler: paymentsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          body: JSON.stringify({
            debtId: 'test-debt-id',
            amount: 500,
            type: 'partial',
          }),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.url).toContain('https://checkout.stripe.com');
      },
    });
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

**Next.js Dockerfile:**
```dockerfile
FROM node:18-alpine AS dependencies

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
COPY --from=dependencies /app/node_modules ./node_modules

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Install production dependencies for Prisma
COPY package*.json ./
RUN npm ci --only=production

# Generate Prisma client in production
RUN npx prisma generate

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
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d coldet"]
      interval: 30s
      timeout: 10s
      retries: 5

  app:
    build: .
    environment:
      DATABASE_URL: postgres://user:password@database:5432/coldet?sslmode=disable
      JWT_SECRET: your-super-secret-jwt-key
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
      TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      database:
        condition: service_healthy
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped

volumes:
  postgres_data:
```

### Production Deployment

**Vercel Deployment (Recommended):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod

# Environment variables to set in Vercel dashboard:
# - DATABASE_URL
# - JWT_SECRET
# - STRIPE_SECRET_KEY
# - STRIPE_WEBHOOK_SECRET
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
# - TWILIO_ACCOUNT_SID
# - TWILIO_AUTH_TOKEN
# - OPENAI_API_KEY
```

**Railway Deployment:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy to Railway
railway login
railway init
railway up

# Set environment variables
railway variables set DATABASE_URL=postgresql://...
railway variables set JWT_SECRET=your-secret
# ... other environment variables
```

**Self-Hosted Deployment:**
```bash
# Clone repository
git clone https://github.com/your-username/coldet.git
cd coldet

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Build application
npm run build

# Start production server
npm start
```

## Implementation Recommendations

### Recommended Architecture

**Phase 1: Core Implementation (Weeks 1-4)**
- Set up full Prisma schema and database migrations
- Implement essential API routes (debtors, payments, communications)
- Create webhook handlers for Stripe and AWS SES
- Build basic debtor-facing pages
- Add JWT authentication

**Phase 2: AI Integration (Weeks 5-8)**
- Integrate OpenAI for automated responses
- Implement AI-powered email generation
- Add sentiment analysis for communications
- Create compliance checking system
- Build admin dashboard for monitoring

**Phase 3: Advanced Features (Weeks 9-12)**
- Add Redis caching for performance
- Implement real-time analytics
- Create payment plan automation
- Add comprehensive testing suite
- Optimize database queries

### Technology Stack

**Core Dependencies:**
```json
{
  "dependencies": {
    "@prisma/client": "^5.7.0",
    "prisma": "^5.7.0",
    "next": "15.3.4",
    "react": "^19.1.0",
    "typescript": "^5.8.3",
    "zod": "^3.25.67",
    "jsonwebtoken": "^9.0.2",
    "stripe": "^14.21.0",
    "openai": "^4.28.0",
    "@aws-sdk/client-ses": "^3.490.0",
    "twilio": "^4.20.0"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.5",
    "jest": "^29.7.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.2.0",
    "next-test-api-route-handler": "^4.0.8"
  }
}
```

**Additional Integrations:**
- **Database**: PostgreSQL with Prisma ORM
- **Payments**: Stripe for payment processing
- **Email**: AWS SES for transactional emails
- **SMS/Voice**: Twilio for communications
- **AI**: OpenAI for automated responses
- **Caching**: Redis for performance (optional)
- **Monitoring**: Vercel Analytics or custom logging

### Environment Configuration

**Required Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/coldet

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# AWS SES
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI
OPENAI_API_KEY=sk-...

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
```

## Next Steps

1. **Immediate (Week 1)**:
   - Set up Next.js project with Prisma
   - Create database schema and migrations
   - Implement basic API routes structure
   - Set up environment configuration

2. **Short-term (Weeks 2-4)**:
   - Build debtor management API routes
   - Create payment processing with Stripe
   - Implement webhook handlers
   - Add authentication middleware

3. **Medium-term (Weeks 5-8)**:
   - Integrate AI for automated communications
   - Build admin dashboard
   - Add comprehensive error handling
   - Implement monitoring and logging

4. **Long-term (Weeks 9-12)**:
   - Performance optimization with caching
   - Advanced security features
   - Automated testing suite
   - Production deployment setup

### Benefits of This Simplified Architecture

✅ **Faster Development**: Single codebase reduces complexity  
✅ **Type Safety**: Full TypeScript coverage from database to UI  
✅ **Simplified Deployment**: One application to deploy and maintain  
✅ **Better Developer Experience**: Hot reload for both frontend and API changes  
✅ **Cost Effective**: Single server instance instead of multiple services  
✅ **Easier Testing**: Unified testing strategy for the entire application

This streamlined architecture eliminates the complexity of managing separate Go and Next.js applications while maintaining all the core functionality needed for the COLDET debt collection platform.