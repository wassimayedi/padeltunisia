ALTER TABLE "players" ADD COLUMN "available_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "available_anonymous" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "players_available_until_idx" ON "players" USING btree ("available_until");