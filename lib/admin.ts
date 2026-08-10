import { z } from "zod";

/**
 * Validação e helpers do admin interno (STORY-005). Mesmo padrão das libs
 * públicas (leads/rsvps): schema Zod único usado no client (form) e no
 * server (action). Este arquivo não importa Prisma — é seguro no client.
 */

// Vazio vira undefined (as actions gravam null) — não fica "" no banco.
// Nota: o padrão .optional().or(literal("")) das libs públicas deixa ""
// passar direto, porque .optional() aceita string vazia antes do .or.
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug muito curto")
  .max(160)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug: só letras minúsculas, números e hífens (ex.: corrida-asa-norte)",
  );

// Vazio cai no default do banco — mesmo comportamento do schema Prisma.
const citySchema = z
  .string()
  .trim()
  .max(80)
  .transform((v) => v || "Brasília");

export const communityAdminSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(120),
  slug: slugSchema,
  modalidade: z.string().trim().min(2, "Informe a modalidade").max(80),
  regiao: z.string().trim().min(2, "Escolha a região").max(80),
  city: citySchema,
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
  city: citySchema,
  local: textoOpcional(200),
  capacidade: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z
      .number({ invalid_type_error: "Capacidade deve ser um número" })
      .int("Capacidade deve ser inteira")
      .min(1, "Capacidade mínima é 1")
      .nullable(),
  ),
  // Duração em minutos (opcional). O formulário coleta duração; a escrita compõe
  // `Event.terminaEm = startsAt + duração`. Vazio → null → o cálculo assume a
  // duração padrão (lib/horarios.ts). Teto de 24h: evento não atravessa o dia
  // no modelo do eixo de tempo (ver marcarHoras). Só o caminho do PAINEL grava
  // terminaEm; o /admin ignora o campo (fica null) sem quebrar.
  duracaoMin: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z
      .number({ invalid_type_error: "Duração deve ser um número" })
      .int("Duração deve ser inteira")
      .min(5, "Duração mínima é 5 minutos")
      .max(24 * 60, "Duração máxima é 24 horas")
      .nullable(),
  ).optional(),
  gratuito: z.boolean(),
  demo: z.boolean(),
  ativo: z.boolean(),
  // Vínculo opcional com a grade que originou este evento (PR3 "marcar o próximo
  // treino"). Preenchido quando o evento nasce de uma ocorrência da grade —
  // serve pra deduplicar a home (a ocorrência já virou evento) e pra futuras
  // consultas. "" → null. Só o caminho do PAINEL usa; o /admin ignora.
  horarioRecorrenteId: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.string().uuid("Grade inválida").nullable(),
  ).optional(),
  // MODO ROTA (pedal/corrida/trilha): o encontro tem SAÍDA e CHEGADA, não um
  // local único. Origem/destino são TEXTO — nunca coordenada/geojson/linha no
  // mapa (Fase 1+ do mapa, atrás da decisão de privacidade D6). Default false →
  // o /admin e chamadas antigas seguem válidos (evento de local único).
  modoRota: z.boolean().default(false),
  origem: textoOpcional(200),
  destino: textoOpcional(200),
  percursoObs: textoOpcional(280),
}).superRefine((d, ctx) => {
  // No modo rota, saída e chegada são o mínimo — senão é "trajeto" sem trajeto.
  // Fora do modo rota, os campos são ignorados (a escrita os anula).
  if (d.modoRota) {
    if (!d.origem) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["origem"], message: "No modo rota, informe a saída." });
    }
    if (!d.destino) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["destino"], message: "No modo rota, informe a chegada." });
    }
  }
});

export type EventAdminInput = z.infer<typeof eventAdminSchema>;

// Mudou de casa pra `lib/slug.ts` quando as páginas públicas de descoberta
// passaram a precisar da MESMA função. Reexportado aqui só pra não quebrar
// quem já importava de `@/lib/admin` — a implementação é uma só.
export { slugify } from "@/lib/slug";

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
/**
 * Caracteres que fazem Excel e LibreOffice tratarem a célula como FÓRMULA.
 *
 * Isto é a defesa contra CSV injection, e o cenário não é hipotético: o campo
 * `nome` do RSVP é preenchido por qualquer visitante, **sem conta**, e vai
 * direto pro CSV que o organizador baixa e abre. Um nome como
 * `=HYPERLINK("http://sitedele","clique")` — ou pior, `=cmd|'/c calc'!A0` —
 * executa na máquina de quem abre, não na nossa. A vítima é justamente o
 * parceiro real que a MUNAY acabou de trazer.
 *
 * `-` entra na lista porque `-1+1` também é fórmula; número negativo legítimo
 * vira texto no Excel, que é o preço aceito pra não executar nada.
 */
const PREFIXO_DE_FORMULA = /^[=+\-@\t\r]/;

export function toCsv(
  header: string[],
  rows: (string | number | boolean | null | undefined)[][],
): string {
  const esc = (v: string | number | boolean | null | undefined) => {
    const bruto = v == null ? "" : String(v);
    // Apóstrofo à frente: o Excel/LibreOffice lê como "isto é texto" e não
    // mostra o caractere. Neutraliza na ORIGEM em vez de confiar em aviso de
    // planilha, que a pessoa clica sem ler.
    const s = PREFIXO_DE_FORMULA.test(bruto) ? `'${bruto}` : bruto;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header, ...rows]
    .map((row) => row.map(esc).join(";"))
    .join("\r\n");
}

/** Estado devolvido pelas server actions dos forms do admin. */
export type AdminFormState = { error: string } | null;
