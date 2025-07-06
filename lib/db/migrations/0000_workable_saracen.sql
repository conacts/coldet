CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"direction" varchar NOT NULL,
	"call_duration" integer,
	"call_outcome" varchar(50),
	"transcript" text,
	"recording_url" varchar(500),
	"ai_generated" boolean DEFAULT false NOT NULL,
	"compliance_checked" boolean DEFAULT true NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "debtors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"address_line1" varchar(255),
	"address_line2" varchar(255),
	"city" varchar(100),
	"state" varchar(2),
	"zip_code" varchar(10),
	"phone_consent" boolean DEFAULT false NOT NULL,
	"email_consent" boolean DEFAULT true NOT NULL,
	"dnc_registered" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "debtors_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debtor_id" uuid NOT NULL,
	"original_creditor" varchar(200) NOT NULL,
	"total_owed" numeric(10, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"unique_token" varchar(50) NOT NULL,
	"total_contacts" integer DEFAULT 0 NOT NULL,
	"debt_date" timestamp,
	"imported_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "debts_unique_token_unique" UNIQUE("unique_token")
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"direction" varchar NOT NULL,
	"subject" varchar(500),
	"content" text,
	"email_opened" boolean DEFAULT false NOT NULL,
	"email_clicked" boolean DEFAULT false NOT NULL,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"compliance_checked" boolean DEFAULT true NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_type" varchar(20),
	"stripe_payment_intent_id" varchar(100),
	"stripe_session_id" varchar(100),
	"payment_method" varchar(50),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"direction" varchar NOT NULL,
	"content" text,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"compliance_checked" boolean DEFAULT true NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_debtor_id_debtors_id_fk" FOREIGN KEY ("debtor_id") REFERENCES "public"."debtors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms" ADD CONSTRAINT "sms_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_calls_debt" ON "calls" USING btree ("debt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_calls_timestamp" ON "calls" USING btree ("timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_debts_token" ON "debts" USING btree ("unique_token");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_debts_debtor_status" ON "debts" USING btree ("debtor_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_emails_debt" ON "emails" USING btree ("debt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_emails_timestamp" ON "emails" USING btree ("timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payments_debt" ON "payments" USING btree ("debt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payments_stripe" ON "payments" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sms_debt" ON "sms" USING btree ("debt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sms_timestamp" ON "sms" USING btree ("timestamp");