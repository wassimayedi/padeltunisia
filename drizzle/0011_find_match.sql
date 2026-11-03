CREATE TYPE "public"."match_gender" AS ENUM('male', 'female', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."match_player_status" AS ENUM('pending', 'accepted', 'rejected', 'left', 'removed');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('open', 'full', 'cancelled', 'played');--> statement-breakpoint
CREATE TYPE "public"."player_gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TABLE "match_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"status" "match_player_status" DEFAULT 'pending' NOT NULL,
	"level_at_join" integer NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"club_id" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"gender" "match_gender" NOT NULL,
	"level_min" integer NOT NULL,
	"level_max" integer NOT NULL,
	"spots" integer NOT NULL,
	"status" "match_status" DEFAULT 'open' NOT NULL,
	"court_booked" boolean DEFAULT false NOT NULL,
	"note" text,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_time_check" CHECK ("matches"."ends_at" > "matches"."starts_at"),
	CONSTRAINT "matches_level_check" CHECK ("matches"."level_min" between 1 and 8 and "matches"."level_max" between 1 and 8 and "matches"."level_min" <= "matches"."level_max"),
	CONSTRAINT "matches_spots_check" CHECK ("matches"."spots" between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"match_id" uuid,
	"type" text NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"email" text,
	"name" text NOT NULL,
	"avatar_url" text,
	"phone" text,
	"phone_country_code" text DEFAULT '216' NOT NULL,
	"gender" "player_gender",
	"level" integer,
	"region" text,
	"city" text,
	"profile_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "players_level_check" CHECK ("players"."level" between 1 and 8)
);
--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_creator_id_players_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "match_players_match_player_idx" ON "match_players" USING btree ("match_id","player_id");--> statement-breakpoint
CREATE INDEX "match_players_player_idx" ON "match_players" USING btree ("player_id","status");--> statement-breakpoint
CREATE INDEX "matches_status_starts_at_idx" ON "matches" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "matches_club_id_idx" ON "matches" USING btree ("club_id","starts_at");--> statement-breakpoint
CREATE INDEX "matches_creator_id_idx" ON "matches" USING btree ("creator_id","starts_at");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "notifications_player_idx" ON "notifications" USING btree ("player_id","created_at");