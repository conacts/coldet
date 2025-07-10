import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

// Create in-memory Postgres database for testing
export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle({ client, schema });
  
  // Create tables manually with proper Postgres syntax
  await client.query(`
    CREATE TABLE IF NOT EXISTS debtors (
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
      phone_consent BOOLEAN NOT NULL DEFAULT FALSE,
      email_consent BOOLEAN NOT NULL DEFAULT TRUE,
      dnc_registered BOOLEAN NOT NULL DEFAULT FALSE,
      currently_collecting BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS debts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      debtor_id UUID NOT NULL,
      original_creditor VARCHAR(200) NOT NULL,
      total_owed DECIMAL(10,2) NOT NULL DEFAULT 0,
      amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      debt_date TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (debtor_id) REFERENCES debtors(id) ON DELETE CASCADE
    );
  `);
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS email_threads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      debtor_id UUID NOT NULL,
      subject VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (debtor_id) REFERENCES debtors(id) ON DELETE CASCADE
    );
  `);
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS emails (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      debt_id UUID NOT NULL,
      thread_id UUID NOT NULL,
      from_email_address VARCHAR(255) NOT NULL,
      message_id VARCHAR(255) UNIQUE NOT NULL,
      direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
      subject VARCHAR(500),
      content TEXT,
      email_opened BOOLEAN NOT NULL DEFAULT FALSE,
      email_clicked BOOLEAN NOT NULL DEFAULT FALSE,
      email_bounced BOOLEAN NOT NULL DEFAULT FALSE,
      email_complained BOOLEAN NOT NULL DEFAULT FALSE,
      ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
      compliance_checked BOOLEAN NOT NULL DEFAULT TRUE,
      reply_to VARCHAR(255),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE,
      FOREIGN KEY (thread_id) REFERENCES email_threads(id) ON DELETE SET NULL
    );
  `);
  
  return { db, client };
}

// Helper function to clear all tables
export async function clearTables(client: PGlite) {
  await client.query('DELETE FROM emails');
  await client.query('DELETE FROM email_threads');
  await client.query('DELETE FROM debts');
  await client.query('DELETE FROM debtors');
}