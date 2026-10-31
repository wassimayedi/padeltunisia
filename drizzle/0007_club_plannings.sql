-- Plannings linked after 0006 was applied (clubs already present are skipped by the seed).
-- PadUp clubs are read by their padup.net club id.
UPDATE "clubs" SET "availability_url" = 'https://padup.net/?clubId=7636456', "logo_url" = '/clubs/king-padel-city.webp' WHERE "slug" = 'king-padel-city';--> statement-breakpoint
UPDATE "clubs" SET "availability_url" = 'https://padup.net/?clubId=396500' WHERE "slug" = 'el-rulo-padel-club';--> statement-breakpoint
UPDATE "clubs" SET "availability_url" = 'https://padup.net/?clubId=395550' WHERE "slug" = 'kantaoui-padel';--> statement-breakpoint
UPDATE "clubs" SET "availability_url" = 'https://padup.net/?clubId=394900' WHERE "slug" = 'padelium-marhaba';--> statement-breakpoint
UPDATE "clubs" SET "availability_url" = 'https://padup.net/?clubId=396750' WHERE "slug" = 'sassi-padel-sassi-stadium';
