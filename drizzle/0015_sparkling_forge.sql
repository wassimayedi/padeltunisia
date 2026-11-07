CREATE TABLE "social_promos" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"promo_key" text NOT NULL,
	"facebook_post_id" text,
	"instagram_post_id" text,
	"facebook_story_id" text,
	"instagram_story_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "social_promos_day_unique" UNIQUE("day")
);
--> statement-breakpoint
CREATE INDEX "social_promos_promo_key_idx" ON "social_promos" USING btree ("promo_key","day");