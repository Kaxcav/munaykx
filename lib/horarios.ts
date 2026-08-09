import { z } from "zod";
import { prisma } from "@/lib/db";
import { PUBLICO, CIDADE_PADRAO } from "@/lib/communities";
import { comunidadeDoUsuario } from "@/lib/organizacao";

/**
 * O EIXO DE TEMPO — FASE 0 do mapa (PESQUISA-MAPA-MUNAY.md).
 *
 * ── POR QUE ESTE ARQUIVO EXISTE ───────────────────────────────────────────
 *
 * `Community.horarios` é texto livre: "toda terça e quinta, 6h15". Bom pra ler,
 * impossível de consultar. Não dá pra perguntar ao banco "o que está ativo
 * terça às 6h" — e essa pergunta É o diferencial do produto.
 *
 * A pesquisa foi explícita: o destravador do eixo de tempo **não é a tecnologia
 * de mapa, é a modelagem de recorrência**. Por isso a Fase 0 vem antes de
 * qualquer tile, coordenada ou MapLibre — e por isso este arquivo é o coração
 * dela, não o componente do mapa.
 *
 * ── O QUE NÃO TEM AQUI, DE PROPÓSITO ──────────────────────────────────────
 *
 * Nenhuma coordenada. Nenhum lat/lng. O mapa da Fase 0 acende REGIÃO (RA), e
 * ponto final. Isso não é limitação técnica — é a decisão de privacidade da
 * §H da pesquisa: "toda terça 6h15 no ponto exato X" é exatamente o mapa de
 * onde tem gente treinando sozinha de madrugada, e é o filtro que a própria
 * Strava se recusou a entregar depois do episódio das bases militares. Região
 * + janela de hora dá o valor de descoberta sem dar o rastro.
 *
 * ── CONVIVE COM O TEXTO LIVRE, NÃO SUBSTITUI ──────────────────────────────
 *
 * `Community.horarios` continua existindo e continua sendo o que a pessoa lê na
 * página. Ele carrega nuance que campo estruturado nenhum carrega ("exceto
 * feriado", "ponto de encontro no portão 3"). O estruturado alimenta o mapa.
 * Comunidade que não cadastrou horário estruturado simplesmente não responde ao
 * scrubber — some do eixo de tempo, mas não quebra nada e continua no site.
 */

/** Domingo primeiro, igual ao `Date.getDay()` do JS — sem tradução na fronteira. */
export const DIAS = [
  { indice: 0, curto: "dom", nome: "Domingo" },
  { indice: 1, curto: "seg", nome: "Segunda" },
  { indice: 2, curto: "ter", nome: "Terça" },
  { indice: 3, curto: "qua", nome: "Quarta" },
  { indice: 4, curto: "qui", nome: "Quinta" },
  { indice: 5, curto: "sex", nome: "Sexta" },
  { indice: 6, curto: "sáb", nome: "Sábado" },
] as const;

/**
 * Quanto dura um treino sem hora de fim declarada.
 *
 * Muita comunidade sabe quando começa e não quando termina. A alternativa seria
 * exigir o fim (atrito no cadastro, e o organizador inventaria um número) ou
 * sumir do mapa (pior: o dado existe e não aparece). Uma hora é o palpite
 * honesto pra treino de corrida/funcional/yoga.
 */
export const DURACAO_PADRAO_MIN = 60;

const MIN_POR_DIA = 24 * 60;

/** "06:15" → 375. `null` para qualquer coisa que não seja HH:MM válido. */
export function hhmmParaMinutos(valor: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(valor.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 375 → "06:15". */
export function minutosParaHHMM(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "Terça, 06:15 às 07:30" — o rótulo que a UI mostra. */
export function rotularHorario(h: {
  diaSemana: number;
  minutoInicio: number;
  minutoFim: number | null;
}): string {
  const dia = DIAS[h.diaSemana]?.nome ?? "?";
  const inicio = minutosParaHHMM(h.minutoInicio);
  if (h.minutoFim === null) return `${dia}, ${inicio}`;
  return `${dia}, ${inicio} às ${minutosParaHHMM(h.minutoFim)}`;
}

// ─── A MATRIZ TEMPORAL ────────────────────────────────────────────────────

/**
 * Quais horas de quais dias cada RA está acesa.
 *
 * Um `number` por dia da semana, usado como **bitmask de 24 bits** (bit h = a
 * hora h). Sete inteiros descrevem a semana inteira de uma região.
 *
 * Por que bitmask e não uma matriz de booleanos: a página `/mapa` é server
 * component e precisa mandar isto pro cliente pra que arrastar o slider não
 * dispare uma consulta por movimento. Em booleano seriam 35 RAs × 7 × 24 =
 * 5.880 valores no HTML; em bitmask são 35 × 7 = 245 inteiros. O scrubber fica
 * instantâneo e o banco não é tocado nem uma vez enquanto a pessoa brinca.
 *
 * `reais` e `demo` separados pelo mesmo motivo que o mapa já separa: comunidade
 * ilustrativa não pode acender igual a parceiro de verdade (regra 3 do
 * projeto). O componente decide o estado com os dois, exatamente como
 * `regioesNoMapa` faz com `total`/`reais`.
 */
export type MatrizTemporal = Record<string, { reais: number[]; demo: number[] }>;

/**
 * Liga os bits das horas cobertas por um intervalo. Puro, exportado pra ser
 * testado sem banco.
 *
 * Um treino de 06:15 às 07:30 acende as horas 6 E 7 — quem olha o mapa às 7h
 * quer ver que tem gente lá, e tem. A borda é inclusiva no início da hora.
 *
 * FIM ANTES DO INÍCIO (22:00 → 01:00, o treino que atravessa a meia-noite):
 * tratado como duração padrão a partir do início, e não como "vai até amanhã".
 * A alternativa — deixar o intervalo dar a volta — acenderia a madrugada
 * inteira de um dia que não foi cadastrado, e um mapa que mente pra mais é pior
 * que um mapa incompleto. Caso raro o bastante pra não valer a complexidade de
 * partir a ocorrência em dois dias; quando valer, é Fase 1.
 */
export function marcarHoras(
  mascara: number,
  minutoInicio: number,
  minutoFim: number | null,
): number {
  const inicio = Math.max(0, Math.min(minutoInicio, MIN_POR_DIA - 1));
  const fimBruto =
    minutoFim !== null && minutoFim > inicio
      ? minutoFim
      : inicio + DURACAO_PADRAO_MIN;
  // Clampa no fim do dia: 23:40 + 60min não vira hora 24.
  const fim = Math.min(fimBruto, MIN_POR_DIA - 1);

  let saida = mascara;
  for (let h = Math.floor(inicio / 60); h <= Math.floor(fim / 60); h++) {
    saida |= 1 << h;
  }
  return saida;
}

/** Pura: a RA está acesa neste dia×hora? Usada pelo componente e pelo teste. */
export function acesaEm(
  mascaras: number[] | undefined,
  dia: number,
  hora: number,
): boolean {
  const m = mascaras?.[dia];
  if (!m) return false;
  return ((m >> hora) & 1) === 1;
}

/**
 * Monta a matriz da cidade inteira numa consulta só.
 *
 * GROUNDED: `PUBLICO` (ativo + aprovada), o mesmo filtro que a descoberta e o
 * SEO usam. Horário de comunidade pendente ou pausada não acende o mapa — se
 * usasse `ativo: true` solto, o mapa mostraria cobertura que ninguém aprovou.
 * `ativo: true` do próprio horário também: pausar o treino do recesso não deve
 * exigir apagar o registro.
 *
 * A região da OCORRÊNCIA ganha da região da comunidade quando existe (grupo
 * itinerante). É o único lugar onde essa precedência mora.
 */
export async function matrizTemporal(
  city: string = CIDADE_PADRAO,
): Promise<MatrizTemporal> {
  // Sem banco de pé o site continua subindo (regra do projeto): o mapa fica sem
  // eixo de tempo em vez de derrubar a página.
  if (!process.env.DATABASE_URL) return {};

  const horarios = await prisma.horarioRecorrente
    .findMany({
      where: { ativo: true, community: { ...PUBLICO, city } },
      select: {
        diaSemana: true,
        minutoInicio: true,
        minutoFim: true,
        regiao: true,
        community: { select: { regiao: true, demo: true } },
      },
    })
    .catch(() => []);

  const matriz: MatrizTemporal = {};
  for (const h of horarios) {
    if (h.diaSemana < 0 || h.diaSemana > 6) continue; // dado torto não derruba o mapa
    const regiao = h.regiao ?? h.community.regiao;
    const alvo = (matriz[regiao] ??= {
      reais: [0, 0, 0, 0, 0, 0, 0],
      demo: [0, 0, 0, 0, 0, 0, 0],
    });
    const faixa = h.community.demo ? alvo.demo : alvo.reais;
    faixa[h.diaSemana] = marcarHoras(faixa[h.diaSemana], h.minutoInicio, h.minutoFim);
  }
  return matriz;
}

/** True quando existe QUALQUER horário estruturado publicável. Com a matriz
 *  vazia o mapa nem mostra o scrubber — controle que não muda nada é ruído. */
export function temEixoDeTempo(matriz: MatrizTemporal): boolean {
  return Object.values(matriz).some((m) =>
    [...m.reais, ...m.demo].some((v) => v !== 0),
  );
}

// ─── ESCRITA (owner-scoped) ───────────────────────────────────────────────

/**
 * Entrada do formulário. `horaFim` vazio é legítimo (vira `null`), não erro.
 *
 * Zod compartilhado client/server, como o resto do projeto: uma fonte de
 * verdade pra regra, nunca duas que divergem.
 */
export const horarioSchema = z
  .object({
    diaSemana: z.coerce.number().int().min(0).max(6),
    horaInicio: z.string().trim().min(1, "Informe a hora de início."),
    horaFim: z.string().trim().optional(),
  })
  .transform((d, ctx) => {
    const minutoInicio = hhmmParaMinutos(d.horaInicio);
    if (minutoInicio === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Hora de início inválida." });
      return z.NEVER;
    }
    let minutoFim: number | null = null;
    if (d.horaFim) {
      minutoFim = hhmmParaMinutos(d.horaFim);
      if (minutoFim === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Hora de fim inválida." });
        return z.NEVER;
      }
      if (minutoFim <= minutoInicio) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A hora de fim precisa ser depois da de início.",
        });
        return z.NEVER;
      }
    }
    return { diaSemana: d.diaSemana, minutoInicio, minutoFim };
  });

export type ResultadoHorario<T = undefined> =
  | { ok: true; dados: T }
  | { ok: false; motivo: "nao-dono" | "invalido" | "limite"; erro?: string };

const naoDono = { ok: false, motivo: "nao-dono" } as const;

/**
 * Teto por comunidade. Não é regra de negócio — é o freio que impede um form
 * aberto de virar vetor de enchimento de tabela. 21 = 3 treinos por dia, todo
 * dia, que já é mais do que qualquer comunidade real tem.
 */
export const LIMITE_HORARIOS = 21;

/** Os horários de uma comunidade da pessoa. `null` se não for dela (→ 404). */
export async function horariosDaComunidade(userId: string, slug: string) {
  const com = await comunidadeDoUsuario(userId, slug);
  if (!com) return null;
  return prisma.horarioRecorrente.findMany({
    where: { communityId: com.id },
    orderBy: [{ diaSemana: "asc" }, { minutoInicio: "asc" }],
  });
}

/**
 * Adiciona um horário à comunidade da pessoa.
 *
 * Mesmo contrato do resto do painel (`lib/painel.ts`): `userId` é o PRIMEIRO
 * argumento e vem da sessão lida no servidor — nunca do formulário. A
 * assinatura é a barreira. "Não é seu" e "não existe" devolvem o mesmo
 * `nao-dono`, e a página vira 404, nunca 403.
 */
export async function adicionarHorario(
  userId: string,
  slug: string,
  entrada: unknown,
): Promise<ResultadoHorario> {
  const com = await comunidadeDoUsuario(userId, slug);
  if (!com) return naoDono;

  const parsed = horarioSchema.safeParse(entrada);
  if (!parsed.success) {
    return { ok: false, motivo: "invalido", erro: parsed.error.issues[0]?.message };
  }

  const quantos = await prisma.horarioRecorrente.count({ where: { communityId: com.id } });
  if (quantos >= LIMITE_HORARIOS) {
    return {
      ok: false,
      motivo: "limite",
      erro: `Máximo de ${LIMITE_HORARIOS} horários por comunidade.`,
    };
  }

  await prisma.horarioRecorrente.create({
    data: { communityId: com.id, ...parsed.data },
  });
  return { ok: true, dados: undefined };
}

/**
 * Remove um horário da comunidade da pessoa.
 *
 * O `where` leva `communityId` JUNTO do `id` de propósito: sem isso, quem
 * descobrisse o id de um horário alheio o apagaria passando o próprio slug. O
 * dono é checado antes E amarrado na cláusula — as duas coisas, porque a
 * primeira sozinha já foi suficiente pra bug em projeto que virou CVE.
 */
export async function removerHorario(
  userId: string,
  slug: string,
  horarioId: string,
): Promise<ResultadoHorario> {
  const com = await comunidadeDoUsuario(userId, slug);
  if (!com) return naoDono;

  const apagados = await prisma.horarioRecorrente.deleteMany({
    where: { id: horarioId, communityId: com.id },
  });
  if (apagados.count === 0) return naoDono;
  return { ok: true, dados: undefined };
}
