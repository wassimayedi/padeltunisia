CREATE TABLE "player_available_clubs" (
	"player_id" uuid NOT NULL,
	"club_id" integer NOT NULL,
	CONSTRAINT "player_available_clubs_player_id_club_id_pk" PRIMARY KEY("player_id","club_id")
);
--> statement-breakpoint
ALTER TABLE "player_available_clubs" ADD CONSTRAINT "player_available_clubs_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_available_clubs" ADD CONSTRAINT "player_available_clubs_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "player_available_clubs_club_idx" ON "player_available_clubs" USING btree ("club_id");