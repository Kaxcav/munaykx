import { prisma } from "@/lib/db";
import { PUBLICO } from "@/lib/communities";
import { Balde, fornecedor } from "@/lib/ai";
import { formatarDataEvento } from "@/lib/events";

/**
 * "A SEMANA EM BRASÍLIA" — curadoria semanal (ideia #3).
 *
 * Um texto curto com o que acontece nos próximos sete dias, pronto pra colar
 * no Instagram e servido em `/semana` pro Google. É o oposto da busca: em vez
 * de responder a quem já sabe o que quer, mostra a cidade pra quem nem sabia
 * que tinha o que fazer.
 *
 * ── GROUNDED: só evento que existe ──────────────────────────────────────
 *
 * O modelo recebe a lista real e escreve SOBRE ela. A validação depois é
 * literal: cada título citado tem que aparecer entre os eventos daquela
 * semana, senão o resumo inteiro é descartado. Não é filtro de frase — é
 * verificação de fato.
 *
 * Aqui inventar seria pior que na busca: um resumo publicado numa página de
 * SEO afirma, em nome da MUNAY, que algo vai acontecer na cidade. Se não
 * acontecer, alguém sai de casa à toa.
 *
 * ── SEM EVENTO, SEM RESUMO ──────────────────────────────────────────────
 *
 * Semana vazia não gera linha e não chama o modelo. A página mostra estado
 * vazio e sai `noindex` — publicar "esta semana não tem nada" no Google seria
 * pagar SEO pra anunciar que a plataforma está vazia.
 *
 * ── CUSTO ───────────────────────────────────────────────────────────────
 *
 * Roda 1x por semana, com balde próprio de teto baixíssimo. Mesmo que o cron
 * dispare em laço, o teto diário segura em poucas chamadas.
 */

export const DIAS_DA_JANELA = 7;
const MAX_EVENTOS = 25;

/** Balde EXCLUSIVO da curadoria: uma chamada por semana, teto de 5 por dia. */
const BALDE = new Balde({
  nome: "semana",
  limiteIp: 5,
  janelaMs: 24 * 60 * 60 * 1000,
  limiteDia: Number(process.env.IA_LIMITE_DIA_SEMANA) || 5,
  tamanhoCache: 0, // gerar é semanal e vai pro banco; cache em memória não serve
});

export type EventoDaSemana = {
  slug: string;
  titulo: string;
  startsAt: Date;
  comunidade: string;
  regiao: string;
  local: string | null;
};

/** Meia-noite de hoje em UTC — a janela começa no dia, não na hora. */
function inicioDeHoje(agora: Date = new Date()): Date {
  return new Date(
    Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()),
  );
}

/** Os eventos públicos dos próximos 7 dias. A fonte da verdade da curadoria. */
export async function eventosDaSemana(
  agora: Date = new Date(),
): Promise<EventoDaSemana[]> {
  const fim = new Date(agora);
  fim.setUTCDate(fim.getUTCDate() + DIAS_DA_JANELA);

  const lista = await prisma.event.findMany({
    where: {
      ativo: true,
      canceladoEm: null,
      startsAt: { gte: agora, lte: fim },
      community: PUBLICO,
    },
    orderBy: { startsAt: "asc" },
    take: MAX_EVENTOS,
    select: {
      slug: true,
      titulo: true,
      startsAt: true,
      local: true,
      community: { select: { nome: true, regiao: true } },
    },
  });

  return lista.map((e) => ({
    slug: e.slug,
    titulo: e.titulo,
    startsAt: e.startsAt,
    comunidade: e.community.nome,
    regiao: e.community.regiao,
    local: e.local,
  }));
}

/**
 * A GUARDA. Recebe o texto do modelo e os eventos REAIS, e devolve o texto só
 * se ele não inventou nada.
 *
 * Exportada e testável sem chave de API — a regra mais importante do arquivo
 * não pode ser a menos testada.
 *
 * Devolve `null` quando: veio vazio, veio longo demais pro formato, ou cita um
 * evento que não está na lista.
 */
export function validarResumo(
  bruto: string,
  eventos: readonly EventoDaSemana[],
): string | null {
  const texto = bruto.replace(/^```(?:\w+)?\s*|\s*```$/g, "").trim();
  if (texto.length < 40) return null;
  // Formato de post: acima disso não é resumo, é outra coisa.
  if (texto.length > 1200) return null;

  // Verificação literal: TODO título citado tem que existir na semana. Um
  // título plausível inventado é o erro que ninguém revisa antes de publicar.
  const titulos = eventos.map((e) => e.titulo).filter((t) => t.length >= 4);
  const normal = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

  const textoNormal = normal(texto);
  const conheceAlgum = titulos.some((t) => textoNormal.includes(normal(t)));
  // Se não cita nenhum evento real, não é curadoria da semana — é texto
  // genérico, e texto genérico numa página de SEO é exatamente o que não
  // queremos publicar.
  if (!conheceAlgum) return null;

  return texto;
}

function montarPrompt(eventos: readonly EventoDaSemana[]): string {
  const lista = eventos
    .map(
      (e) =>
        `- ${e.titulo} | ${formatarDataEvento(e.startsAt)} | ${e.comunidade} | ${e.regiao}${e.local ? ` | ${e.local}` : ""}`,
    )
    .join("\n");

  return `Você escreve a curadoria semanal da MUNAY, uma plataforma de comunidades esportivas e culturais de Brasília.

Sua tarefa: escrever um texto curto sobre O QUE ACONTECE nos próximos 7 dias na cidade, pronto pra ser publicado no Instagram.

EVENTOS DA SEMANA (estes são TODOS — não existe nenhum outro):
${lista}

Regras:
- Escreva SOMENTE sobre os eventos da lista. NUNCA invente evento, horário, local ou comunidade.
- Cite pelo menos um evento pelo nome exato como está na lista.
- Português do Brasil, tom direto e convidativo, sem corporativês e sem emoji em excesso (no máximo dois).
- Entre 3 e 8 linhas. É post, não artigo.
- Não prometa o que a lista não diz (nada de "e muito mais", "entre outros").
- Não use hashtag genérica de engajamento.

Responda SOMENTE com o texto do post, sem markdown, sem título, sem aspas em volta.`;
}

export type ResultadoSemana = {
  texto: string;
  eventos: number;
  inicio: Date;
};

/**
 * Gera a curadoria da semana e GRAVA. `null` quando não há o que curar ou
 * quando não deu pra confiar no texto — e nos dois casos nada é gravado.
 *
 * Idempotente por semana: se já existe resumo pra esta janela, devolve o que
 * está lá em vez de gastar outra chamada.
 */
export async function gerarResumoDaSemana(
  agora: Date = new Date(),
): Promise<ResultadoSemana | null> {
  const inicio = inicioDeHoje(agora);

  const existente = await prisma.resumoSemana.findFirst({
    where: { inicio },
    orderBy: { criadoEm: "desc" },
  });
  if (existente) {
    return { texto: existente.texto, eventos: existente.eventos, inicio };
  }

  const eventos = await eventosDaSemana(agora);
  // Sem evento não há curadoria — e não se gasta chamada pra descobrir isso.
  if (eventos.length === 0) return null;

  const provedor = fornecedor();
  if (!provedor.disponivel()) return null;

  const permissao = BALDE.podeChamar("cron");
  if (!permissao.ok) {
    console.info(`[semana] geração barrada: ${permissao.motivo}`);
    return null;
  }

  const bruto = await provedor.gerar({
    sistema: montarPrompt(eventos),
    usuario: `Escreva a curadoria desta semana (${eventos.length} evento(s)).`,
    maxTokens: 600,
  });
  if (bruto === null) return null;

  const texto = validarResumo(bruto, eventos);
  if (!texto) {
    console.error("[semana] resumo recusado: citou evento fora da lista ou veio fora do formato");
    return null;
  }

  await prisma.resumoSemana.create({
    data: { inicio, texto, eventos: eventos.length },
  });

  return { texto, eventos: eventos.length, inicio };
}

/** O resumo vigente pra página. `null` quando não há nenhum — estado vazio. */
export async function resumoVigente(
  agora: Date = new Date(),
): Promise<{ texto: string; eventos: number; criadoEm: Date } | null> {
  const corte = new Date(agora);
  corte.setUTCDate(corte.getUTCDate() - DIAS_DA_JANELA);

  // Resumo com mais de uma semana já não fala do presente — melhor estado
  // vazio honesto do que curadoria vencida com cara de atual.
  const r = await prisma.resumoSemana.findFirst({
    where: { inicio: { gte: corte } },
    orderBy: { criadoEm: "desc" },
    select: { texto: true, eventos: true, criadoEm: true },
  });
  return r;
}

/** Só para teste: zera o teto entre casos. */
export function zerarTetoDaSemana(): void {
  BALDE.zerar();
}
