ALTER TABLE "events" ADD COLUMN "registration_url" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "registration_deadline" date;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "draw_date" date;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "entry_fee" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "draws" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "tournament_director" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "referee" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "official_ball" text;