import { z } from "zod";

/**
 * Busca por descrição — a camada de IA da MUNAY.
 *
 * O que ela faz: traduz o jeito que a pessoa FALA para o jeito que o dado
 * está ROTULADO. "quero jogar vôlei perto do centro", "jiu jitsu em
 * ceilandia", "musculação de manhã" → filtros reais de modalidade e região.
 * Isso um filtro por regra não faz: exigiria a pessoa já saber que a
 * modalidade se chama "Jiu-jítsu" com hífen e acento, e que "centro" aqui é
 * "Plano Piloto".
 *
 * TRÊS REGRAS QUE NÃO SE NEGOCIAM:
 *
 * 1. **O modelo escolhe DENTRO da lista, nunca inventa.** As modalidades e
 *    regiões vão no prompt vindas do banco, e o retorno é validado contra
 *    elas de novo aqui. Valor que não existe é descartado. Sem isso, a busca
 *    filtraria por "Crossfit" num banco que só tem "Funcional" e devolveria
 *    vazio com cara de site quebrado.
 *
 * 2. **Endpoint público que chama API paga é vetor de esvaziar carteira.**
 *    Tem teto por IP, teto global diário, limite de tamanho de entrada e
 *    cache. Nenhum deles é opcional.
 *
 * 3. **Falha nunca vira erro na cara da pessoa.** Sem chave, API fora,
 *    timeout ou JSON quebrado → devolve `null` e a UI cai no filtro normal.
 *    Busca é caminho crítico; IA é melhoria, não dependência.
 */

const MODELO = process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 8_000;
const MAX_ENTRADA = 300;

/** Teto por IP: 10 buscas a cada 10 minutos. */
const LIMITE_IP = 10;
const JANELA_MS = 10 * 60 * 1000;
/** Teto global do dia — trava de custo, ajustável por env. */
const LIMITE_DIA = Number(process.env.IA_LIMITE_DIA) || 500;

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
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/* ------------------------------------------------------------------ *
 * Tetos e cache — memória do processo.
 *
 * Some quando o Railway reinicia, e isso é aceitável: reinício é raro e
 * quem estava abusando perde o histórico junto. Migrar pra banco só vale
 * quando houver mais de uma instância — aí o teto por IP vazaria.
 * ------------------------------------------------------------------ */
const usosPorIp = new Map<string, number[]>();
const cache = new Map<string, BuscaInterpretada>();
let usosHoje = { dia: "", total: 0 };

function diaDeHoje(): string {
  return new Date().toISOString().slice(0, 10);
}

/** True quando ESTA chamada pode acontecer. Já contabiliza o uso. */
function podeChamar(ip: string): { ok: true } | { ok: false; motivo: string } {
  const agora = Date.now();

  const hoje = diaDeHoje();
  if (usosHoje.dia !== hoje) usosHoje = { dia: hoje, total: 0 };
  if (usosHoje.total >= LIMITE_DIA) {
    return { ok: false, motivo: "teto diário atingido" };
  }

  const recentes = (usosPorIp.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  if (recentes.length >= LIMITE_IP) {
    return { ok: false, motivo: "muitas buscas seguidas" };
  }

  recentes.push(agora);
  usosPorIp.set(ip, recentes);
  usosHoje.total += 1;

  // Poda preguiçosa: sem isso o Map cresce pra sempre com IP que passou uma
  // vez e nunca mais voltou.
  if (usosPorIp.size > 5_000) {
    for (const [k, v] of usosPorIp) {
      if (v.every((t) => agora - t >= JANELA_MS)) usosPorIp.delete(k);
    }
  }

  return { ok: true };
}

const normalizar = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");

/* ------------------------------------------------------------------ */

const respostaSchema = z.object({
  modalidade: z.string().nullable(),
  regiao: z.string().nullable(),
  entendimento: z.string().max(200),
  observacao: z.string().max(300).nullable(),
});

/**
 * A GUARDA. Recebe o texto bruto que o modelo devolveu e só deixa passar o
 * que existe de verdade no banco.
 *
 * Está separada e exportada de propósito: é a parte que precisa de teste, e
 * testar ela exigindo chave de API seria transformar a regra mais importante
 * do arquivo na menos testada.
 *
 * Devolve `null` quando o retorno é inutilizável (JSON quebrado, formato
 * errado, ou nenhum filtro aproveitável).
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

  // Valor que não está na lista do banco é DESCARTADO, não repassado.
  // Confiar no retorno do modelo aqui seria filtrar por algo que não existe
  // e mostrar tela vazia com cara de site quebrado.
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
  const chave = process.env.ANTHROPIC_API_KEY?.trim();
  if (!chave) return null;

  const texto = textoBruto.trim().slice(0, MAX_ENTRADA);
  if (texto.length < 3) return null;

  const chaveCache = `${normalizar(texto)}::${facetas.modalidades.length}:${facetas.regioes.length}`;
  const emCache = cache.get(chaveCache);
  if (emCache) return emCache;

  const permissao = podeChamar(ip);
  if (!permissao.ok) {
    console.info(`[ia] chamada barrada: ${permissao.motivo}`);
    return null;
  }

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controle.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": chave,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 400,
        system: montarPrompt(facetas),
        messages: [{ role: "user", content: texto }],
      }),
    });

    if (!resp.ok) {
      console.error(`[ia] API respondeu ${resp.status}`);
      return null;
    }

    const dados = (await resp.json()) as {
      content?: { type: string; text?: string }[];
    };
    const bruto = dados.content?.find((c) => c.type === "text")?.text ?? "";

    const resultado = validarInterpretacao(bruto, facetas);
    if (!resultado) {
      console.error("[ia] resposta fora do formato esperado");
      return null;
    }

    cache.set(chaveCache, resultado);
    if (cache.size > 200) cache.delete(cache.keys().next().value as string);

    return resultado;
  } catch (erro) {
    console.error(
      "[ia] falha ao interpretar:",
      erro instanceof Error ? erro.message : erro,
    );
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

/** Diagnóstico pro /admin — mesma ideia do statusEmail(). */
export function statusIa(): { ligada: boolean; modelo: string; usosHoje: number; tetoDia: number } {
  return {
    ligada: iaDisponivel(),
    modelo: MODELO,
    usosHoje: usosHoje.dia === diaDeHoje() ? usosHoje.total : 0,
    tetoDia: LIMITE_DIA,
  };
}
