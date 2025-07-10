# Product Architecture & Requirements

## Product Vision

Debt collection platform with automated email tracking, payment processing, and debtor management. The system focuses on efficient payment collection through streamlined digital workflows and comprehensive tracking.

## Technical Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Email Service │    │  SMS Service    │    │ Payment Service │
│    (AWS SES)    │    │    (Future)     │    │    (Stripe)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│               COLDETS Next.js Full-Stack App                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Email       │  │  Payment    │  │     Tracking System     │ │
│  │ Processing  │  │  Processing │  │                         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
                ┌─────────────────┐
                │   PostgreSQL    │
                │    Database     │
                └─────────────────┘
```

### Core Workflows

#### 1. Email Communication Flow

**Inbound Email Processing:**

```
1. AWS SES receives debtor reply → webhook to /api/webhooks/email/received
2. System parses email, identifies debtor by email address
3. Email stored in database with basic threading detection
4. Email content and sender logged for future reference
5. System can track engagement and history
```

**Outbound Email Sending:**

```
1. System generates payment emails using Tailwind templates
2. Email sent via AWS SES with tracking
3. System logs communication in database
4. Email includes unique tracking pixels for engagement
```

#### 2. Payment Processing Flow

**Payment Link Generation:**

```
1. System creates unique Stripe Checkout session
2. Dynamic payment page generated with debtor-specific content
3. Multiple payment options: full payment, partial, payment plan
4. Mobile-optimized page with Apple/Google Pay integration
5. Payment page visits tracked for engagement analytics
```

**Payment Processing:**

```
1. Debtor completes payment → Stripe webhook to /api/webhooks/stripe
2. System updates debtor balance and status
3. Automatic receipt generation and email delivery
4. Follow-up sequence can be manually triggered
5. Payment analytics updated for reporting
```

#### 3. Debtor Tracking System

**Database Tracking:**

```
- Complete email communication history
- Payment attempts and successful transactions
- Engagement metrics (email opens, payment page visits)
- Basic behavioral scoring for future reference
```

## Core Product Features

### Email Management System

- **Email Processing:** Automated processing of all debtor emails with database storage
- **Basic Threading:** Email threading using In-Reply-To headers for conversation tracking
- **Engagement Tracking:** Email open rates, click tracking, response monitoring
- **Template System:** Tailwind-styled email templates for consistent branding

### One-Click Payment System

- **Smart Payment Links:** Mobile-optimized pages with Apple Pay, Google Pay, card options
- **Stripe Integration:** Real-time payment processing with immediate confirmation
- **Payment Plans:** Manual payment plan setup with custom terms
- **Receipt System:** Automatic receipt generation and delivery

### Tracking & Analytics

- **Email Intelligence:** Open rates, click tracking, engagement monitoring
- **Payment Analytics:** Conversion rates, payment method preferences
- **Communication History:** Complete audit trail of all debtor interactions
- **Database Reports:** Comprehensive reporting on collection activities

## Essential Features (Current Implementation)

### 1. Email Webhook System

**Email Processing:**

- Webhook endpoint to receive debtor email responses
- Parse email content and sender identification
- Route to appropriate debt account automatically
- Track email engagement metrics
- Store all communications in database

### 2. Payment Link Generation

**Stripe Integration:**

- Dynamic payment link creation per debt account
- Multiple payment options (full, partial, payment plan)
- Mobile-optimized payment pages
- Real-time payment processing and account updates
- Automatic receipt generation and delivery

### 3. Debtor Management System

**Comprehensive CRM:**

- Complete debtor interaction history
- Multi-channel communication tracking (email, payment)
- Payment status and history tracking
- Next action planning and follow-up scheduling

## Technology Stack

### Frontend & Backend (Next.js Full-Stack)

- Mobile-first responsive design
- Real-time dashboard for debt management
- Payment portal with optimized UX
- Server-side rendering for performance
- TypeScript for type safety
- App Router for modern routing

### Database (PostgreSQL with Drizzle ORM)

- Email storage and threading
- Debt and debtor management
- Payment tracking and history
- Comprehensive audit logging

### Key Integrations

- **Stripe:** Payment processing and subscription management
- **AWS SES:** Email service and transactional automation
- **PostgreSQL:** Database for all data storage

## Current System Status

### ✅ **Working Features**

- Next.js full-stack application with App Router
- Email receiving via AWS SES webhooks
- Basic email threading with In-Reply-To detection
- Payment processing with Stripe integration
- Database storage with Drizzle ORM
- Tailwind-styled email templates
- Payment page generation with unique tokens

### 🚫 **Removed/Simplified Features**

- Automatic AI email responses
- Complex email threading with References headers
- Outbound calling systems
- Advanced AI automation
- Complex workflow automation

### 🔄 **Planned Features**

- SMS communication integration
- Advanced reporting dashboard
- Enhanced payment plan management
- Improved engagement scoring
- Compliance monitoring tools

## Planning Status & Next Priorities

### ✅ **Completed Planning**

- [x] Business strategy and revenue model
- [x] Legal compliance framework (FDCPA/TCPA)
- [x] Core product requirements and technical architecture
- [x] Database schema for tracking all interactions
- [x] Complete debtor journey workflows
- [x] Dynamic page personalization strategy
- [x] AI integration points and engagement scoring

### 🔄 **In Progress**

- [ ] API endpoint specifications (started with main.go structure)
- [ ] Integration service configurations

### ❌ **Top Priority Planning Items**

#### 1. **Service Integration Specifications** 🚨

**Why Critical:** Need exact API configs before development
**What's Needed:**

- AWS SES webhook payload specifications and bounce handling
- Voice solution decision: VAPI vs Twilio + OpenAI integration
- Stripe webhook event handling requirements
- OpenAI API usage patterns for compliance
- Phone number management (toll-free acquisition)

#### 2. **Compliance Implementation Details** 🚨

**Why Critical:** Legal requirements must be built-in from day 1
**What's Needed:**

- FDCPA validation notice templates (exact legal text)
- TCPA consent collection workflows
- Do Not Call registry integration process
- Call recording and retention procedures
- Dispute handling automation rules

#### 3. **AI Prompt Engineering Strategy** 🔄

**Why Critical:** AI quality determines collection success
**What's Needed:**

- Email response prompt templates by scenario
- Phone conversation scripts with compliance checks
- Sentiment analysis and response categorization
- Escalation triggers for human intervention
- Tone and messaging guidelines per engagement score

## Dynamic Page Generation

### Landing Page (/debtor/:token)

**Purpose:** Main debt information and payment portal
**Content:**

- Personalized greeting with debtor name
- Current balance and payment options
- Contact information and dispute process
- Payment history if applicable
- Mobile-optimized responsive design

### Payment Page (/pay/:token)

**Purpose:** Streamlined payment completion
**Content:**

- Balance summary with payment options
- Stripe Checkout integration
- Multiple payment methods (card, ACH, Apple Pay, Google Pay)
- Payment plan options with terms
- SSL security badges and trust indicators

### Info Page (/info/:token)

**Purpose:** Account details and communication preferences
**Content:**

- Complete account history
- Communication preferences (email/phone consent)
- Dispute filing forms
- Contact information updates
- Document downloads (validation notices, etc.)

## Performance Requirements

### Response Times

- Email webhook processing: <500ms
- Payment page load: <2 seconds
- API responses: <200ms average
- Database queries: <50ms average

### Scalability Targets

- Support 1,000+ active debtors
- Handle 100+ daily communications
- Process 50+ concurrent payments
- 99.9% uptime requirement

### Security Requirements

- All PII encrypted at rest and in transit
- PCI DSS compliance for payment data
- Role-based access control
- Audit logging for all data access

## Current Architecture

### Next.js Full-Stack Structure

```
app/
├── api/
│   ├── webhooks/
│   │   ├── email/received/route.ts
│   │   └── stripe/route.ts
│   └── checkout/route.ts
├── dashboard/page.tsx
├── pay/[id]/page.tsx
└── layout.tsx

lib/
├── db/
│   ├── schema.ts
│   ├── emails.ts
│   └── email-threads.ts
├── aws/ses.ts
└── email.ts

emails/
├── first-email.tsx
└── email-response.tsx
```

### Database Schema (Simplified)

- **emails**: Message storage with threading
- **email_threads**: Basic conversation grouping
- **debts**: Core debt information
- **payments**: Stripe payment tracking

## Key Performance Metrics

### Technical KPIs

- Email webhook processing: <500ms response time
- Payment page load: <2 seconds
- System uptime: 99.9%
- Database query performance: <50ms average

### Business KPIs

- **Email Processing:** 100% webhook reliability
- **Payment Conversion:** Track click-to-pay rates
- **Response Time:** Email webhook processing speed
- **Engagement:** Email open and click rates

## Implementation Status

### ✅ **Completed**

- Next.js full-stack architecture
- AWS SES integration for email sending/receiving
- Stripe payment processing
- Database schema with Drizzle ORM
- Basic email threading detection
- Payment page generation
- Tailwind email templates

### 🔄 **In Progress**

- Enhanced reporting dashboard
- Advanced payment options
- SMS integration planning

### ❌ **Future Enhancements**

- SMS communication system
- Advanced analytics dashboard
- Mobile application
- Enhanced compliance monitoring
- Automated workflow triggers

## Financial Projections

### Current Operating Model

**Manual Collection with Digital Tools:**

```
Monthly Revenue Target: $10,000-17,000

Direct Costs:
- Payment processing (2.9%): $290-493
- AWS platform costs: $200-500
- Software subscriptions: $100-200

Operating Costs:
- Insurance & bonding: $300
- Legal & compliance: $500
- Office/admin: $300

Total Monthly Costs: $1,490-1,993
Net Profit: $8,507-15,007
Profit Margin: 85-88%
```

## Security & Compliance

- **Data Encryption:** All PII encrypted at rest and in transit
- **Payment Security:** PCI DSS compliant via Stripe
- **Database Security:** Secure PostgreSQL with access controls
- **Email Security:** AWS SES with proper authentication

## Monitoring and Analytics

### Current Metrics

- Email delivery and engagement rates
- Payment conversion tracking
- Database performance monitoring
- Application uptime and response times

### Planned Enhancements

- Advanced debtor engagement scoring
- Payment prediction analytics
- Communication effectiveness metrics
- Compliance monitoring dashboard

---

**Current Focus:** The system now operates as a streamlined debt collection platform with email tracking, payment processing, and basic automation - focused on reliability and compliance rather than complex AI automation.
