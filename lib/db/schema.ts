// Drizzle ORM schema for debt collection platform
// Make sure to install drizzle-orm: pnpm add drizzle-orm

import type { InferSelectModel } from 'drizzle-orm';
import {
	boolean,
	decimal,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';

export const debtors = pgTable('debtors', {
	id: uuid('id').primaryKey().notNull().defaultRandom(),
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
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
});
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
			.default('0'),
		amountPaid: decimal('amount_paid', { precision: 10, scale: 2 })
			.notNull()
			.default('0'),
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
		messageId: varchar('message_id', { length: 255 }).unique().notNull(),
		direction: varchar('direction', {
			enum: ['inbound', 'outbound'],
		}).notNull(),
		subject: varchar('subject', { length: 500 }),
		content: text('content'),
		emailOpened: boolean('email_opened').notNull().default(false),
		emailClicked: boolean('email_clicked').notNull().default(false),
		aiGenerated: boolean('ai_generated').notNull().default(false),
		complianceChecked: boolean('compliance_checked').notNull().default(true),
		timestamp: timestamp('timestamp').defaultNow(),
		createdAt: timestamp('created_at').defaultNow(),
	},
	(table) => ({
		debtIdx: uniqueIndex('idx_emails_debt').on(table.debtId),
		timestampIdx: uniqueIndex('idx_emails_timestamp').on(table.timestamp),
		threadTimestampIdx: uniqueIndex('idx_emails_thread_timestamp').on(table.threadId, table.timestamp),
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
		subject: varchar('subject', { length: 500 }),
		createdAt: timestamp('created_at').defaultNow(),
		updatedAt: timestamp('updated_at').defaultNow(),
	},
	(table) => ({
		debtorIdx: uniqueIndex('idx_email_threads_debtor').on(table.debtorId),
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
		amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
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
