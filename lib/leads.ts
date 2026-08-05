import { z } from "zod";

/**
 * Schema único de lead — usado no client (validação do form)
 * e no server (validação da API). Uma fonte de verdade.
 */
export const leadSchema = z.object({
  tipo: z.enum(["participante", "organizador"]),
  nome: z.string().trim().min(2, "Conta pra gente seu nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(160),
  whatsapp: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // participante
  modalidades: z.string().trim().max(200).optional(),
  regiao: z.string().trim().max(80).optional(),
  // organizador
  organizacao: z.string().trim().max(120).optional(),
  modalidade: z.string().trim().max(80).optional(),
  // honeypot anti-spam: humanos não veem este campo. A validação NÃO rejeita
  // aqui de propósito — a rota detecta o preenchimento e responde um 200
  // falso, sem gravar, para não dar pista ao bot.
  site: z.string().max(200).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
