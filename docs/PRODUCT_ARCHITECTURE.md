# Product Architecture & Requirements

## Product Vision

AI-first debt collection platform that fully automates debtor interactions while maximizing payment conversion through seamless user experience. Every touchpoint between debtors and the company is AI-mediated to ensure compliance, efficiency, and scale.

## Technical Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Email Service │    │  Phone Service  │    │ Payment Service │
│    (AWS SES)    │    │    (Twilio)     │    │    (Stripe)     │
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

### Core Workflows

#### 1. Email Communication Flow

**Outbound Email:**
```
1. System identifies debtor needing contact
2. AI generates personalized email with payment link
3. Email sent via AWS SES with tracking
4. System logs communication in database
5. Email includes unique tracking pixels
```

**Inbound Email (Webhook):**
```
1. AWS SES receives debtor reply → webhook to /webhook/email
2. System parses email, identifies debtor by email address
3. AI analyzes content and generates appropriate response
4. System logs interaction and updates debtor engagement score
5. Automated response sent if appropriate
```

#### 2. Phone Communication Flow

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

#### 3. Payment Processing Flow

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

#### 4. Debtor Tracking System

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

## Core Product Features

### AI Communication Engine

- **AI Email Handler:** Automated responses to all debtor emails using context-aware AI
- **AI Voice Calling:** Outbound calling system with natural language processing
- **Sentiment Analysis:** Real-time debtor mood assessment to optimize approach
- **Compliance Monitoring:** AI ensures all communications meet FDCPA/TCPA requirements

### One-Click Payment System

- **Smart Payment Links:** Mobile-optimized pages with Apple Pay, Google Pay, card options
- **Dynamic Pricing:** AI-suggested settlement amounts based on debtor behavior
- **Instant Processing:** Real-time Stripe integration with immediate confirmation
- **Payment Plans:** Automated installment setup with recurring billing

### Advanced Tracking & Analytics

- **Email Intelligence:** Open rates, click tracking, engagement scoring
- **Website Analytics:** Visit frequency, time spent, conversion funnels
- **Behavioral Patterns:** AI-driven debtor propensity scoring
- **Performance Metrics:** Collection rates, response times, compliance scores

## Essential Features for MVP

### 1. Email Webhook System
**Incoming Email Processing:**
- Webhook endpoint to receive debtor email responses
- Parse email content and sender identification
- Route to appropriate debt account automatically
- AI-powered response generation
- Track email engagement metrics

### 2. Call Management System
**Outbound Calling:**
- AI-driven outbound calling with TCPA compliance
- Dynamic script generation based on debt status
- Call outcome tracking and next action scheduling
- Voicemail detection and message leaving

**Inbound Call Handling:**
- Toll-free number for debtor callbacks
- Interactive Voice Response (IVR) system
- Call routing to appropriate account context
- Call recording and transcription

### 3. Payment Link Generation
**Stripe Integration:**
- Dynamic payment link creation per debt account
- Multiple payment options (full, partial, payment plan)
- Mobile-optimized payment pages
- Real-time payment processing and account updates
- Automatic receipt generation and delivery

### 4. Debtor Tracking System
**Comprehensive CRM:**
- Complete debtor interaction history
- Multi-channel communication tracking (email, call, SMS, payment)
- Behavioral scoring and payment propensity
- Compliance status monitoring
- Next action automation

## Technology Stack

### Frontend (Next.js)
- Mobile-first responsive design
- Real-time dashboard for debt management
- Payment portal with optimized UX
- Progressive Web App capabilities
- TypeScript for type safety

### Backend (Golang)
- High-performance API server
- Microservices architecture
- Cron job automation engine
- Real-time event processing
- Comprehensive logging and monitoring

### Key Integrations
- **Stripe:** Payment processing and subscription management
- **OpenAI/Claude:** AI communication and decision making
- **AWS SES:** Email service and transactional automation
- **Twilio:** SMS and voice communication
- **PostgreSQL:** Database for all data storage

## Development Timeline (90 Days)

### Phase 1 (Week 1-2): Core Infrastructure
- [ ] Golang API foundation with authentication
- [ ] Next.js frontend with basic UI components
- [ ] Stripe payment integration
- [ ] Database design and setup
- [ ] Basic AI email response system

### Phase 2 (Week 3-4): Payment System
- [ ] Stripe integration and payment link generation
- [ ] Payment webhook handling
- [ ] Account balance management
- [ ] Payment confirmation system

### Phase 3 (Week 5-6): Communication Engine
- [ ] AI email response system
- [ ] Outbound calling with Twilio
- [ ] Call outcome tracking
- [ ] Communication history dashboard

### Phase 4 (Week 7-8): Advanced Features
- [ ] Inbound call handling and IVR
- [ ] Behavioral scoring system
- [ ] Automated follow-up sequences
- [ ] Compliance monitoring tools

## API Architecture

### Database Schema
See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for complete table definitions and relationships.

### API Endpoints
```
POST /webhook/email - Handle incoming emails
POST /webhook/stripe - Handle payment events
POST /api/calls/outbound - Initiate AI call
POST /api/payment-links - Generate payment link
GET /api/accounts/:id - Account details
PUT /api/accounts/:id - Update account status
```

### Integration Points
- **AWS SES:** Email webhook integration and bounce handling
- **Voice API:** Twilio Voice + AI (OpenAI/Claude)
- **Payments:** Stripe Checkout + Payment Links
- **SMS:** Twilio Messaging API
- **AI:** OpenAI/Claude API for content generation

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

## User Experience Flow

1. **Debt Import:** Automated ingestion of debt portfolios
2. **AI Outreach:** Intelligent communication sequence (email → SMS → call)
3. **Payment Portal:** One-click payment with multiple options
4. **Follow-up:** Automated sequences based on debtor responses
5. **Resolution:** Payment processing and account closure

## Key Performance Metrics

### Technical KPIs
- Email webhook processing: <500ms response time
- Payment page load: <2 seconds
- AI response generation: <30 seconds
- System uptime: 99.9%

### Business KPIs
- **Payment Conversion Rate:** Target 25%+ within 30 days
- **Response Time:** Sub-30 second AI email responses
- **Page Load Speed:** <2 seconds for payment portals
- **Uptime:** 99.9% platform availability
- **Compliance Score:** 100% FDCPA adherence

### Success Metrics
- Email response rate: >90% within 30 minutes
- Payment link conversion: >15% click-to-pay
- Call contact rate: >25% live connections
- Account resolution time: <30 days average
- Compliance score: 100% (zero violations)

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

## Financial Projections

### Revenue Model Impact on Margins

#### Commission-Based Collections (70-75% margins)
**Pros:** Higher margins, lower risk, predictable costs
**Cons:** Need established client relationships, longer sales cycles

#### Debt Portfolio Purchasing (20-30% margins)
**Pros:** Faster to start, own the asset, higher potential returns
**Cons:** Much lower margins, higher risk, capital intensive

### Realistic Cost Structure

**Commission-Based Model (Best Case):**
```
Monthly Revenue: $17,000 (30% commission on $57k collected)

Direct Costs:
- Payment processing (2.9%): $1,653
- AI/Communication APIs: $500
- Platform costs (AWS, etc.): $800

Operating Costs:
- Insurance & bonding: $300
- Legal & compliance: $700
- Office/admin: $400

Total Monthly Costs: $4,353
Net Profit: $12,647
Profit Margin: 74.4%
```

**Debt Purchase Model (Higher Risk):**
```
Monthly Revenue: $17,000 (from portfolio recoveries)

Direct Costs:
- Debt acquisition (10% face value): $8,500
- Payment processing: $1,653
- AI/Communication APIs: $500
- Platform costs: $800

Operating Costs:
- Insurance & bonding: $300
- Legal & compliance: $700
- Office/admin: $400

Total Monthly Costs: $12,853
Net Profit: $4,147
Profit Margin: 24.4%
```

## Security & Compliance

- **Data Encryption:** End-to-end encryption for all PII
- **Access Controls:** Role-based permissions and audit logs
- **PCI Compliance:** Secure payment data handling
- **TCPA Compliance:** Automated consent verification
- **Backup Systems:** Real-time data replication

## Integration Requirements

### AWS SES Setup
- Account setup and domain verification
- Webhook endpoint security configuration
- Email template design for branding
- Bounce and complaint handling
- Suppression list management for opt-outs

### Stripe Integration
- Merchant account setup and verification
- Webhook endpoint configuration
- Payment Link API implementation
- Subscription management for payment plans
- Dispute and chargeback handling

### Monitoring and Analytics

#### Key Metrics Dashboard
- Contact rates by channel (email/phone/SMS)
- Payment conversion rates
- Average resolution time
- Compliance score tracking
- Revenue analytics by portfolio

#### Operational Alerts
- Failed webhook processing
- Compliance violations detected
- Payment processing errors
- System performance degradation
- Security incidents

## Future Enhancements (Post-Launch)

- **Voice AI Improvements:** More natural conversation flows
- **Predictive Analytics:** Machine learning for payment prediction
- **Mobile App:** Native iOS/Android applications
- **Advanced Reporting:** Custom dashboard builder
- **API Marketplace:** Third-party integrations

---

**Implementation Focus:** Service Integration Specifications and Compliance Implementation Details are the highest priority items blocking development progress.