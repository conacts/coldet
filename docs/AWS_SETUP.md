# AWS Setup Documentation for COLDETS

## IAM User: `coldets_admin`

-   **Purpose:** Dedicated admin user for AWS automation and SES/SNS management.
-   **Permissions:**
    -   AdministratorAccess (or custom policy with SES, SNS, Lambda, S3, CloudWatch, etc.)
-   **Access Keys:** [To be filled in securely]

---

## SES (Simple Email Service) Setup

### 1. Domain Verification

-   **Domain:** `coldets.com`
-   **Status:** Verified
-   **Verification Token:** [Token here]
-   **DNS TXT Record:** \_amazonses.coldets.com

### 2. Email Address Verification

-   **Email:** `contact@coldets.com`
-   **Status:** [Pending/Verified]

### 3. SES Inbound (v2) Setup

-   **Ingress Endpoint:** [Name/ID]
-   **Traffic Policy:** [Name/ID]
-   **Rule Set:** [Name/ID]
-   **Rule:** [Details: recipient, SNS action, etc.]

---

## SNS (Simple Notification Service) Setup

-   **Topic Name:** `ses-inbound-email`
-   **Topic ARN:** arn:aws:sns:us-east-2:722868990407:ses-inbound-email
-   **Subscription Endpoint:** https://coldets.com/api/webhooks/email/received
-   **Subscription Status:** [Confirmed]

---

## Webhook Integration

-   **Endpoint:** `/api/webhooks/email/received`
-   **Receives:** SNS POST notifications for inbound emails
-   **Handler:** [Describe handler location/logic]

---

## Checklist / Plan

-   [x] Create IAM user `coldets_admin` with admin permissions
-   [x] Verify domain `coldets.com` in SES
-   [x] Verify email address `contact@coldets.com` (if needed)
-   [x] Create SNS topic and allow SES to publish
-   [x] Subscribe webhook endpoint to SNS topic
-   [ ] Create SES Inbound v2 resources:
    -   [ ] Ingress Endpoint
    -   [ ] Traffic Policy
    -   [ ] Rule Set (with SNS action)
-   [ ] Test end-to-end email receipt and webhook delivery
-   [ ] Document all resource names/IDs in this file

---

## Notes

-   Update each section with actual resource names/IDs as you create them.
-   Use this doc as a source of truth for AWS setup and onboarding.
