import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import {
	type CreateOrganizationParams,
	createOrganization,
} from '@/lib/db/organizations';
import * as schema from '@/lib/db/schema';
import { type CreateUserParams, createUser } from '@/lib/db/users';

// Create in-memory Postgres database for testing
export async function createTestDb() {
	const client = new PGlite();
	const db = drizzle({ client, schema });

	// Create tables manually with proper Postgres syntax
	// Organizations table first (no dependencies)
	await client.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      settings JSONB,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

	// Users table (no dependencies)
	await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20),
      hashed_password VARCHAR(255),
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      role VARCHAR(50) NOT NULL DEFAULT 'collector',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP
    );
  `);

	// User Organization Memberships table (depends on users and organizations)
	await client.query(`
    CREATE TABLE IF NOT EXISTS user_organization_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      organization_id UUID NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'collector',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      UNIQUE (user_id, organization_id)
    );
  `);

	// Organization Invitations table (depends on organizations and users)
	await client.query(`
    CREATE TABLE IF NOT EXISTS organization_invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      invited_by_user_id UUID NOT NULL,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'collector',
      token VARCHAR(255) UNIQUE NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      used_at TIMESTAMP,
      used_by_user_id UUID,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

	// Collectors table (depends on users and organizations)
	await client.query(`
    CREATE TABLE IF NOT EXISTS collectors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      user_id UUID NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      system_prompt TEXT NOT NULL,
      model VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
      temperature DECIMAL(3,2) DEFAULT 0.7,
      max_tokens INTEGER DEFAULT 1000,
      can_escalate BOOLEAN NOT NULL DEFAULT TRUE,
      can_reply BOOLEAN NOT NULL DEFAULT TRUE,
      config JSONB,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

	// AI Usage Logs table (depends on organizations, users, collectors)
	await client.query(`
    CREATE TABLE IF NOT EXISTS ai_usage_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      user_id UUID NOT NULL,
      collector_id UUID,
      usage_type VARCHAR(50) NOT NULL,
      model VARCHAR(100) NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      cost_cents INTEGER NOT NULL DEFAULT 0,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (collector_id) REFERENCES collectors(id) ON DELETE SET NULL
    );
  `);

	// Debtors table (depends on organizations and users)
	await client.query(`
    CREATE TABLE IF NOT EXISTS debtors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      created_by_user_id UUID NOT NULL,
      visibility VARCHAR(20) NOT NULL DEFAULT 'private',
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
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
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
      organization_id UUID NOT NULL,
      debtor_id UUID NOT NULL,
      collector_id UUID,
      subject VARCHAR(500),
      escalated BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (debtor_id) REFERENCES debtors(id) ON DELETE CASCADE,
      FOREIGN KEY (collector_id) REFERENCES collectors(id) ON DELETE SET NULL
    );
  `);

	await client.query(`
    CREATE TABLE IF NOT EXISTS emails (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      debt_id UUID NOT NULL,
      thread_id UUID NOT NULL,
      collector_id UUID,
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
      escalated BOOLEAN NOT NULL DEFAULT FALSE,
      reply_to VARCHAR(255),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE,
      FOREIGN KEY (thread_id) REFERENCES email_threads(id) ON DELETE SET NULL,
      FOREIGN KEY (collector_id) REFERENCES collectors(id) ON DELETE SET NULL
    );
  `);

	return { db, client };
}

// Helper function to create basic test prerequisites
export async function createTestPrerequisites() {
	// Create test organization
	const organizationParams: CreateOrganizationParams = {
		name: 'Test Organization',
		description: 'Test organization for unit tests',
		active: true,
	};
	const organization = await createOrganization(organizationParams);

	// Create test user
	const userParams: CreateUserParams = {
		firstName: 'Test',
		lastName: 'User',
		email: 'test.user@example.com',
		password: 'password',
		active: true,
		emailVerified: true,
	};
	const user = await createUser(userParams);

	return {
		organizationId: organization.id,
		userId: user.id,
		organization,
		user,
	};
}

// Helper function to clear all tables
export async function clearTables(client: PGlite) {
	// Clear tables in reverse dependency order
	await client.query('DELETE FROM emails');
	await client.query('DELETE FROM email_threads');
	await client.query('DELETE FROM debts');
	await client.query('DELETE FROM debtors');
	await client.query('DELETE FROM ai_usage_logs');
	await client.query('DELETE FROM collectors');
	await client.query('DELETE FROM organization_invitations');
	await client.query('DELETE FROM user_organization_memberships');
	await client.query('DELETE FROM users');
	await client.query('DELETE FROM organizations');
}
