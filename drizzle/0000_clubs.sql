CREATE TYPE "public"."court_type" AS ENUM('indoor', 'outdoor', 'covered');--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"region" text NOT NULL,
	"city" text NOT NULL,
	"area" text,
	"address" text NOT NULL,
	"courts" integer,
	"court_types" "court_type"[] DEFAULT '{}' NOT NULL,
	"phones" text[] DEFAULT '{}' NOT NULL,
	"website" text,
	"facebook" text,
	"instagram" text,
	"opening_hours" text,
	"logo_url" text,
	"source_url" text,
	"description" text,
	"amenities" text[] DEFAULT '{}' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clubs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "clubs_city_idx" ON "clubs" USING btree ("city");--> statement-breakpoint
CREATE INDEX "clubs_region_idx" ON "clubs" USING btree ("region");