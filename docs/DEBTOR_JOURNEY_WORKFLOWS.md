# Debtor Journey & Workflows

## Complete Debtor Lifecycle

### 1. Initial Contact Sequence

**Day 1: Email Introduction**
```
Trigger: New debt account imported
Action: AI generates personalized email
Content: 
- Debt validation notice (FDCPA compliant)
- Payment options with link to /pay/:token
- Dispute process information
- Contact preferences form

Tracking:
- Email sent, delivered, opened, clicked
- Payment page visits recorded
- Engagement score initialized
```

**Day 7: Follow-up Email (if no response)**
```
Trigger: No payment or response after 7 days
Action: AI sends reminder email
Content:
- Friendly payment reminder
- Updated payment link with settlement options
- Phone number for questions

Tracking:
- Communication logged
- Engagement score updated based on email interaction
```

**Day 14: Phone Contact**
```
Trigger: Still no response after email attempts
Action: AI-powered outbound call
Process:
1. Check TCPA consent status
2. Verify not on Do Not Call list
3. Call with compliance script
4. Log call outcome and schedule follow-up

Tracking:
- Call duration, outcome (answered/voicemail/busy)
- Conversation transcript for compliance
- Next action scheduled automatically
```

### 2. Debtor Response Scenarios

**Scenario A: Email Reply Received**
```
Webhook: /webhook/email receives debtor reply
Process:
1. Parse email content with AI
2. Identify debtor by email address
3. Categorize response (payment plan request, dispute, question)
4. Generate appropriate AI response
5. Update engagement score positively

Response Types:
- Payment plan request → AI offers plan options
- Dispute claim → Sends dispute forms and pauses collection
- Questions → AI provides information and payment options
- Hardship → AI offers reduced payment options
```

**Scenario B: Inbound Phone Call**
```
Webhook: /webhook/twilio receives inbound call
Process:
1. IVR prompts for account identification
2. System looks up debtor by phone or account info
3. AI voice agent handles conversation
4. Route to human if needed for complex issues
5. Log complete interaction

IVR Flow:
"Thank you for calling. For your security, please enter your account number or date of birth..."
→ System identifies debtor
→ "I see you have an account with a balance of $X. How can I help you today?"
```

**Scenario C: Payment Page Visit**
```
Event: Debtor visits /pay/:token
Process:
1. Log page visit with timestamp
2. Track time on page and interactions
3. Record any form fields completed
4. Update engagement score based on behavior
5. Send follow-up email if they don't complete payment

Page Analytics:
- Time spent on page
- Payment method selected
- Form abandonment points
- Mobile vs desktop usage
```

### 3. Payment Processing Workflows

**Successful Payment Flow**
```
1. Debtor completes Stripe checkout
2. Webhook: /webhook/stripe payment_intent.succeeded
3. System updates debt balance
4. Sends automatic receipt email
5. Updates debtor status to "paid" or "partial payment"
6. Schedules thank you follow-up
7. Removes from active collection sequences
```

**Failed Payment Flow**
```
1. Payment attempt fails (declined card, insufficient funds)
2. Webhook: /webhook/stripe payment_intent.payment_failed
3. AI sends helpful email with alternative payment options
4. Suggests different payment method or payment plan
5. Schedules follow-up call in 3 days
6. Updates engagement score (negative for failed payment)
```

**Payment Plan Setup**
```
1. Debtor selects payment plan on /pay/:token
2. Stripe subscription created for recurring payments
3. First payment processed immediately
4. Automatic reminders before each payment due
5. System tracks plan compliance
6. Collections resume if plan defaults
```

### 4. Dynamic Page Personalization

**Landing Page (/debtor/:token) Content Rules**
```
High Engagement Score (80-100):
- Prominent "Pay Now" button
- Full payment options emphasized
- "Quick settlement" discount offers

Medium Engagement Score (40-79):
- Payment plan options highlighted
- "Speak with us" contact forms
- Educational content about debt resolution

Low Engagement Score (0-39):
- Larger fonts, simpler language
- Basic contact information
- Clear dispute process explanation
```

**Payment Page (/pay/:token) Optimization**
```
Mobile Users:
- Apple Pay/Google Pay prominently featured
- Single-page checkout process
- Large touch-friendly buttons

Desktop Users:
- Detailed payment breakdown
- Multiple payment method options
- Trust badges and security information

Previous Visitors:
- "Welcome back" messaging
- Saved payment preferences
- Progress indicators if previous abandonment
```

### 5. Compliance Automation

**FDCPA Compliance Checks**
```
Before each communication:
1. Check contact frequency (max 7 calls/week)
2. Verify contact time restrictions (8 AM - 9 PM local time)
3. Confirm not on cease and desist list
4. Include required disclosures in all communications
5. Log interaction for audit trail
```

**TCPA Compliance for Calls**
```
Before auto-dialing cell phones:
1. Check consent database for written permission
2. If no consent: manual dial only (1 call/day max)
3. If consent exists: proceed with AI calling
4. Always include opt-out option
5. Honor opt-out requests immediately
```

### 6. Engagement Scoring Algorithm

**Real-time Score Updates**
```
Email Actions:
- Email opened: +5 points
- Link clicked: +10 points
- Replied to email: +15 points
- Unsubscribed: -20 points

Phone Actions:
- Answered call: +20 points
- Called us back: +25 points
- Requested not to call: -15 points

Website Actions:
- Visited payment page: +15 points
- Started payment form: +20 points
- Completed payment: +50 points
- Multiple visits: +5 per visit

Payment Behavior:
- Made payment: +50 points
- Set up payment plan: +30 points
- Failed payment: -10 points
- Requested hardship: -5 points
```

**Score-Based Automation**
```
Score 80-100: Daily contact allowed, aggressive payment push
Score 60-79: Every other day contact, payment plan emphasis
Score 40-59: Twice weekly contact, education focus
Score 20-39: Weekly contact, basic information
Score 0-19: Minimal contact, dispute resolution focus
```

### 7. Multi-Channel Coordination

**Unified Messaging Across Channels**
```
- All channels (email, phone, SMS) share same conversation context
- AI maintains consistent tone and information
- No contradictory messages across channels
- Debtor preferences respected (email-only, phone-only, etc.)
```

**Cross-Channel Analytics**
```
- Track which channel generates best response rates
- Optimize timing based on debtor behavior patterns
- Personalize channel selection per debtor
- Measure conversion rates by communication method
```

This system ensures every debtor interaction is tracked, optimized, and compliant while maximizing payment conversion through personalized experiences.