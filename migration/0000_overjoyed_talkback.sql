CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"telegram_id" integer NOT NULL,
	"first_name" text NOT NULL,
	"second_name" text,
	"nickname" text,
	"created_at" date DEFAULT now() NOT NULL,
	"updated_at" date DEFAULT now() NOT NULL,
	"in_whitelist" boolean DEFAULT false NOT NULL,
	"yclients_user_token" text,
	"yclients_user_id" integer,
	"yclients_phone" text,
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id")
);
