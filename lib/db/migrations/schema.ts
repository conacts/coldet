import {
	boolean,
	foreignKey,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

export const debts = pgTable(
	'debts',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		debtorId: uuid('debtor_id').notNull(),
		originalCreditor: varchar('original_creditor', { length: 200 }).notNull(),
		totalOwed: numeric('total_owed', { precision: 10, scale: 2 })
			.default('0')
			.notNull(),
		amountPaid: numeric('amount_paid', { precision: 10, scale: 2 })
			.default('0')
			.notNull(),
		status: varchar({ length: 20 }).default('active').notNull(),
		totalContacts: integer('total_contacts').default(0).notNull(),
		debtDate: timestamp('debt_date', { mode: 'string' }),
		importedAt: timestamp('imported_at', { mode: 'string' }).defaultNow(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
	},
	(table) => [
		uniqueIndex('idx_debts_debtor_status').using(
			'btree',
			table.debtorId.asc().nullsLast().op('text_ops'),
			table.status.asc().nullsLast().op('uuid_ops')
		),
		foreignKey({
			columns: [table.debtorId],
			foreignColumns: [debtors.id],
			name: 'debts_debtor_id_debtors_id_fk',
		}).onDelete('cascade'),
	]
);

export const calls = pgTable(
	'calls',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		debtId: uuid('debt_id').notNull(),
		direction: varchar().notNull(),
		callDuration: integer('call_duration'),
		callOutcome: varchar('call_outcome', { length: 50 }),
		transcript: text(),
		recordingUrl: varchar('recording_url', { length: 500 }),
		aiGenerated: boolean('ai_generated').default(false).notNull(),
		complianceChecked: boolean('compliance_checked').default(true).notNull(),
		timestamp: timestamp({ mode: 'string' }).defaultNow(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
	},
	(table) => [
		uniqueIndex('idx_calls_debt').using(
			'btree',
			table.debtId.asc().nullsLast().op('uuid_ops')
		),
		uniqueIndex('idx_calls_timestamp').using(
			'btree',
			table.timestamp.asc().nullsLast().op('timestamp_ops')
		),
		foreignKey({
			columns: [table.debtId],
			foreignColumns: [debts.id],
			name: 'calls_debt_id_debts_id_fk',
		}).onDelete('cascade'),
	]
);

export const debtors = pgTable(
	'debtors',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		firstName: varchar('first_name', { length: 100 }).notNull(),
		lastName: varchar('last_name', { length: 100 }).notNull(),
		email: varchar({ length: 255 }),
		phone: varchar({ length: 20 }),
		addressLine1: varchar('address_line1', { length: 255 }),
		addressLine2: varchar('address_line2', { length: 255 }),
		city: varchar({ length: 100 }),
		state: varchar({ length: 2 }),
		zipCode: varchar('zip_code', { length: 10 }),
		phoneConsent: boolean('phone_consent').default(false).notNull(),
		emailConsent: boolean('email_consent').default(true).notNull(),
		dncRegistered: boolean('dnc_registered').default(false).notNull(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
	},
	(table) => [uniqueIndex('debtors_email_unique').on(table.email)]
);

export const emails = pgTable(
	'emails',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		debtId: uuid('debt_id').notNull(),
		direction: varchar().notNull(),
		subject: varchar({ length: 500 }),
		content: text(),
		emailOpened: boolean('email_opened').default(false).notNull(),
		emailClicked: boolean('email_clicked').default(false).notNull(),
		aiGenerated: boolean('ai_generated').default(false).notNull(),
		complianceChecked: boolean('compliance_checked').default(true).notNull(),
		timestamp: timestamp({ mode: 'string' }).defaultNow(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
	},
	(table) => [
		uniqueIndex('idx_emails_debt').using(
			'btree',
			table.debtId.asc().nullsLast().op('uuid_ops')
		),
		uniqueIndex('idx_emails_timestamp').using(
			'btree',
			table.timestamp.asc().nullsLast().op('timestamp_ops')
		),
		foreignKey({
			columns: [table.debtId],
			foreignColumns: [debts.id],
			name: 'emails_debt_id_debts_id_fk',
		}).onDelete('cascade'),
	]
);

export const payments = pgTable(
	'payments',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		debtId: uuid('debt_id').notNull(),
		amount: numeric({ precision: 10, scale: 2 }).notNull(),
		paymentType: varchar('payment_type', { length: 20 }),
		stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 100 }),
		stripeSessionId: varchar('stripe_session_id', { length: 100 }),
		paymentMethod: varchar('payment_method', { length: 50 }),
		status: varchar({ length: 20 }).default('pending').notNull(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
		completedAt: timestamp('completed_at', { mode: 'string' }),
	},
	(table) => [
		uniqueIndex('idx_payments_debt').using(
			'btree',
			table.debtId.asc().nullsLast().op('uuid_ops')
		),
		uniqueIndex('idx_payments_status').using(
			'btree',
			table.status.asc().nullsLast().op('text_ops')
		),
		uniqueIndex('idx_payments_stripe').using(
			'btree',
			table.stripePaymentIntentId.asc().nullsLast().op('text_ops')
		),
		foreignKey({
			columns: [table.debtId],
			foreignColumns: [debts.id],
			name: 'payments_debt_id_debts_id_fk',
		}).onDelete('cascade'),
	]
);

export const sms = pgTable(
	'sms',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		debtId: uuid('debt_id').notNull(),
		direction: varchar().notNull(),
		content: text(),
		aiGenerated: boolean('ai_generated').default(false).notNull(),
		complianceChecked: boolean('compliance_checked').default(true).notNull(),
		timestamp: timestamp({ mode: 'string' }).defaultNow(),
		createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
	},
	(table) => [
		uniqueIndex('idx_sms_debt').using(
			'btree',
			table.debtId.asc().nullsLast().op('uuid_ops')
		),
		uniqueIndex('idx_sms_timestamp').using(
			'btree',
			table.timestamp.asc().nullsLast().op('timestamp_ops')
		),
		foreignKey({
			columns: [table.debtId],
			foreignColumns: [debts.id],
			name: 'sms_debt_id_debts_id_fk',
		}).onDelete('cascade'),
	]
);
