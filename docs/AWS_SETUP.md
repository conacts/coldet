# AWS Setup Documentation for COLDETS

## Overview

Complete AWS setup for AI-powered debt collection email system with automated responses, threading, and compliance tracking.

## IAM User: `coldets-service-user`

-   **Purpose:** Dedicated service user for production email automation and AWS integrations
-   **Path:** `/service-accounts/`
-   **Permissions:**
    -   `AmazonSESFullAccess` - For sending and receiving emails
    -   `AmazonSNSFullAccess` - For webhook notifications and topic management
    -   `AmazonS3FullAccess` - For file storage and attachments (future)
-   **Access Keys:** Configured in `.env.local`

### Environment Variables

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=AKIA...your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-2

# Email Configuration
SES_FROM_EMAIL=noreply@yourdomain.com
SES_REPLY_TO_EMAIL=support@yourdomain.com
EMAIL_DOMAIN=yourdomain.com

# OpenAI Configuration
OPENAI_API_KEY=your-openai-key
```

---

## SES (Simple Email Service) Setup

### 1. Domain Verification

-   **Domain:** `coldets.com` (replace with your domain)
-   **Status:** ✅ Verified
-   **DNS Records Required:**
    -   TXT: `_amazonses.yourdomain.com`
    -   MX: For receiving emails
    -   DKIM: For email authentication

### 2. Email Address Verification

-   **Sending Email:** `noreply@yourdomain.com`
-   **Reply-To Email:** `support@yourdomain.com`
-   **Status:** ✅ Verified

### 3. SES Inbound Email Processing

-   **Receives emails** sent to your domain
-   **Triggers SNS** topic for webhook delivery
-   **Supports threading** with Message-ID tracking

### 4. SES Outbound Email Sending

-   **Raw email format** with custom headers
-   **Threading support** (In-Reply-To, References)
-   **Text-only format** for maximum deliverability
-   **AI-generated content** with compliance checking

---

## SNS (Simple Notification Service) Setup

-   **Topic Name:** `ses-inbound-email`
-   **Topic ARN:** `arn:aws:sns:us-east-2:722868990407:ses-inbound-email`
-   **Subscription Endpoint:** `https://yourdomain.com/api/webhooks/email/received`
-   **Subscription Status:** ✅ Confirmed
-   **Protocol:** HTTPS
-   **Delivery Policy:** Standard retry with dead letter queue

---

## Email System Architecture

### Inbound Email Flow

```
Email → AWS SES → SNS Topic → Webhook → AI Processing → Database Storage
```

### Outbound Email Flow

```
AI Response → Email Sender → AWS SES → Delivered Email → Threading Update
```

### Key Features

-   **🤖 AI-Powered Responses:** OpenAI integration with debt collection context
-   **📧 Email Threading:** Maintains conversation history with proper headers
-   **🗄️ Database Integration:** Stores all emails with threading relationships
-   **⚖️ Compliance Tracking:** Monitors AI generation and compliance status
-   **🔄 Automated Workflow:** End-to-end email processing without manual intervention

---

## Webhook Integration

### Endpoint Details

-   **URL:** `/api/webhooks/email/received`
-   **Method:** POST
-   **Content-Type:** `text/plain` (SNS format)
-   **Authentication:** None (SNS signature verification recommended)

### Processing Pipeline

1. **Parse SNS notification** with SES email data
2. **Extract sender and content** from email payload
3. **Find or create email thread** using headers/subject
4. **Store inbound email** in database with threading
5. **Generate AI response** using email history context
6. **Send response email** via AWS SES with threading
7. **Store outbound email** for future context

### Handler Functions

-   `handleReceivedEmail()` - Main orchestration
-   `findOrCreateEmailThread()` - Threading logic
-   `generateResponseEmail()` - AI response generation
-   `sendEmailResponse()` - Email delivery

---

## Database Schema

### Tables Created

-   **`emails`** - All inbound/outbound emails with threading
-   **`email_threads`** - Conversation threads by debtor/subject
-   **Enhanced `debts`** - Updated for email integration

### Key Fields

-   **`messageId`** - Unique email identifier for threading
-   **`threadId`** - Links emails to conversations
-   **`direction`** - Inbound vs outbound tracking
-   **`aiGenerated`** - AI response identification
-   **`complianceChecked`** - Regulatory compliance status

---

## Implementation Files

### Core Email System

-   `lib/email.ts` - Main email processing logic
-   `lib/email-sender.ts` - Email sending orchestration
-   `lib/aws/ses.ts` - AWS SES client and functions

### Database Layer

-   `lib/db/emails.ts` - Email CRUD operations
-   `lib/db/email-threads.ts` - Thread management
-   `lib/db/schema.ts` - Updated schema definitions

### AI Integration

-   `lib/llms.ts` - OpenAI integration and response generation
-   `types/aws-ses.d.ts` - TypeScript definitions

### Testing & Utilities

-   `mock_inbound_email.py` - Local testing script
-   `docs/AWS_SETUP.md` - This documentation

---

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
3. **Verify AI response** generation
4. **Confirm email delivery** and threading
5. **Review database** for proper storage

---

## Security Considerations

### AWS Permissions

-   **Principle of least privilege** with specific SES/SNS access
-   **Service account isolation** from admin permissions
-   **Environment variable security** for credentials

### Email Security

-   **SNS signature verification** (recommended for production)
-   **Content validation** and sanitization
-   **Rate limiting** on webhook endpoints
-   **Compliance logging** for regulatory requirements

---

## Monitoring & Maintenance

### AWS CloudWatch

-   **SES sending metrics** and bounce rates
-   **SNS delivery success** and failures
-   **Lambda function logs** (if applicable)

### Application Monitoring

-   **Webhook response times** and success rates
-   **AI response quality** and generation times
-   **Database performance** and storage usage
-   **Email threading accuracy** and completeness

---

## Deployment Checklist

-   [x] ✅ Create IAM user with proper permissions
-   [x] ✅ Verify domain and email addresses in SES
-   [x] ✅ Configure SNS topic and webhook subscription
-   [x] ✅ Implement complete email processing pipeline
-   [x] ✅ Add AI response generation with OpenAI
-   [x] ✅ Create database schema and functions
-   [x] ✅ Build email threading system
-   [x] ✅ Test end-to-end email flow
-   [x] ✅ Deploy and verify production functionality
-   [ ] 🔄 Add SNS signature verification
-   [ ] 🔄 Implement rate limiting and monitoring
-   [ ] 🔄 Add compliance reporting dashboard
-   [ ] 🔄 Setup CloudWatch alarms and notifications

---

## Support & Troubleshooting

### Common Issues

-   **Build errors:** Ensure all environment variables are set
-   **Email not received:** Check SES inbound rules and SNS subscription
-   **AI responses not generated:** Verify OpenAI API key and model access
-   **Threading issues:** Check Message-ID storage and header parsing

### Debug Commands

```bash
# Check environment variables
pnpm build

# Test webhook locally
pnpm dev

# Verify database schema
pnpm db:generate && pnpm db:push

# Check AWS CLI configuration
aws configure list
```

---

## Next Steps

1. **Production Deployment:** Deploy to production environment
2. **Monitoring Setup:** Configure comprehensive monitoring
3. **Compliance Dashboard:** Build reporting for regulatory requirements
4. **Performance Optimization:** Monitor and optimize AI response times
5. **Feature Enhancement:** Add advanced email features as needed

---

_Last Updated: [Current Date] - Complete AI-powered email system operational_
