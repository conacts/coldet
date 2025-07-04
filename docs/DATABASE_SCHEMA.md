# Database Schema

## Schema Overview

## Entity Relationships

## Core Tables

### Debtors
Primary debtor contact information
```sql
CREATE TABLE debtors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    
    -- Consent and compliance
    phone_consent BOOLEAN DEFAULT false,
    email_consent BOOLEAN DEFAULT true,
    dnc_registered BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Debts
Individual debt accounts with tracking
```sql
CREATE TABLE debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debtor_id UUID NOT NULL REFERENCES debtors(id),
    
    -- Debt details
    original_creditor VARCHAR(200) NOT NULL,
    total_owed DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, resolved, dispute, etc.
    
    -- Tracking
    unique_token VARCHAR(50) UNIQUE NOT NULL, -- For personalized URLs
    total_contacts INTEGER DEFAULT 0,
    
    -- Dates
    debt_date DATE,
    imported_at TIMESTAMP DEFAULT NOW(),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Emails
Track email communications
```sql
CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id UUID NOT NULL REFERENCES debts(id),
    
    direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound'
    subject VARCHAR(500),
    content TEXT,
    
    -- Tracking
    email_opened BOOLEAN DEFAULT false,
    email_clicked BOOLEAN DEFAULT false,
    
    -- Metadata
    ai_generated BOOLEAN DEFAULT false,
    compliance_checked BOOLEAN DEFAULT true,
    
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Calls
Track phone call communications
```sql
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id UUID NOT NULL REFERENCES debts(id),
    
    direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound'
    call_duration INTEGER, -- seconds
    call_outcome VARCHAR(50), -- 'answered', 'voicemail', 'busy', 'no_answer'
    
    -- Call content
    transcript TEXT,
    recording_url VARCHAR(500),
    
    -- Metadata
    ai_generated BOOLEAN DEFAULT false,
    compliance_checked BOOLEAN DEFAULT true,
    
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### SMS
Track SMS communications
```sql
CREATE TABLE sms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id UUID NOT NULL REFERENCES debts(id),
    
    direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound'
    content TEXT,
    
    -- Metadata
    ai_generated BOOLEAN DEFAULT false,
    compliance_checked BOOLEAN DEFAULT true,
    
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Payments
Track payment attempts and successes
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id UUID NOT NULL REFERENCES debts(id),
    
    amount DECIMAL(10,2) NOT NULL,
    payment_type VARCHAR(20), -- 'full', 'partial', 'plan'
    
    -- Stripe integration
    stripe_payment_intent_id VARCHAR(100),
    stripe_session_id VARCHAR(100),
    payment_method VARCHAR(50), -- 'card', 'bank', 'apple_pay', etc.
    
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

## Indexes for Performance
```sql
-- Core lookup indexes
CREATE INDEX idx_debtors_email ON debtors(email);
CREATE INDEX idx_debtors_phone ON debtors(phone);

-- Debt tracking
CREATE INDEX idx_debts_token ON debts(unique_token);
CREATE INDEX idx_debts_debtor ON debts(debtor_id);
CREATE INDEX idx_debts_status ON debts(status);

-- Communication tracking
CREATE INDEX idx_emails_debt ON emails(debt_id);
CREATE INDEX idx_emails_timestamp ON emails(timestamp);
CREATE INDEX idx_calls_debt ON calls(debt_id);
CREATE INDEX idx_calls_timestamp ON calls(timestamp);
CREATE INDEX idx_sms_debt ON sms(debt_id);
CREATE INDEX idx_sms_timestamp ON sms(timestamp);

-- Payment tracking  
CREATE INDEX idx_payments_debt ON payments(debt_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_stripe ON payments(stripe_payment_intent_id);
```

## Key Features

### 1. Debt-Centric Tracking
- Each debt gets a unique token for personalized URLs
- All interactions tied to specific debt record
- Debtor contact info separated from debt details

### 2. Communication History
- Separate tables for emails, calls, and SMS
- Complete audit trail of all contacts
- AI vs human generated content tracking
- Compliance verification for each interaction

### 3. Payment Tracking
- Stripe integration with full payment lifecycle
- Multiple payment option support
- Payment status tracking

## Data Relationships
- One debtor → Many debts
- One debt → Many emails/calls/SMS
- One debt → Many payments
- All tables linked via debt_id for complete tracking

## Indexes

## Constraints

## Data Types

## Migration Strategy

## Backup Procedures

## Performance Optimization

## Data Retention Policies

## Archive Strategy
