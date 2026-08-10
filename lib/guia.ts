import { z } from "zod";

/**
 * GUIA DE PRIMEIRA VEZ (Frente 1 · ULTRAPLAN-SOCIAL-ORGANIZADOR.md §6.3).
 *
 * A dor central da tese ("a barreira não é achar o grupo, é ATRAVESSAR A PORTA a
 * 1ª vez") virando quatro campos que o organizador preenche e o estreante lê. É
 * também o braço de produto do princípio de segurança: o acolhimento acontece NO
 * GRUPO, com o organizador como anfitrião ("ponto de encontro é a portaria, eu
 * espero até as 6h"), nunca cruzando dois desconhecidos num ponto combinado.
 *
 * ── POR QUE JSON DE CHAVES FECHADAS, E NÃO COLUNAS ────────────────────────
 *
 * Mesmo padrão de `User.respostas`: o CATÁLOGO de campos vive aqui, no código,
 * validado por Zod; o banco guarda só o valor (`Community.guiaIniciante Json?`).
 * Campo novo no guia é uma linha aqui, não uma migration. Chave que não está no
 * schema é descartada na leitura — dado velho continua legível se o catálogo
 * mudar.
 *
 * ── COMPÕE COM `acolheIniciante` (#29), NÃO DUPLICA ───────────────────────
 *
 * `acolheIniciante` (boolean) é o sinal QUERYÁVEL e o selo — responde "recebe
 * iniciante?". O guia é o CONTEÚDO que aparece quando a resposta é sim. Os dois
 * juntos: a flag leva o estreante até a porta; o guia o faz atravessá-la.
 */

/** Metadados dos campos — fonte única para o schema E para o formulário, pra
 *  os dois não divergirem (rótulo, dica e limite num lugar só). */
export const CAMPOS_GUIA = [
  {
    chave: "pontoEncontro",
    rotulo: "Onde chegar",
    dica: "Ex.: portão 3 do Parque da Cidade, perto do bebedouro.",
    max: 200,
  },
  {
    chave: "oQueLevar",
    rotulo: "O que levar",
    dica: "Ex.: água, tênis de corrida e disposição. Tapete a gente empresta.",
    max: 200,
  },
  {
    chave: "quemProcurar",
    rotulo: "Quem procurar",
    dica: "Ex.: procure a Ana, de camiseta amarela — ela te apresenta ao grupo.",
    max: 200,
  },
  {
    chave: "observacao",
    rotulo: "Mais alguma coisa?",
    dica: "Ex.: chega 10 min antes na primeira vez pra gente te receber com calma.",
    max: 280,
  },
] as const;

export type ChaveGuia = (typeof CAMPOS_GUIA)[number]["chave"];

/** Campo de texto opcional: "" e "   " viram `undefined`, não string vazia. */
const campoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `Passou de ${max} caracteres — dá pra encurtar.` })
    .optional()
    .transform((v) => (v === "" ? undefined : v));

/**
 * O schema do guia. Chaves fechadas: `strict()` NÃO — usamos `.pick` implícito
 * porque a leitura descarta o que não conhece (ver `normalizarGuia`). Todos os
 * campos são opcionais: guia pela metade ainda ajuda, e obrigar seria barreira.
 */
export const guiaInicianteSchema = z.object(
  Object.fromEntries(
    CAMPOS_GUIA.map((c) => [c.chave, campoOpcional(c.max)]),
  ) as Record<ChaveGuia, ReturnType<typeof campoOpcional>>,
);

export type GuiaIniciante = { [K in ChaveGuia]?: string };

/**
 * Valida a entrada e devolve o guia limpo — ou `null` quando NENHUM campo veio
 * preenchido. `null` some a coluna no banco (não guarda `{}` que finge conteúdo)
 * e faz a UI pública não mostrar seção vazia. Lança nada: entrada torta cai em
 * `null` do campo, não em exceção.
 */
export function normalizarGuia(entrada: unknown): GuiaIniciante | null {
  const parsed = guiaInicianteSchema.safeParse(entrada ?? {});
  if (!parsed.success) return null;
  const limpo: GuiaIniciante = {};
  for (const c of CAMPOS_GUIA) {
    const v = (parsed.data as GuiaIniciante)[c.chave];
    if (v) limpo[c.chave] = v;
  }
  return Object.keys(limpo).length > 0 ? limpo : null;
}

/**
 * Lê o guia guardado no banco (Json desconhecido) numa forma segura pra UI:
 * descarta chave estranha, mantém só string não-vazia. Nunca lança — um Json
 * torto vira guia vazio, não erro de render.
 */
export function lerGuia(valor: unknown): GuiaIniciante {
  if (!valor || typeof valor !== "object") return {};
  const bruto = valor as Record<string, unknown>;
  const saida: GuiaIniciante = {};
  for (const c of CAMPOS_GUIA) {
    const v = bruto[c.chave];
    if (typeof v === "string" && v.trim() !== "") saida[c.chave] = v.trim();
  }
  return saida;
}

/** Há pelo menos um campo preenchido? Decide se a seção pública aparece. */
export function temGuia(guia: GuiaIniciante): boolean {
  return CAMPOS_GUIA.some((c) => Boolean(guia[c.chave]));
}
