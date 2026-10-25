// Server function behind the /contact form (see functions/clubs.ts for the pattern).
import { createServerFn } from "@tanstack/react-start";

import { contactSchema } from "@/lib/contact";
import { saveContactMessage } from "@/server/contact";

export const submitContact = createServerFn({ method: "POST" })
  .validator(contactSchema)
  .handler(async ({ data }) => {
    await saveContactMessage(data);
    return { ok: true as const };
  });
