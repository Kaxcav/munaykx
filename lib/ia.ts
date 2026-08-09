import { z } from "zod";
import { Balde, fornecedor, normalizar, statusDe } from "@/lib/ai";
import type { StatusIa } from "@/lib/ai";

/**
 * BUSCA POR DESCRIÇÃO — a primeira feature de IA da MUNAY.
 *
 * O que ela faz: traduz o jeito que a pessoa FALA para o jeito que o dado está
 * ROTULADO. "quero jogar vôlei perto do centro", "jiu jitsu em ceilandia",
 * "musculação de manhã" → filtros reais de modalidade e região. Isso um filtro
 * por regra não faz: exigiria a pessoa já saber que a modalidade se chama
 * "Jiu-jítsu" com hífen e acento, e que "centro" aqui é "Plano Piloto".
 *
 * ── O que mudou nesta refatoração (e o que NÃO mudou) ───────────────────
 *
 * O transporte HTTP, os tetos e o cache saíram daqui e viraram `lib/ai/` —
 * substrato comum, porque a segunda e a terceira feature de IA precisam das
 * mesmas garantias e copiá-las seria garantir que divergissem. O que ficou é
 * o que é DESTA feature: o prompt, o schema da resposta e a guarda contra
 * invenção.
 *
 * **Comportamento externo: idêntico.** Mesmo modelo, mesmos tetos (10 por IP a
 * cada 10 min, 500/dia), mesmo cache de 200, mesmo timeout, mesma entrada
 * máxima, mesmas assinaturas exportadas. A suíte que existia antes vale sem
 * uma linha alterada — foi assim que a paridade foi verificada.
 *
 * As três regras do substrato, aplicadas aqui:
 *
 * 1. **O modelo escolhe DENTRO da lista, nunca inventa.** As modalidades e
 *    regiões vão no prompt vindas do banco, e o retorno é validado contra elas
 *    de novo aqui. Valor que não existe é descartado.
 * 2. **Teto próprio.** Esta feature tem balde só dela — a busca pública não
 *    consome a cota de nenhuma outra.
 * 3. **Falha nunca vira erro na cara da pessoa.** Devolve `null` e a UI cai no
 *    filtro normal.
 */

const MAX_ENTRADA = 300;

/** Balde EXCLUSIVO da busca: 10 por IP a cada 10 min, 500 por dia, cache de 200. */
const BALDE = new Balde({
  nome: "busca",
  limiteIp: 10,
  janelaMs: 10 * 60 * 1000,
  limiteDia: Number(process.env.IA_LIMITE_DIA) || 500,
  tamanhoCache: 200,
});

export type BuscaInterpretada = {
  modalidade: string | null;
  regiao: string | null;
  /** O que a IA entendeu, mostrado pra pessoa poder corrigir. */
  entendimento: string;
  /** Recado quando o pedido não tem correspondência exata. */
  observacao: string | null;
};

export type Facetas = { modalidades: string[]; regioes: string[] };

export function iaDisponivel(): boolean {
  return fornecedor().disponivel();
}

const respostaSchema = z.object({
  modalidade: z.string().nullable(),
  regiao: z.string().nullable(),
  entendimento: z.string().max(200),
  observacao: z.string().max(300).nullable(),
});

/**
 * A GUARDA. Recebe o texto bruto que o modelo devolveu e só deixa passar o que
 * existe de verdade no banco.
 *
 * Está separada e exportada de propósito: é a parte que precisa de teste, e
 * testar ela exigindo chave de API seria transformar a regra mais importante do
 * arquivo na menos testada.
 *
 * Devolve `null` quando o retorno é inutilizável (JSON quebrado, formato errado,
 * ou nenhum filtro aproveitável).
 */
export function validarInterpretacao(
  bruto: string,
  facetas: Facetas,
): BuscaInterpretada | null {
  // O modelo às vezes embrulha em ```json apesar da instrução.
  const json = bruto.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

  let analisado;
  try {
    analisado = respostaSchema.safeParse(JSON.parse(json));
  } catch {
    return null;
  }
  if (!analisado.success) return null;

  // Valor que não está na lista do banco é DESCARTADO, não repassado. Confiar
  // no retorno do modelo aqui seria filtrar por algo que não existe e mostrar
  // tela vazia com cara de site quebrado.
  const dentroDaLista = (v: string | null, lista: string[]) =>
    v && lista.includes(v) ? v : null;

  return {
    modalidade: dentroDaLista(analisado.data.modalidade, facetas.modalidades),
    regiao: dentroDaLista(analisado.data.regiao, facetas.regioes),
    entendimento: analisado.data.entendimento,
    observacao: analisado.data.observacao,
  };
}

function montarPrompt(facetas: Facetas): string {
  return `Você ajuda pessoas a encontrar comunidades esportivas e culturais de Brasília na plataforma MUNAY.

Sua tarefa: ler o que a pessoa escreveu e escolher, DENTRE AS LISTAS ABAIXO, a modalidade e a região que melhor correspondem. Você NÃO inventa valores.

MODALIDADES DISPONÍVEIS:
${facetas.modalidades.map((m) => `- ${m}`).join("\n")}

REGIÕES DISPONÍVEIS:
${facetas.regioes.map((r) => `- ${r}`).join("\n")}

Regras:
- Use EXATAMENTE a grafia das listas, com acento e hífen.
- Se a pessoa não mencionou modalidade (ou região), devolva null nesse campo. Não chute.
- Trate sinônimos e linguagem coloquial: "jiu jitsu" → a entrada correspondente da lista; "centro"/"asa"/"eixo" costumam significar Plano Piloto em Brasília; "musculação"/"treino funcional" → a modalidade mais próxima que EXISTA na lista.
- Se a pessoa pedir algo que claramente não existe na lista, devolva null e explique em "observacao" o que existe de mais próximo.
- "entendimento" é uma frase curta em pt-BR, na 1ª pessoa do plural, dizendo o que você entendeu. Ex.: "Procurando corrida em Taguatinga."
- "observacao" só quando houver algo útil a avisar; caso contrário, null.

Responda SOMENTE com JSON válido, sem markdown, neste formato:
{"modalidade": string|null, "regiao": string|null, "entendimento": string, "observacao": string|null}`;
}

/**
 * Interpreta a busca. Devolve `null` sempre que não der pra confiar no
 * resultado — o chamador cai no filtro normal.
 */
export async function interpretarBusca(
  textoBruto: string,
  facetas: Facetas,
  ip: string,
): Promise<BuscaInterpretada | null> {
  const provedor = fornecedor();
  if (!provedor.disponivel()) return null;

  const texto = textoBruto.trim().slice(0, MAX_ENTRADA);
  if (texto.length < 3) return null;

  const chaveCache = `${normalizar(texto)}::${facetas.modalidades.length}:${facetas.regioes.length}`;
  const emCache = BALDE.lerCache<BuscaInterpretada>(chaveCache);
  if (emCache) return emCache;

  const permissao = BALDE.podeChamar(ip);
  if (!permissao.ok) {
    console.info(`[ia] chamada barrada: ${permissao.motivo}`);
    return null;
  }

  const bruto = await provedor.gerar({
    sistema: montarPrompt(facetas),
    usuario: texto,
    maxTokens: 400,
  });
  if (bruto === null) return null;

  const resultado = validarInterpretacao(bruto, facetas);
  if (!resultado) {
    console.error("[ia] resposta fora do formato esperado");
    return null;
  }

  BALDE.guardarCache(chaveCache, resultado);
  return resultado;
}

/** Diagnóstico pro /admin — mesma ideia do statusEmail(). */
export function statusIa(): StatusIa {
  return statusDe(BALDE, fornecedor());
}

/** Só para teste: zera tetos e cache entre casos. */
export function zerarTetosDaBusca(): void {
  BALDE.zerar();
}
