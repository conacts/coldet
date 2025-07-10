# Debtor Journey & Workflows

## Simplified Debtor Lifecycle

The current system focuses on email tracking, payment processing, and manual workflow management rather than automated AI responses.

### 1. Email Communication Flow

**Inbound Email Processing**

```
Trigger: Debtor sends email reply
Action: Webhook receives and processes email
Process:
1. AWS SES receives email → webhook to /api/webhooks/email/received
2. System parses email and identifies debtor by email address
3. Email stored in database with messageId and threading info
4. Email content available for manual review and response
5. Engagement metrics updated (email received, response time)

Tracking:
- Email received timestamp
- Sender identification
- Basic threading via In-Reply-To headers
- Content stored for future reference
```

**Outbound Email Sending**

```
Trigger: Manual initiation or system event (payment, receipt)
Action: Send email via AWS SES
Process:
1. Generate email using Tailwind templates
2. Send via AWS SES SendEmail API
3. Log outbound email in database
4. Track delivery status and engagement

Email Types:
- Initial contact emails
- Payment confirmation receipts
- Payment reminder emails
- Settlement offer emails
```

### 2. Debtor Response Scenarios

**Scenario A: Email Reply Received**

```
Webhook: /api/webhooks/email/received processes debtor reply
Process:
1. Parse and store email content in database
2. Identify debtor by email address matching
3. Update email thread with new message
4. Flag for manual review and response
5. Track engagement metrics

Manual Review Process:
- Staff reviews email content and context
- Determine appropriate response (payment plan, dispute, information)
- Send personalized response via email system
- Update debtor status and notes
```

**Scenario B: Payment Page Visit**

```
Event: Debtor visits /pay/:token
Process:
1. Log page visit with timestamp
2. Track payment page engagement
3. Record payment method selections
4. Store completion or abandonment data
5. Use data for follow-up planning

Page Analytics:
- Time spent on page
- Payment method selected
- Form completion vs abandonment
- Mobile vs desktop usage
- Return visits
```

### 3. Payment Processing Workflows

**Successful Payment Flow**

```
1. Debtor completes Stripe checkout
2. Webhook: /api/webhooks/stripe payment_intent.succeeded
3. System updates debt balance and status
4. Automatic receipt email sent via template
5. Update debtor status to "paid" or "partial payment"
6. Remove from active collection sequences (manual)
7. Log complete payment transaction
```

**Failed Payment Flow**

```
1. Payment attempt fails (declined card, insufficient funds)
2. Webhook: /api/webhooks/stripe payment_intent.payment_failed
3. System logs failed payment attempt
4. Flag for manual follow-up with alternative options
5. Staff can send targeted emails about other payment methods
6. Schedule follow-up contact as needed
```

**Payment Plan Setup**

```
1. Debtor requests payment plan (email or phone)
2. Staff manually sets up Stripe subscription
3. First payment processed immediately
4. System tracks payment plan compliance
5. Manual reminders sent before each due date
6. Collections resume if plan defaults (manual process)
```

### 4. Dynamic Page Content

**Landing Page (/debtor/:token) Features**

```
Standard Content:
- Debtor name and account information
- Current balance and payment options
- Contact information for questions
- Payment history if applicable
- Mobile-optimized responsive design
- Dispute process information
```

**Payment Page (/pay/:token) Features**

```
Payment Options:
- Full payment with potential discount
- Partial payment options
- Payment plan inquiry contact
- Multiple payment methods (card, ACH, digital wallets)
- Trust badges and security information
- Mobile-optimized checkout process
```

### 5. Basic Compliance Tracking

**FDCPA Compliance Requirements**

```
Communication Rules:
1. Track all communication attempts and responses
2. Maintain records of all debtor interactions
3. Honor cease and desist requests immediately
4. Include required disclosures in all communications
5. Log all interactions for audit trail
```

**Manual Compliance Checks**

```
Before communications:
1. Review contact frequency (max 7 attempts/week)
2. Verify appropriate contact times (8 AM - 9 PM local time)
3. Check cease and desist status
4. Ensure proper disclosures included
5. Document interaction details
```

### 6. Engagement Tracking

**Basic Engagement Metrics**

```
Email Actions:
- Email delivered and opened
- Links clicked (payment page visits)
- Email replies received
- Unsubscribe requests

Payment Actions:
- Payment page visits
- Payment form starts
- Successful payments
- Failed payment attempts
- Payment plan requests

Communication Preferences:
- Preferred contact methods
- Response patterns
- Best contact times
- Historical engagement levels
```

**Manual Scoring Considerations**

```
High Engagement Indicators:
- Quick email responses
- Multiple payment page visits
- Completed payments
- Payment plan compliance

Low Engagement Indicators:
- No email responses
- No payment page visits
- Failed payments without follow-up
- Requests to stop contact

Medium Engagement:
- Occasional responses
- Payment page visits without completion
- Questions about payment options
- Partial payments
```

### 7. Streamlined Communication Management

**Email-Focused Communication**

```
- Primary communication via email with manual responses
- All emails tracked in database with threading
- Payment confirmations sent automatically
- Manual follow-up scheduling based on debtor responses
- Consistent branding via Tailwind email templates
```

**Payment-Focused Experience**

```
- Simple, mobile-optimized payment pages
- Multiple payment method options
- Clear payment terms and settlement offers
- Automatic receipt generation
- Payment plan options with manual setup
```

### 8. Current System Capabilities

**Automated Features:**

- Email webhook processing and storage
- Payment processing via Stripe
- Receipt generation and delivery
- Basic email threading detection
- Payment page visit tracking

**Manual Features:**

- Email response generation and sending
- Payment plan setup and management
- Follow-up scheduling and communication
- Compliance monitoring and documentation
- Engagement analysis and strategy adjustment

**Future Enhancements:**

- SMS integration for multi-channel communication
- Enhanced analytics and reporting
- Automated payment reminder sequences
- Advanced engagement scoring
- Compliance monitoring dashboard

This simplified system maintains core functionality while allowing for manual control and oversight of all debtor communications, ensuring compliance and personalized service.
