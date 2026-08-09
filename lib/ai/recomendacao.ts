import { z } from "zod";
import { Balde, fornecedor, normalizar } from "@/lib/ai";
import { getCommunities } from "@/lib/communities";

/**
 * DESCOBERTA POR INTENÇÃO — de "filtro" para "3 comunidades e por quê".
 *
 * Antes, a busca por descrição traduzia a frase da pessoa em filtros e mandava
 * ela pra listagem. Isso já ajudava, mas devolvia uma PÁGINA quando a pergunta
 * era "qual eu escolho?". Agora devolve três comunidades que existem, cada uma
 * com uma frase dizendo por que aquela serve pra ELA.
 *
 * ── A REGRA: o modelo escolhe, o banco responde ─────────────────────────
 *
 * O modelo recebe o catálogo real e devolve SLUGS. Cada slug é conferido
 * contra as candidatas; o que não existe é descartado. E os dados exibidos —
 * nome, modalidade, região — **vêm do banco**, nunca do que o modelo escreveu.
 * O modelo contribui exatamente uma coisa: a justificativa.
 *
 * Isso fecha a porta que uma recomendação por IA normalmente deixa aberta:
 * inventar uma comunidade plausível. Aqui, inventar é impossível por
 * construção — não há caminho onde um nome escrito pelo modelo chegue à tela.
 *
 * ── Quando não há três ──────────────────────────────────────────────────
 *
 * Devolve as que há e diz isso na observação. Encher a lista com o que não
 * serve é pior que uma lista curta: destrói a confiança na próxima
 * recomendação, e a MUNAY tem uma cidade inteira ainda por mapear.
 */

const MAX_ENTRADA = 300;
/** Teto do catálogo que vai no prompt — acima disso, custo cresce sem ganho. */
const MAX_CANDIDATAS = 60;
export const QUANTAS = 3;

/** Balde EXCLUSIVO da descoberta — não divide cota com busca nem cadastro. */
const BALDE = new Balde({
  nome: "descoberta",
  limiteIp: 10,
  janelaMs: 10 * 60 * 1000,
  limiteDia: Number(process.env.IA_LIMITE_DIA_DESCOBERTA) || 300,
  tamanhoCache: 200,
});

export type Recomendacao = {
  slug: string;
  nome: string;
  modalidade: string;
  regiao: string;
  /** A frase da IA: por que ESTA comunidade serve pra ESTA pessoa. */
  porque: string;
};

export type ResultadoDescoberta = {
  recomendacoes: Recomendacao[];
  /** Recado quando não deu pra entregar três — ou quando nada casou. */
  observacao: string | null;
};

export type Candidata = {
  slug: string;
  nome: string;
  modalidade: string;
  regiao: string;
  descricao: string | null;
  nivel: string | null;
  horarios: string | null;
};

const respostaSchema = z.object({
  escolhas: z
    .array(z.object({ slug: z.string(), porque: z.string().max(240) }))
    .max(10),
  observacao: z.string().max(300).nullable(),
});

/**
 * A GUARDA. Recebe o texto bruto do modelo e as candidatas REAIS, e devolve só
 * o que existe. Exportada e testável sem chave de API — a regra mais importante
 * do arquivo não pode ser a menos testada.
 */
export function validarRecomendacoes(
  bruto: string,
  candidatas: readonly Candidata[],
): ResultadoDescoberta | null {
  const json = bruto.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

  let analisado;
  try {
    analisado = respostaSchema.safeParse(JSON.parse(json));
  } catch {
    return null;
  }
  if (!analisado.success) return null;

  const porSlug = new Map(candidatas.map((c) => [c.slug, c]));
  const vistos = new Set<string>();
  const recomendacoes: Recomendacao[] = [];

  for (const escolha of analisado.data.escolhas) {
    const real = porSlug.get(escolha.slug);
    // Slug que não está entre as candidatas é DESCARTADO. É aqui que uma
    // comunidade inventada morre — antes de chegar perto da tela.
    if (!real || vistos.has(real.slug)) continue;
    const porque = escolha.porque.trim();
    // Escolha sem justificativa não entra: a frase É o valor da feature; sem
    // ela isto vira uma lista igual à da busca comum.
    if (!porque) continue;

    vistos.add(real.slug);
    recomendacoes.push({
      // Dados do BANCO, não do modelo.
      slug: real.slug,
      nome: real.nome,
      modalidade: real.modalidade,
      regiao: real.regiao,
      porque,
    });
    if (recomendacoes.length === QUANTAS) break;
  }

  return {
    recomendacoes,
    observacao: analisado.data.observacao?.trim() || null,
  };
}

function montarPrompt(candidatas: readonly Candidata[]): string {
  const catalogo = candidatas
    .map((c) => {
      const extras = [c.nivel, c.horarios, c.descricao]
        .filter(Boolean)
        .join(" · ");
      return `- slug: ${c.slug} | ${c.nome} | ${c.modalidade} | ${c.regiao}${extras ? ` | ${extras}` : ""}`;
    })
    .join("\n");

  return `Você ajuda pessoas a escolher uma comunidade esportiva ou cultural de Brasília na plataforma MUNAY.

Sua tarefa: ler o que a pessoa escreveu e escolher até ${QUANTAS} comunidades DA LISTA ABAIXO que melhor atendem ela, explicando cada escolha.

COMUNIDADES DISPONÍVEIS (estas são todas — não existe nenhuma outra):
${catalogo}

Regras:
- Escolha APENAS slugs que aparecem na lista, copiados exatamente.
- NUNCA invente uma comunidade. Se nada na lista serve, devolva "escolhas": [] e explique em "observacao" o que existe de mais próximo.
- Se menos de ${QUANTAS} servem de verdade, devolva só as que servem. Encher a lista com o que não serve é pior que uma lista curta.
- "porque" é UMA frase curta em pt-BR, dirigida à pessoa, dizendo por que aquela comunidade serve pra ELA — conectando o que ela pediu ao que a comunidade tem. Não repita o nome da comunidade nem liste os campos.
- "observacao" só quando houver algo útil a avisar (nada casou, ou casou pouco). Caso contrário, null.

Responda SOMENTE com JSON válido, sem markdown:
{"escolhas": [{"slug": string, "porque": string}], "observacao": string|null}`;
}

/** As comunidades públicas que podem ser recomendadas. Fonte única da verdade. */
export async function candidatas(): Promise<Candidata[]> {
  const lista = await getCommunities();
  return lista.slice(0, MAX_CANDIDATAS).map((c) => ({
    slug: c.slug,
    nome: c.nome,
    modalidade: c.modalidade,
    regiao: c.regiao,
    descricao: c.descricao,
    nivel: c.nivel,
    horarios: c.horarios,
  }));
}

/**
 * Recomenda até três comunidades reais. `null` quando não dá pra confiar — e
 * a UI cai no caminho de sempre (filtros + listagem).
 */
export async function recomendar(
  textoBruto: string,
  ip: string,
): Promise<ResultadoDescoberta | null> {
  const provedor = fornecedor();
  if (!provedor.disponivel()) return null;

  const texto = textoBruto.trim().slice(0, MAX_ENTRADA);
  if (texto.length < 3) return null;

  const lista = await candidatas();
  if (lista.length === 0) {
    // Cidade ainda não mapeada: não há o que recomendar, e dizer isso é mais
    // honesto (e mais barato) que perguntar ao modelo.
    return {
      recomendacoes: [],
      observacao: "Ainda não temos comunidades cadastradas por aqui.",
    };
  }

  const chaveCache = `${normalizar(texto)}::${lista.length}`;
  const emCache = BALDE.lerCache<ResultadoDescoberta>(chaveCache);
  if (emCache) return emCache;

  const permissao = BALDE.podeChamar(ip);
  if (!permissao.ok) {
    console.info(`[ai:descoberta] chamada barrada: ${permissao.motivo}`);
    return null;
  }

  const bruto = await provedor.gerar({
    sistema: montarPrompt(lista),
    usuario: texto,
    maxTokens: 700,
  });
  if (bruto === null) return null;

  const resultado = validarRecomendacoes(bruto, lista);
  if (!resultado) {
    console.error("[ai:descoberta] resposta fora do formato esperado");
    return null;
  }

  BALDE.guardarCache(chaveCache, resultado);
  return resultado;
}

/** Só para teste: zera tetos e cache entre casos. */
export function zerarTetosDaDescoberta(): void {
  BALDE.zerar();
}
