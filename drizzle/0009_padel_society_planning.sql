-- Padel Society is already present (the seed skips it); read with PADEL_SOCIETY_PHONE.
UPDATE "clubs" SET "availability_url" = 'https://www.clubpadelsociety.com/api/agenda-slots' WHERE "slug" = 'padel-society';
