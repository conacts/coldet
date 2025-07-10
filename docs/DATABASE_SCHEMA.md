# Database Schema

## Schema Overview

The COLDETS debt collection platform uses PostgreSQL with Drizzle ORM for type-safe database operations. The schema supports email tracking, payment processing, and basic workflow management.

## Entity Relationships

- One debtor → Many debts
- One debt → Many emails/calls/SMS/payments
- One email thread → Many emails
- All communication tables linked via debt_id for complete tracking

## Core Tables

### Debtors

Primary debtor contact information and consent tracking

```typescript
export const debtors = pgTable("debtors", {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    firstName: varchar("first_name", {length: 100}).notNull(),
    lastName: varchar("last_name", {length: 100}).notNull(),
    email: varchar("email", {length: 255}).unique(),
    phone: varchar("phone", {length: 20}),
    addressLine1: varchar("address_line1", {length: 255}),
    addressLine2: varchar("address_line2", {length: 255}),
    city: varchar("city", {length: 100}),
    state: varchar("state", {length: 2}),
    zipCode: varchar("zip_code", {length: 10}),

    // Consent and compliance
    phoneConsent: boolean("phone_consent").notNull().default(false),
    emailConsent: boolean("email_consent").notNull().default(true),
    dncRegistered: boolean("dnc_registered").notNull().default(false),
    currentlyCollecting: boolean("currently_collecting")
        .notNull()
        .default(false),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Debts

Individual debt accounts with tracking and payment status

```typescript
export const debts = pgTable("debts", {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    debtorId: uuid("debtor_id")
        .notNull()
        .references(() => debtors.id, {onDelete: "cascade"}),

    // Debt details
    originalCreditor: varchar("original_creditor", {length: 200}).notNull(),
    totalOwed: decimal("total_owed", {precision: 10, scale: 2})
        .notNull()
        .default("0"),
    amountPaid: decimal("amount_paid", {precision: 10, scale: 2})
        .notNull()
        .default("0"),
    status: varchar("status", {length: 20}).notNull().default("active"),

    // Dates
    debtDate: timestamp("debt_date"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Email Threads

Groups related email conversations by debtor and subject

```typescript
export const emailThreads = pgTable("email_threads", {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    debtorId: uuid("debtor_id")
        .notNull()
        .references(() => debtors.id, {onDelete: "cascade"}),
    subject: varchar("subject", {length: 500}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Emails

Track all email communications with threading support

```typescript
export const emails = pgTable("emails", {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    debtId: uuid("debt_id")
        .notNull()
        .references(() => debts.id, {onDelete: "cascade"}),
    threadId: uuid("thread_id")
        .references(() => emailThreads.id, {onDelete: "set null"})
        .notNull(),

    // Email identification
    fromEmailAddress: varchar("from_email_address", {length: 255}).notNull(),
    messageId: varchar("message_id", {length: 255}).unique().notNull(),
    replyTo: varchar("reply_to", {length: 255}),

    // Content
    direction: varchar("direction", {enum: ["inbound", "outbound"]}).notNull(),
    subject: varchar("subject", {length: 500}),
    content: text("content"),

    // Tracking and engagement
    emailOpened: boolean("email_opened").notNull().default(false),
    emailClicked: boolean("email_clicked").notNull().default(false),
    emailBounced: boolean("email_bounced").notNull().default(false),
    emailComplained: boolean("email_complained").notNull().default(false),

    // Metadata
    aiGenerated: boolean("ai_generated").notNull().default(false),
    complianceChecked: boolean("compliance_checked").notNull().default(true),

    timestamp: timestamp("timestamp").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
});
```

### Calls

Track phone call communications (planned feature)

```typescript
export const calls = pgTable("calls", {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    debtId: uuid("debt_id")
        .notNull()
        .references(() => debts.id, {onDelete: "cascade"}),

    direction: varchar("direction", {enum: ["inbound", "outbound"]}).notNull(),
    callDuration: integer("call_duration"), // seconds
    callOutcome: varchar("call_outcome", {length: 50}),

    // Call content
    transcript: text("transcript"),
    recordingUrl: varchar("recording_url", {length: 500}),

    // Metadata
    aiGenerated: boolean("ai_generated").notNull().default(false),
    complianceChecked: boolean("compliance_checked").notNull().default(true),

    timestamp: timestamp("timestamp").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
});
```

### SMS

Track SMS communications (planned feature)

```typescript
export const sms = pgTable("sms", {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    debtId: uuid("debt_id")
        .notNull()
        .references(() => debts.id, {onDelete: "cascade"}),

    direction: varchar("direction", {enum: ["inbound", "outbound"]}).notNull(),
    content: text("content"),

    // Metadata
    aiGenerated: boolean("ai_generated").notNull().default(false),
    complianceChecked: boolean("compliance_checked").notNull().default(true),

    timestamp: timestamp("timestamp").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
});
```

### Payments

Track payment attempts and successes with Stripe integration

```typescript
export const payments = pgTable("payments", {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    debtId: uuid("debt_id")
        .notNull()
        .references(() => debts.id, {onDelete: "cascade"}),

    amount: decimal("amount", {precision: 10, scale: 2}).notNull(),
    paymentType: varchar("payment_type", {length: 20}),

    // Stripe integration
    stripePaymentIntentId: varchar("stripe_payment_intent_id", {length: 100}),
    stripeSessionId: varchar("stripe_session_id", {length: 100}),
    paymentMethod: varchar("payment_method", {length: 50}),

    status: varchar("status", {length: 20}).notNull().default("pending"),

    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
});
```

## Indexes for Performance

```typescript
// Email performance indexes
debtIdx: index('idx_emails_debt').on(table.debtId),
timestampIdx: index('idx_emails_timestamp').on(table.timestamp),
threadTimestampIdx: index('idx_emails_thread_timestamp').on(table.threadId, table.timestamp),
messageIdIdx: uniqueIndex('idx_emails_message_id').on(table.messageId),

// Email thread indexes
debtorIdx: index('idx_email_threads_debtor').on(table.debtorId),

// Debt tracking indexes
debtorStatusIdx: uniqueIndex('idx_debts_debtor_status').on(table.debtorId, table.status),

// Payment tracking indexes
debtIdx: uniqueIndex('idx_payments_debt').on(table.debtId),
statusIdx: uniqueIndex('idx_payments_status').on(table.status),
stripeIdx: uniqueIndex('idx_payments_stripe').on(table.stripePaymentIntentId),
```

## Key Features

### 1. Email Threading System

- **Email Threads**: Group related conversations by debtor and subject
- **Message ID Tracking**: Unique AWS SES message IDs for each email
- **Threading Detection**: Uses In-Reply-To headers for conversation continuity
- **Direction Tracking**: Clearly distinguishes inbound vs outbound emails

### 2. Communication History

- **Complete Audit Trail**: All interactions stored with timestamps
- **Engagement Tracking**: Email opens, clicks, bounces, and complaints
- **Compliance Flagging**: AI-generated content and compliance verification
- **Multi-Channel Support**: Email, calls, and SMS (planned)

### 3. Payment Integration

- **Stripe Integration**: Complete payment lifecycle tracking
- **Multiple Payment Methods**: Card, ACH, digital wallets
- **Payment Status Tracking**: Pending, completed, failed, refunded
- **Session Management**: Stripe checkout session tracking

## Data Relationships

### Primary Relationships

- `debtors` (1) → `debts` (many)
- `debts` (1) → `emails` (many)
- `debts` (1) → `payments` (many)
- `debtors` (1) → `email_threads` (many)
- `email_threads` (1) → `emails` (many)

### Cascade Behavior

- Deleting a debtor cascades to all related records
- Deleting a debt cascades to all communications and payments
- Email thread deletion sets thread_id to null in emails

## Type Safety

The schema uses Drizzle ORM's `InferSelectModel` for complete TypeScript type safety:

```typescript
export type Debtor = InferSelectModel<typeof debtors>;
export type Debt = InferSelectModel<typeof debts>;
export type Email = InferSelectModel<typeof emails>;
export type EmailThread = InferSelectModel<typeof emailThreads>;
export type Payment = InferSelectModel<typeof payments>;
```

## Database Operations

### Email Processing

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

### Payment Tracking

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

## Current Implementation Status

### ✅ **Active Tables**

- **debtors**: Complete contact and consent management
- **debts**: Core debt tracking with payment status
- **emails**: Full email processing with threading
- **email_threads**: Basic conversation grouping
- **payments**: Stripe integration with transaction tracking

### 🔄 **Planned Tables**

- **calls**: Phone communication tracking
- **sms**: SMS communication tracking

### 🎯 **Future Enhancements**

- Enhanced engagement scoring calculations
- Additional compliance tracking fields
- Advanced analytics and reporting tables
- Integration with external service tracking

---

**Schema Status**: Operational with core email and payment functionality. All tables use UUID primary keys and include proper indexing for performance.
