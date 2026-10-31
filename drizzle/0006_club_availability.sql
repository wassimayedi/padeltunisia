ALTER TABLE "clubs" ADD COLUMN "availability_url" text;--> statement-breakpoint
-- The seed skips clubs already present, so existing databases get Padel Marsa's planning here.
UPDATE "clubs" SET "availability_url" = 'https://ballejaune.com/plannings-integrated?widget=1&id=1502&key=289a37390beb5e1950895c4cddc341f43c16a30b34af4a746f97ea970e978011cd09f503a1bfcd53' WHERE "slug" = 'padel-marsa';
