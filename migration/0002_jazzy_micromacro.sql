CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "company_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "company_name" text NOT NULL;