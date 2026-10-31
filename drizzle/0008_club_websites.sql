-- Booking sites for clubs already present (the seed skips them).
-- The clubs' own PadUp sites; Padel Oceana has none, so its PadUp page.
UPDATE "clubs" SET "website" = 'https://bardopadelclub.com/' WHERE "slug" = 'bardo-padel-club';--> statement-breakpoint
UPDATE "clubs" SET "website" = 'https://padup.net/establishment/search/detail?clubName=PADEL%20OCEANA&clubId=395450' WHERE "slug" = 'padel-oceana';--> statement-breakpoint
UPDATE "clubs" SET "website" = 'https://padel.sassistadium.com/' WHERE "slug" = 'sassi-padel-sassi-stadium';--> statement-breakpoint
UPDATE "clubs" SET "website" = 'https://padeliummarhaba.tn/' WHERE "slug" = 'padelium-marhaba';
