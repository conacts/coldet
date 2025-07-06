import { relations } from "drizzle-orm/relations";
import { debtors, debts, calls, emails, payments, sms } from "./schema";

export const debtsRelations = relations(debts, ({one, many}) => ({
	debtor: one(debtors, {
		fields: [debts.debtorId],
		references: [debtors.id]
	}),
	calls: many(calls),
	emails: many(emails),
	payments: many(payments),
	sms: many(sms),
}));

export const debtorsRelations = relations(debtors, ({many}) => ({
	debts: many(debts),
}));

export const callsRelations = relations(calls, ({one}) => ({
	debt: one(debts, {
		fields: [calls.debtId],
		references: [debts.id]
	}),
}));

export const emailsRelations = relations(emails, ({one}) => ({
	debt: one(debts, {
		fields: [emails.debtId],
		references: [debts.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	debt: one(debts, {
		fields: [payments.debtId],
		references: [debts.id]
	}),
}));

export const smsRelations = relations(sms, ({one}) => ({
	debt: one(debts, {
		fields: [sms.debtId],
		references: [debts.id]
	}),
}));