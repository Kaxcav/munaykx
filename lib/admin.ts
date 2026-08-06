import { z } from "zod";

/**
 * Validação e helpers do admin interno (STORY-005). Mesmo padrão das libs
 * públicas (leads/rsvps): schema Zod único usado no client (form) e no
 * server (action). Este arquivo não importa Prisma — é seguro no client.
 */

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug muito curto")
  .max(160)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug: só letras minúsculas, números e hífens (ex.: corrida-asa-norte)",
  );

export const communityAdminSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(120),
  slug: slugSchema,
  modalidade: z.string().trim().min(2, "Informe a modalidade").max(80),
  regiao: z.string().trim().min(2, "Informe a região").max(80),
  descricao: textoOpcional(2000),
  horarios: textoOpcional(200),
  local: textoOpcional(200),
  nivel: textoOpcional(80),
  demo: z.boolean(),
  ativo: z.boolean(),
});

export type CommunityAdminInput = z.infer<typeof communityAdminSchema>;

export const eventAdminSchema = z.object({
  communityId: z.string().uuid("Escolha uma comunidade"),
  titulo: z.string().trim().min(2, "Título muito curto").max(160),
  slug: slugSchema,
  // Vem do <input type="datetime-local"> — interpretado como hora de Brasília.
  startsAt: z.string().trim().min(1, "Informe data e hora"),
  local: textoOpcional(200),
  capacidade: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z
      .number({ invalid_type_error: "Capacidade deve ser um número" })
      .int("Capacidade deve ser inteira")
      .min(1, "Capacidade mínima é 1")
      .nullable(),
  ),
  gratuito: z.boolean(),
  demo: z.boolean(),
  ativo: z.boolean(),
});

export type EventAdminInput = z.infer<typeof eventAdminSchema>;

/** "Corrida Asa Norte à noite" → "corrida-asa-norte-a-noite". */
export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

/**
 * "2026-08-15T19:00" (datetime-local) → Date em UTC, assumindo Brasília.
 * Offset fixo -03:00: o DF não tem horário de verão desde 2019.
 */
export function parseDataBrasilia(valor: string): Date | null {
  const d = new Date(`${valor}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date → "2026-08-15T19:00" no fuso de Brasília — pré-preenche datetime-local. */
export function formatDatetimeLocal(data: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(data);
  const p = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Data+hora legível nas tabelas do admin, fuso de Brasília. */
export function formatarDataAdmin(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

/**
 * CSV com ";" e CRLF — o Excel pt-BR abre direto (vírgula viraria coluna
 * única). Quem consome adiciona o BOM ﻿ na resposta.
 */
export function toCsv(
  header: string[],
  rows: (string | number | boolean | null | undefined)[][],
): string {
  const esc = (v: string | number | boolean | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header, ...rows]
    .map((row) => row.map(esc).join(";"))
    .join("\r\n");
}

/** Estado devolvido pelas server actions dos forms do admin. */
export type AdminFormState = { error: string } | null;
