# Technical Implementation Guide

## Overview

Complete technical implementation guide for the COLDETS debt collection platform. This document covers the Next.js full-stack architecture, AWS SES email integration, Stripe payment processing, and database operations.

## System Architecture

### Next.js Full-Stack Architecture

The COLDETS platform uses Next.js for both frontend and backend functionality, with direct database access via Drizzle ORM, providing a streamlined approach to debt collection and payment processing.

**Core Stack:**

- **Framework**: Next.js 15.3.4 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Email**: AWS SES for sending and receiving
- **Payment**: Stripe integration
- **Key Features**: API routes, webhooks, dynamic pages, database operations

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js Application                   │
│                                                         │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   Frontend      │    │      Backend API Routes     │ │
│  │   Components    │    │                             │ │
│  │                 │    │  /api/webhooks/email        │ │
│  │  - Dashboard    │    │  /api/webhooks/stripe       │ │
│  │  - Debtor Pages │    │  /api/checkout              │ │
│  │  - Payment UI   │    │                             │ │
│  └─────────────────┘    └─────────────────────────────┘ │
│                                      │                  │
└──────────────────────────────────────┼──────────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │   PostgreSQL    │
                              │   (via Drizzle) │
                              └─────────────────┘
```

### Current API Routes

```typescript
// Webhook endpoints
POST / api / webhooks / email / received; // AWS SES email webhooks
POST / api / webhooks / stripe; // Stripe payment webhooks

// Payment endpoints
POST / api / checkout; // Create Stripe checkout session

// Dynamic debtor pages (Next.js pages)
GET / debtor / [token]; // Debtor landing page
GET / pay / [id]; // Payment page
GET / pay / [id] / success; // Payment success page
GET / dashboard; // Admin dashboard
```

## AWS SES Integration

### Setup Requirements

#### IAM User: `coldets-service-user`

- **Purpose:** Dedicated service user for email automation and AWS integrations
- **Path:** `/service-accounts/`
- **Permissions:**
    - `AmazonSESFullAccess` - For sending and receiving emails
    - `AmazonSNSFullAccess` - For webhook notifications
- **Access Keys:** Configured in `.env.local`

#### Domain Configuration

- **Domain:** `coldets.com` (replace with your domain)
- **Status:** ✅ Verified
- **DNS Records Required:**
    - TXT: `_amazonses.yourdomain.com`
    - MX: For receiving emails
    - DKIM: For email authentication

### Email System Architecture

#### Inbound Email Flow

```
Email → AWS SES → SNS Topic → Webhook → Database Storage
```

**Processing Pipeline:**

1. **Parse SNS notification** with SES email data
2. **Extract sender and content** from email payload
3. **Find or create email thread** using In-Reply-To headers
4. **Store inbound email** in database with messageId

#### Outbound Email Flow

```
Email Request → AWS SES SendEmail API → Delivered Email
```

**Key Features:**

- **📧 Email Tracking:** Message ID tracking for database storage
- **🗄️ Database Integration:** Stores all emails with basic threading
- **🔗 Payment Links:** Stripe payment link generation and tracking
- **📊 Email Analytics:** Open and click tracking for engagement

### SNS Configuration

- **Topic Name:** `ses-inbound-email`
- **Topic ARN:** `arn:aws:sns:us-east-2:722868990407:ses-inbound-email`
- **Subscription Endpoint:** `https://yourdomain.com/api/webhooks/email/received`
- **Subscription Status:** ✅ Confirmed
- **Protocol:** HTTPS

### Webhook Implementation

#### Email Webhook Handler

```typescript
// app/api/webhooks/email/received/route.ts
export async function POST(request: Request) {
    const body = await request.text();
    const message = JSON.parse(body);

    // Process SES notification
    await handleReceivedEmail(message);

    return new Response("OK");
}
```

#### Handler Functions

- `handleReceivedEmail()` - Main email processing
- `findOrCreateEmailThread()` - Basic threading logic

## Stripe Payment Integration

### Payment Processing Flow

#### Payment Link Generation

```
1. System creates unique Stripe Checkout session
2. Dynamic payment page generated with debtor-specific content
3. Multiple payment options: full payment, partial, payment plan
4. Mobile-optimized page with Apple/Google Pay integration
5. Payment page visits tracked for engagement analytics
```

#### Payment Processing

```
1. Debtor completes payment → Stripe webhook to /api/webhooks/stripe
2. System updates debtor balance and status
3. Automatic receipt generation and email delivery
4. Follow-up sequence can be manually triggered
5. Payment analytics updated for reporting
```

### Payment Routes

```typescript
// Create checkout session
POST /api/checkout
{
  "debtId": "uuid",
  "amount": 1000,
  "paymentType": "full"
}

// Payment pages
GET /pay/[id]              // Payment form
GET /pay/[id]/success      // Success confirmation
```

### Stripe Webhook Handler

```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    const event = stripe.webhooks.constructEvent(body, sig, endpointSecret);

    switch (event.type) {
        case "payment_intent.succeeded":
            await handlePaymentSuccess(event.data.object);
            break;
        case "payment_intent.payment_failed":
            await handlePaymentFailed(event.data.object);
            break;
    }

    return new Response("OK");
}
```

## Database Integration

### Database Schema (Drizzle ORM)

#### Core Tables

```typescript
// Debtors
export const debtors = pgTable("debtors", {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    firstName: varchar("first_name", {length: 100}).notNull(),
    lastName: varchar("last_name", {length: 100}).notNull(),
    email: varchar("email", {length: 255}).unique(),
    // ... other fields
});

// Emails with threading
export const emails = pgTable("emails", {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    debtId: uuid("debt_id")
        .notNull()
        .references(() => debts.id),
    threadId: uuid("thread_id").references(() => emailThreads.id),
    messageId: varchar("message_id", {length: 255}).unique().notNull(),
    direction: varchar("direction", {enum: ["inbound", "outbound"]}),
    // ... other fields
});

// Payments
export const payments = pgTable("payments", {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    debtId: uuid("debt_id")
        .notNull()
        .references(() => debts.id),
    amount: decimal("amount", {precision: 10, scale: 2}).notNull(),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", {length: 100}),
    // ... other fields
});
```

#### Type Safety

```typescript
export type Debtor = InferSelectModel<typeof debtors>;
export type Email = InferSelectModel<typeof emails>;
export type Payment = InferSelectModel<typeof payments>;
```

### Database Operations

#### Email Processing

```typescript
// Store inbound email with threading
await insertEmail({
    debtId: debt.id,
    threadId: thread.id,
    fromEmailAddress: sender,
    messageId: sesMessageId,
    direction: "inbound",
    subject: emailSubject,
    content: emailContent,
});
```

#### Payment Tracking

```typescript
// Track Stripe payment
await insertPayment({
    debtId: debt.id,
    amount: paymentAmount,
    stripePaymentIntentId: intent.id,
    status: "completed",
    completedAt: new Date(),
});
```

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# AWS SES
AWS_ACCESS_KEY_ID=AKIA...your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-2
SES_FROM_EMAIL=noreply@yourdomain.com
SES_REPLY_TO_EMAIL=support@yourdomain.com
EMAIL_DOMAIN=yourdomain.com

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### Development Setup

```bash
# Install dependencies
pnpm install

# Set up database
pnpm db:generate
pnpm db:push

# Start development server
pnpm dev
```

## Email Template System

### Tailwind Email Templates

```typescript
// emails/first-email.tsx
export function FirstEmail({ debtorName, balance, paymentLink }: Props) {
  return (
    <div className="w-full bg-white">
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-6">
          Payment Required
        </h1>
        <p className="text-lg text-gray-600 mb-4">
          Dear {debtorName},
        </p>
        <p className="text-lg text-gray-600 mb-6">
          Your account balance is ${balance}.
        </p>
        <a href={paymentLink} className="bg-blue-600 text-white px-6 py-3 rounded-lg">
          Pay Now
        </a>
      </div>
    </div>
  );
}
```

### Email Sending

```typescript
// lib/email.ts
export async function sendEmail({
    to,
    subject,
    htmlContent,
    textContent,
}: SendEmailParams) {
    const params = {
        Source: process.env.SES_FROM_EMAIL!,
        Destination: {ToAddresses: [to]},
        Message: {
            Subject: {Data: subject},
            Body: {
                Html: {Data: htmlContent},
                Text: {Data: textContent},
            },
        },
    };

    return await sesClient.send(new SendEmailCommand(params));
}
```

## Performance & Monitoring

### Performance Targets

- Email webhook processing: <500ms
- Payment page load: <2 seconds
- Database queries: <50ms average
- System uptime: 99.9%

### Monitoring

#### Current Metrics

- Email delivery and engagement rates
- Payment conversion tracking
- Database performance monitoring
- Application uptime and response times

#### AWS CloudWatch

- **SES sending metrics** and bounce rates
- **SNS delivery success** and failures

## Security & Compliance

### Security Measures

- **Data Encryption:** All PII encrypted at rest and in transit
- **Payment Security:** PCI DSS compliant via Stripe
- **Database Security:** Secure PostgreSQL with access controls
- **Email Security:** AWS SES with proper authentication

### Compliance Features

- **Email Communication Logging:** Complete audit trail
- **Payment Transaction Tracking:** Full Stripe integration
- **Audit Trail Maintenance:** All interactions logged
- **FDCPA Disclosure Support:** Required legal disclosures

## Testing & Verification

### Local Testing

```bash
# Send mock email to webhook
python mock_inbound_email.py

# Check logs for processing
pnpm dev
```

### Production Verification

1. **Send test email** to your domain
2. **Check webhook logs** for processing
3. **Verify database storage** of email data
4. **Test payment email sending**
5. **Confirm Stripe payment processing**

## Deployment Checklist

### AWS Setup

- [x] ✅ Create IAM user with proper permissions
- [x] ✅ Verify domain and email addresses in SES
- [x] ✅ Configure SNS topic and webhook subscription
- [x] ✅ Test email sending and receiving

### Application Setup

- [x] ✅ Deploy Next.js application
- [x] ✅ Configure environment variables
- [x] ✅ Set up database with Drizzle ORM
- [x] ✅ Test webhook endpoints
- [x] ✅ Verify Stripe integration

### Production Monitoring

- [ ] 🔄 Add SNS signature verification
- [ ] 🔄 Implement rate limiting and monitoring
- [ ] 🔄 Set up comprehensive logging
- [ ] 🔄 Configure alerting for failures

## Current Status

### ✅ **Working Features**

- Email sending via AWS SES
- Inbound email webhook processing
- Basic email threading detection
- Database storage with messageId tracking
- Payment email templates with Tailwind styling
- Stripe payment processing
- Payment page generation with tokens
- Receipt generation and delivery

### 🚫 **Removed Features**

- Automatic AI email responses
- Complex email threading with References headers
- SendRawEmail API usage
- Automatic response generation

### 🔄 **In Development**

- Enhanced reporting and analytics
- Advanced payment plan management
- Additional compliance monitoring

---

**Implementation Status:** The technical implementation is operational and provides a solid foundation for the debt collection platform. The system focuses on email tracking, payment processing, and manual workflow management rather than complex automation.
