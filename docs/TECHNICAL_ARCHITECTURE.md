# Technical Architecture

## System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Email Service │    │  Phone Service  │    │ Payment Service │
│   (SendGrid)    │    │    (Twilio)     │    │    (Stripe)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COLDET API SERVER (Go)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Webhooks   │  │ AI Engine   │  │     Tracking System     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
                ┌─────────────────┐
                │   PostgreSQL    │
                │    Database     │
                └─────────────────┘
```

## Core Workflows

### 1. Email Communication Flow

**Outbound Email:**
```
1. System identifies debtor needing contact
2. AI generates personalized email with payment link
3. Email sent via SendGrid with tracking
4. System logs communication in database
5. Email includes unique tracking pixels
```

**Inbound Email (Webhook):**
```
1. SendGrid receives debtor reply → webhook to /webhook/email
2. System parses email, identifies debtor by email address
3. AI analyzes content and generates appropriate response
4. System logs interaction and updates debtor engagement score
5. Automated response sent if appropriate
```

### 2. Phone Communication Flow

**Outbound Calling:**
```
1. System schedules call based on debtor status/timezone
2. Twilio initiates call to debtor
3. AI voice agent conducts conversation with compliance scripting
4. Call outcome recorded (answered/voicemail/no-answer)
5. Follow-up actions scheduled automatically
```

**Inbound Calling:**
```
1. Debtor calls toll-free number → Twilio webhook to /webhook/twilio
2. IVR prompts for account number or personal info
3. System identifies debtor and routes to appropriate context
4. AI handles conversation or transfers to human if needed
5. Call recorded and transcribed for compliance
```

### 3. Payment Processing Flow

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
1. Debtor completes payment → Stripe webhook to /webhook/stripe
2. System updates debtor balance and status
3. Automatic receipt generation and email delivery
4. Follow-up sequence triggered (thank you, account closure)
5. Payment analytics updated for reporting
```

### 4. Debtor Tracking System

**Page View Tracking:**
```
- JavaScript on all debtor pages tracks engagement
- Time on page, button clicks, form interactions
- Real-time analytics sent to /track/page-view endpoint
- Behavioral scoring updated based on engagement
```

**Engagement Scoring:**
```
Factors:
- Email open/click rates (weight: 25%)
- Phone call response rate (weight: 30%) 
- Payment page visits (weight: 20%)
- Response time to communications (weight: 15%)
- Payment completion rate (weight: 10%)

Score ranges: 0-100 (higher = more likely to pay)
```

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

## Data Flow Architecture

### Real-time Updates
```
1. All debtor interactions immediately update database
2. Engagement scores recalculated on each interaction
3. Next contact actions automatically scheduled
4. Compliance rules checked in real-time
5. Dashboard analytics updated via WebSocket
```

### Compliance Integration
```
- FDCPA call frequency limits enforced automatically
- TCPA consent verification before phone contact
- Do Not Call registry checked before dialing
- All communications logged for 7-year retention
- Automatic cease and desist handling
```

## Integration Points

### SendGrid Email Service
```
- Webhook URL: /webhook/email
- Events: delivered, opened, clicked, replied
- Template management for consistent branding
- Suppression list management for opt-outs
```

### Twilio Voice/SMS
```
- Webhook URL: /webhook/twilio  
- Voice: Call progress, recordings, transcriptions
- SMS: Delivery status, replies, opt-outs
- Phone number validation and carrier lookup
```

### Stripe Payments
```
- Webhook URL: /webhook/stripe
- Events: payment_intent.succeeded, checkout.session.completed
- Payment Links API for dynamic link generation
- Customer portal for payment plan management
```

### AI Integration (OpenAI/Claude)
```
- Email content generation with compliance checking
- Phone conversation scripting and responses
- Sentiment analysis of debtor communications
- Predictive scoring for payment likelihood
```

## Performance Requirements

### Response Times
- Email webhook processing: <500ms
- Payment page load: <2 seconds
- API responses: <200ms average
- Database queries: <50ms average

### Scalability Targets
- Support 10,000+ active debtors
- Handle 1,000+ daily communications  
- Process 100+ concurrent payments
- 99.9% uptime requirement

### Security Requirements
- All PII encrypted at rest and in transit
- PCI DSS compliance for payment data
- Role-based access control
- Audit logging for all data access
- Regular security assessments

## Monitoring and Analytics

### Key Metrics Dashboard
- Contact rates by channel (email/phone/SMS)
- Payment conversion rates
- Average resolution time
- Compliance score tracking
- Revenue analytics by portfolio

### Operational Alerts
- Failed webhook processing
- Compliance violations detected
- Payment processing errors
- System performance degradation
- Security incidents