import { describe, expect, it } from "vitest";
import { contactSchema } from "@/lib/contact";

const valid = { topic: "club", name: "Sami", email: "sami@example.tn", message: "Le club a maintenant 4 terrains.", openedAt: 0 } as const;

describe("contactSchema", () => {
  it("accepts a complete message", () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects a bad e-mail with a French message", () => {
    const r = contactSchema.safeParse({ ...valid, email: "pas-un-mail" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("Adresse e-mail invalide.");
  });
  it("lets a filled honeypot through so the server can drop it silently", () => {
    expect(contactSchema.safeParse({ ...valid, website: "http://spam.example" }).success).toBe(true);
  });
});
