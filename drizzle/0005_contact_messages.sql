CREATE TYPE "public"."contact_status" AS ENUM('new', 'read', 'done');--> statement-breakpoint
CREATE TYPE "public"."contact_topic" AS ENUM('club', 'tournoi', 'partenariat', 'autre');--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic" "contact_topic" NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"organization" text,
	"message" text NOT NULL,
	"status" "contact_status" DEFAULT 'new' NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "contact_messages_status_idx" ON "contact_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "contact_messages_ip_hash_idx" ON "contact_messages" USING btree ("ip_hash","created_at");