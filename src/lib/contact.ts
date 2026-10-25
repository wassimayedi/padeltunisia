import { z } from "zod";

export const CONTACT_TOPICS = [
  { value: "club", label: "Ajouter ou corriger un club" },
  { value: "tournoi", label: "Annoncer un tournoi" },
  { value: "partenariat", label: "Partenariat ou publicité" },
  { value: "autre", label: "Autre question" },
] as const;

/** Shared by the form (instant feedback) and the server function (the real check). */
export const contactSchema = z.object({
  topic: z.enum(["club", "tournoi", "partenariat", "autre"]),
  name: z.string().trim().min(2, "Indiquez votre nom.").max(100),
  email: z.string().trim().email("Adresse e-mail invalide.").max(200),
  phone: z.string().trim().max(30).regex(/^[+\d\s().-]*$/, "Numéro invalide.").optional(),
  organization: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10, "Votre message est trop court.").max(5000, "Votre message est trop long (5000 caractères max)."),
  // Anti-spam: a field humans never see, and when the form was opened. The server drops
  // filled-in or too-fast submissions silently, so bots get no signal.
  website: z.string().max(500).optional(),
  openedAt: z.number().int(),
});

export type ContactInput = z.infer<typeof contactSchema>;
