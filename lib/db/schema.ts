// Drizzle ORM schema for debt collection platform
// Make sure to install drizzle-orm: pnpm add drizzle-orm

import type { InferSelectModel } from 'drizzle-orm';
import {
	boolean,
	decimal,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';

// Users table - Platform users who collect debts
export const users = pgTable('users', {
	id: uuid('id').primaryKey().notNull().defaultRandom(),
	firstName: varchar('first_name', { length: 100 }).notNull(),
	lastName: varchar('last_name', { length: 100 }).notNull(),
	email: varchar('email', { length: 255 }).unique().notNull(),
	phone: varchar('phone', { length: 20 }),
	hashedPassword: varchar('hashed_password', { length: 255 }),
	emailVerified: boolean('email_verified').notNull().default(false),
	active: boolean('active').notNull().default(true),
	role: varchar('role', { length: 50 }).notNull().default('collector'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
	lastLoginAt: timestamp('last_login_at'),
}, (table) => ({
	emailIdx: uniqueIndex('idx_users_email').on(table.email),
	activeIdx: index('idx_users_active').on(table.active),
}));
export type User = InferSelectModel<typeof users>;
export type PartialUser = Partial<User>;

// Collectors table - AI profiles/agents that handle email threads
export const collectors = pgTable('collectors', {
	id: uuid('id').primaryKey().notNull().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	// AI Profile information
	name: varchar('name', { length: 100 }).notNull(),
	description: text('description'),
	systemPrompt: text('system_prompt').notNull(),
	// LLM Configuration
	model: varchar('model', { length: 100 }).notNull().default('gpt-4o-mini'),
	temperature: decimal('temperature', { precision: 3, scale: 2 }).default('0.7').$type<number>(),
	maxTokens: integer('max_tokens').default(1000),
	// Function capabilities
	canEscalate: boolean('can_escalate').notNull().default(true),
	canReply: boolean('can_reply').notNull().default(true),
	// Additional configuration as JSON
	config: jsonb('config'),
	// Status
	active: boolean('active').notNull().default(true),
	// Timestamps
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
	userIdx: index('idx_collectors_user').on(table.userId),
	activeIdx: index('idx_collectors_active').on(table.active),
	userActiveIdx: index('idx_collectors_user_active').on(table.userId, table.active),
}));
export type Collector = InferSelectModel<typeof collectors>;
export type PartialCollector = Partial<Collector>;

export const debtors = pgTable('debtors', {
	id: uuid('id').primaryKey().notNull().defaultRandom(),
	userId: uuid('user_id')
		.references(() => users.id, { onDelete: 'set null' }),
	firstName: varchar('first_name', { length: 100 }).notNull(),
	lastName: varchar('last_name', { length: 100 }).notNull(),
	email: varchar('email', { length: 255 }).unique(),
	phone: varchar('phone', { length: 20 }),
	addressLine1: varchar('address_line1', { length: 255 }),
	addressLine2: varchar('address_line2', { length: 255 }),
	city: varchar('city', { length: 100 }),
	state: varchar('state', { length: 2 }),
	zipCode: varchar('zip_code', { length: 10 }),
	phoneConsent: boolean('phone_consent').notNull().default(false),
	emailConsent: boolean('email_consent').notNull().default(true),
	dncRegistered: boolean('dnc_registered').notNull().default(false),
	currentlyCollecting: boolean('currently_collecting').notNull().default(false),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
	userIdx: index('idx_debtors_user').on(table.userId),
	emailIdx: uniqueIndex('idx_debtors_email').on(table.email),
}));
export type Debtor = InferSelectModel<typeof debtors>;
export type PartialDebtor = Partial<Debtor>;

export const debts = pgTable(
	'debts',
	{
		id: uuid('id').primaryKey().notNull().defaultRandom(),
		debtorId: uuid('debtor_id')
			.notNull()
			.references(() => debtors.id, { onDelete: 'cascade' }),
		originalCreditor: varchar('original_creditor', { length: 200 }).notNull(),
		totalOwed: decimal('total_owed', { precision: 10, scale: 2 })
			.notNull()
			.default('0')
			.$type<number>(),
		amountPaid: decimal('amount_paid', { precision: 10, scale: 2 })
			.notNull()
			.default('0')
			.$type<number>(),
		status: varchar('status', { length: 20 }).notNull().default('active'),
		debtDate: timestamp('debt_date'),
		createdAt: timestamp('created_at').defaultNow(),
		updatedAt: timestamp('updated_at').defaultNow(),
	},
	(table) => ({
		debtorStatusIdx: uniqueIndex('idx_debts_debtor_status').on(
			table.debtorId,
			table.status
		),
	})
);
export type Debt = InferSelectModel<typeof debts>;
export type PartialDebt = Partial<Debt>;

export const emails = pgTable(
	'emails',
	{
		id: uuid('id').primaryKey().notNull().defaultRandom(),
		debtId: uuid('debt_id')
			.notNull()
			.references(() => debts.id, { onDelete: 'cascade' }),
		threadId: uuid('thread_id').references(() => emailThreads.id, { onDelete: 'set null' }).notNull(),
		collectorId: uuid('collector_id')
			.references(() => collectors.id, { onDelete: 'set null' }),
		fromEmailAddress: varchar('from_email_address', { length: 255 }).notNull(),
		messageId: varchar('message_id', { length: 255 }).unique().notNull(),
		direction: varchar('direction', {
			enum: ['inbound', 'outbound'],
		}).notNull(),
		subject: varchar('subject', { length: 500 }),
		content: text('content'),
		emailOpened: boolean('email_opened').notNull().default(false),
		emailClicked: boolean('email_clicked').notNull().default(false),
		emailBounced: boolean('email_bounced').notNull().default(false),
		emailComplained: boolean('email_complained').notNull().default(false),
		aiGenerated: boolean('ai_generated').notNull().default(false),
		complianceChecked: boolean('compliance_checked').notNull().default(true),
		escalated: boolean('escalated').notNull().default(false),
		// NOTE: this should a messageId, maybe we index it/force this to be unique or something
		// NOTE: this works for now
		replyTo: varchar('reply_to', { length: 255 }),
		timestamp: timestamp('timestamp').defaultNow(),
		createdAt: timestamp('created_at').defaultNow(),
	},
	(table) => ({
		debtIdx: index('idx_emails_debt').on(table.debtId),
		timestampIdx: index('idx_emails_timestamp').on(table.timestamp),
		threadTimestampIdx: index('idx_emails_thread_timestamp').on(table.threadId, table.timestamp),
		collectorIdx: index('idx_emails_collector').on(table.collectorId),
		escalatedIdx: index('idx_emails_escalated').on(table.escalated),
		messageIdIdx: uniqueIndex('idx_emails_message_id').on(table.messageId),
	})
);
export type Email = InferSelectModel<typeof emails>;
export type PartialEmail = Partial<Email>;

export const emailThreads = pgTable(
	'email_threads',
	{
		id: uuid('id').primaryKey().notNull().defaultRandom(),
		debtorId: uuid('debtor_id')
			.notNull()
			.references(() => debtors.id, { onDelete: 'cascade' }),
		collectorId: uuid('collector_id')
			.references(() => collectors.id, { onDelete: 'set null' }),
		subject: varchar('subject', { length: 500 }),
		escalated: boolean('escalated').notNull().default(false),
		createdAt: timestamp('created_at').defaultNow(),
		updatedAt: timestamp('updated_at').defaultNow(),
	},
	(table) => ({
		debtorIdx: index('idx_email_threads_debtor').on(table.debtorId),
		collectorIdx: index('idx_email_threads_collector').on(table.collectorId),
		escalatedIdx: index('idx_email_threads_escalated').on(table.escalated),
	})
);
export type EmailThread = InferSelectModel<typeof emailThreads>;
export type PartialEmailThread = Partial<EmailThread>;

export const calls = pgTable(
	'calls',
	{
		id: uuid('id').primaryKey().notNull().defaultRandom(),
		debtId: uuid('debt_id')
			.notNull()
			.references(() => debts.id, { onDelete: 'cascade' }),
		direction: varchar('direction', {
			enum: ['inbound', 'outbound'],
		}).notNull(),
		callDuration: integer('call_duration'),
		callOutcome: varchar('call_outcome', { length: 50 }),
		transcript: text('transcript'),
		recordingUrl: varchar('recording_url', { length: 500 }),
		aiGenerated: boolean('ai_generated').notNull().default(false),
		complianceChecked: boolean('compliance_checked').notNull().default(true),
		timestamp: timestamp('timestamp').defaultNow(),
		createdAt: timestamp('created_at').defaultNow(),
	},
	(table) => ({
		debtIdx: uniqueIndex('idx_calls_debt').on(table.debtId),
		timestampIdx: uniqueIndex('idx_calls_timestamp').on(table.timestamp),
	})
);
export type Call = InferSelectModel<typeof calls>;
export type PartialCall = Partial<Call>;

// SMS
export const sms = pgTable(
	'sms',
	{
		id: uuid('id').primaryKey().notNull().defaultRandom(),
		debtId: uuid('debt_id')
			.notNull()
			.references(() => debts.id, { onDelete: 'cascade' }),
		direction: varchar('direction', {
			enum: ['inbound', 'outbound'],
		}).notNull(),
		content: text('content'),
		aiGenerated: boolean('ai_generated').notNull().default(false),
		complianceChecked: boolean('compliance_checked').notNull().default(true),
		timestamp: timestamp('timestamp').defaultNow(),
		createdAt: timestamp('created_at').defaultNow(),
	},
	(table) => ({
		debtIdx: uniqueIndex('idx_sms_debt').on(table.debtId),
		timestampIdx: uniqueIndex('idx_sms_timestamp').on(table.timestamp),
	})
);
export type SMS = InferSelectModel<typeof sms>;
export type PartialSMS = Partial<SMS>;

export const payments = pgTable(
	'payments',
	{
		id: uuid('id').primaryKey().notNull().defaultRandom(),
		debtId: uuid('debt_id')
			.notNull()
			.references(() => debts.id, { onDelete: 'cascade' }),
		// NOTE: could be string to prevent floating point precision issues, but I like using a number
		amount: decimal('amount', { precision: 10, scale: 2 }).notNull().$type<number>(),
		paymentType: varchar('payment_type', { length: 20 }),
		stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 100 }),
		stripeSessionId: varchar('stripe_session_id', { length: 100 }),
		paymentMethod: varchar('payment_method', { length: 50 }),
		status: varchar('status', { length: 20 }).notNull().default('pending'),
		createdAt: timestamp('created_at').defaultNow(),
		completedAt: timestamp('completed_at'),
	},
	(table) => ({
		debtIdx: uniqueIndex('idx_payments_debt').on(table.debtId),
		statusIdx: uniqueIndex('idx_payments_status').on(table.status),
		stripeIdx: uniqueIndex('idx_payments_stripe').on(
			table.stripePaymentIntentId
		),
	})
);
export type Payment = InferSelectModel<typeof payments>;
export type PartialPayment = Partial<Payment>;
