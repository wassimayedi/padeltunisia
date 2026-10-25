CREATE TABLE "news" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"published_on" date NOT NULL,
	"date_approximate" boolean DEFAULT false NOT NULL,
	"scope" "event_scope" NOT NULL,
	"source" text NOT NULL,
	"url" text NOT NULL,
	"image_url" text,
	"club_id" integer,
	"event_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_url_unique" UNIQUE("url")
);
--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "news_published_on_idx" ON "news" USING btree ("published_on");--> statement-breakpoint
CREATE INDEX "news_club_id_idx" ON "news" USING btree ("club_id");--> statement-breakpoint
CREATE INDEX "news_event_id_idx" ON "news" USING btree ("event_id");