# Database Schema

## Schema Overview

## Entity Relationships

## Core Tables

### Debtors
Primary debtor information and tracking
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
    
    -- Tracking fields
    unique_token VARCHAR(50) UNIQUE NOT NULL, -- For personalized URLs
    total_owed DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, resolved, dispute, etc.
    
    -- Consent and compliance
    phone_consent BOOLEAN DEFAULT false,
    email_consent BOOLEAN DEFAULT true,
    dnc_registered BOOLEAN DEFAULT false,
    
    -- Engagement tracking
    last_contact_date TIMESTAMP,
    last_response_date TIMESTAMP,
    total_contacts INTEGER DEFAULT 0,
    payment_propensity_score INTEGER DEFAULT 0, -- 0-100
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Communications
Track all interactions (email, phone, SMS)
```sql
CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debtor_id UUID NOT NULL REFERENCES debtors(id),
    
    type VARCHAR(20) NOT NULL, -- 'email', 'phone', 'sms'
    direction VARCHAR(10) NOT NULL, -- 'inbound', 'outbound'
    
    -- Content
    subject VARCHAR(500), -- For emails
    content TEXT,
    
    -- Phone specific
    call_duration INTEGER, -- seconds
    call_outcome VARCHAR(50), -- 'answered', 'voicemail', 'busy', 'no_answer'
    
    -- Email specific  
    email_opened BOOLEAN DEFAULT false,
    email_clicked BOOLEAN DEFAULT false,
    
    -- Metadata
    timestamp TIMESTAMP DEFAULT NOW(),
    ai_generated BOOLEAN DEFAULT false,
    compliance_checked BOOLEAN DEFAULT true,
    
    -- Follow-up
    requires_followup BOOLEAN DEFAULT false,
    followup_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Payments
Track payment attempts and successes
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debtor_id UUID NOT NULL REFERENCES debtors(id),
    
    amount DECIMAL(10,2) NOT NULL,
    payment_type VARCHAR(20), -- 'full', 'partial', 'plan'
    
    -- Stripe integration
    stripe_payment_intent_id VARCHAR(100),
    stripe_session_id VARCHAR(100),
    payment_method VARCHAR(50), -- 'card', 'bank', 'apple_pay', etc.
    
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    
    -- Metadata
    payment_page_visits INTEGER DEFAULT 0,
    payment_link_clicks INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

### Page_Views
Track debtor engagement with personalized pages
```sql
CREATE TABLE page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debtor_id UUID NOT NULL REFERENCES debtors(id),
    
    page_type VARCHAR(20) NOT NULL, -- 'landing', 'payment', 'info'
    user_agent TEXT,
    ip_address INET,
    
    -- Engagement metrics
    time_on_page INTEGER, -- seconds
    actions_taken JSONB, -- buttons clicked, forms filled, etc.
    
    timestamp TIMESTAMP DEFAULT NOW()
);
```

## Indexes for Performance
```sql
-- Core lookup indexes
CREATE INDEX idx_debtors_token ON debtors(unique_token);
CREATE INDEX idx_debtors_email ON debtors(email);
CREATE INDEX idx_debtors_phone ON debtors(phone);
CREATE INDEX idx_debtors_status ON debtors(status);

-- Communication tracking
CREATE INDEX idx_communications_debtor ON communications(debtor_id);
CREATE INDEX idx_communications_timestamp ON communications(timestamp);
CREATE INDEX idx_communications_type ON communications(type, direction);

-- Payment tracking  
CREATE INDEX idx_payments_debtor ON payments(debtor_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_stripe ON payments(stripe_payment_intent_id);

-- Page view analytics
CREATE INDEX idx_page_views_debtor ON page_views(debtor_id);
CREATE INDEX idx_page_views_timestamp ON page_views(timestamp);
```

## Key Features

### 1. Unique Debtor Tracking
- Each debtor gets a unique token for personalized URLs
- All interactions tied to debtor record
- Real-time engagement scoring

### 2. Communication History
- Complete audit trail of all contacts
- AI vs human generated content tracking
- Compliance verification for each interaction

### 3. Payment Tracking
- Stripe integration with full payment lifecycle
- Track page visits before payment conversion
- Multiple payment option support

### 4. Engagement Analytics
- Page view tracking with time spent
- Click and interaction monitoring
- Behavioral scoring for payment propensity

## Data Relationships
- One debtor → Many communications
- One debtor → Many payments  
- One debtor → Many page views
- All tables linked via debtor_id for complete tracking

## Indexes

## Constraints

## Data Types

## Migration Strategy

## Backup Procedures

## Performance Optimization

## Data Retention Policies

## Archive Strategy
