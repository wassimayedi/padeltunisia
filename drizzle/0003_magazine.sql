CREATE TABLE "magazine" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"image_url" text,
	"image_alt" text,
	"meta_title" text,
	"meta_description" text,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "magazine_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "magazine_published_on_idx" ON "magazine" USING btree ("published_on");