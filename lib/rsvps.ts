import { z } from "zod";

/**
 * Schema único de RSVP — usado no client (validação do form)
 * e no server (validação da API). Uma fonte de verdade.
 */
export const rsvpSchema = z.object({
  eventSlug: z.string().trim().min(1).max(160),
  nome: z.string().trim().min(2, "Conta pra gente seu nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(160),
  whatsapp: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // honeypot anti-spam: humanos não veem este campo. A validação NÃO rejeita
  // aqui de propósito — a rota detecta o preenchimento e responde um 200
  // falso, sem gravar, para não dar pista ao bot.
  site: z.string().max(200).optional(),
});

export type RsvpInput = z.infer<typeof rsvpSchema>;
