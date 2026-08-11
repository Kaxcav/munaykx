import { z } from "zod";
import { Balde, fornecedor } from "@/lib/ai";

/**
 * FLYER → EVENTO (IA com visão).
 *
 * O organizador manda o print do story/cartaz do Instagram e a IA LÊ a imagem e
 * PROPÕE os campos do evento — título, data, hora, local, modalidade. A oferta
 * de Brasília vive como imagem no Insta; isto encurta o caminho da imagem até a
 * vitrine.
 *
 * ── A REGRA QUE MANDA: a IA propõe, o humano decide ─────────────────────
 *
 * Nada aqui escreve no banco. A extração devolve uma SUGESTÃO que vai
 * PRÉ-PREENCHER o formulário de novo evento que já existe (o mesmo do "marcar o
 * próximo treino"), e é o organizador que revisa e clica em salvar, pela action
 * de sempre. **NÃO há caminho de código daqui até um evento publicado** — e não
 * pode haver: um flyer é conteúdo de terceiro, e publicar sozinho seria a MUNAY
 * afirmando um evento que ninguém conferiu.
 *
 * ── GROUNDED: só o que a imagem mostra, e modalidade da lista real ──────
 *
 * Campo que o cartaz não mostra vira `null` e o formulário fica vazio pro humano
 * preencher — nunca um chute plausível (o erro que passa despercebido na
 * revisão). Modalidade é validada contra a lista real; fora dela → null.
 *
 * ── CUSTO E TAMANHO: teto próprio + limite de imagem ────────────────────
 *
 * Balde EXCLUSIVo (não divide cota com busca/cadastro/copiloto) e a imagem tem
 * teto de tamanho e allowlist de formato ANTES de virar chamada paga.
 */

/** Formatos que a Messages API aceita como imagem. */
export const TIPOS_IMAGEM = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export type TipoImagem = (typeof TIPOS_IMAGEM)[number];

export function mediaTypeValido(tipo: string): tipo is TipoImagem {
  return (TIPOS_IMAGEM as readonly string[]).includes(tipo);
}

/** Teto de tamanho da imagem: 5 MB. Acima disso a API já recusaria, e é gente
 *  mandando arquivo grande sem querer — barra antes de virar upload/chamada. */
export const MAX_BYTES_IMAGEM = 5 * 1024 * 1024;

/** Balde EXCLUSIVO do flyer. Baixo: é operação de organizador, poucas por sessão,
 *  e visão custa mais que texto — o teto protege a carteira. */
const BALDE = new Balde({
  nome: "flyer-evento",
  limiteIp: 10,
  janelaMs: 10 * 60 * 1000,
  limiteDia: Number(process.env.IA_LIMITE_DIA_FLYER) || 60,
  tamanhoCache: 30,
});

export type SugestaoEvento = {
  titulo: string | null;
  /** Data do evento em "YYYY-MM-DD", ou null se o cartaz não mostra. */
  dataISO: string | null;
  /** Hora em "HH:MM" (24h), ou null. */
  hora: string | null;
  local: string | null;
  modalidade: string | null;
  /** O que ficou ambíguo/não deu pra extrair — pra pessoa revisar. */
  observacao: string | null;
};

export type FacetasFlyer = { modalidades: string[] };

const respostaSchema = z.object({
  titulo: z.string().nullable(),
  dataISO: z.string().nullable(),
  hora: z.string().nullable(),
  local: z.string().nullable(),
  modalidade: z.string().nullable(),
  observacao: z.string().nullable(),
});

function limitar(v: string | null, max: number): string | null {
  if (!v) return null;
  const t = v.trim();
  if (!t) return null;
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** "2026-09-15" válido? (data de calendário real, não só formato). */
export function dataISOValida(v: string | null): string | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null; // 31/02 etc.
  if (ano < 2020 || ano > 2100) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** "6h" não; "06:15" sim. Normaliza "6:5" → null (exige HH:MM de 2 dígitos). */
export function horaValida(v: string | null): string | null {
  if (!v) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/**
 * A GUARDA. Exportada e testável sem chave de API — a regra mais importante do
 * arquivo não pode ser a menos testada. Campos fora do válido viram `null`.
 */
export function validarSugestaoEvento(
  bruto: string,
  facetas: FacetasFlyer,
): SugestaoEvento | null {
  const json = bruto.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

  let analisado;
  try {
    analisado = respostaSchema.safeParse(JSON.parse(json));
  } catch {
    return null;
  }
  if (!analisado.success) return null;
  const d = analisado.data;

  return {
    titulo: limitar(d.titulo, 160),
    dataISO: dataISOValida(d.dataISO),
    hora: horaValida(d.hora),
    local: limitar(d.local, 200),
    // Modalidade só da lista real (grafia exata). Fora dela → null: modalidade
    // inventada não casa com comunidade nenhuma do organizador.
    modalidade: d.modalidade && facetas.modalidades.includes(d.modalidade) ? d.modalidade : null,
    observacao: limitar(d.observacao, 300),
  };
}

/** Combina data+hora no formato do `<input type="datetime-local">`. Sem data,
 *  string vazia (o campo fica em branco). Sem hora, assume 00:00 e a observação
 *  avisa — o organizador confere. */
export function montarStartsAt(dataISO: string | null, hora: string | null): string {
  if (!dataISO) return "";
  return `${dataISO}T${hora ?? "00:00"}`;
}

/** Escolhe a comunidade do organizador cuja modalidade casa com a do cartaz.
 *  Sem casar (ou sem modalidade), devolve null e o form usa o default. */
export function escolherComunidadeSlug(
  modalidade: string | null,
  comunidades: { slug: string; modalidade: string }[],
): string | null {
  if (!modalidade) return null;
  const alvo = modalidade.toLowerCase();
  return comunidades.find((c) => c.modalidade.toLowerCase() === alvo)?.slug ?? null;
}

/** Hash barato pra cache — não vale trazer crypto só pra isso, e colisão aqui
 *  só significa não reaproveitar o cache, nunca vazar entre imagens. */
function hashLeve(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i += 997) h = (h * 33) ^ s.charCodeAt(i);
  return `${s.length}:${h >>> 0}`;
}

function montarPrompt(facetas: FacetasFlyer, hojeISO: string): string {
  return `Você ajuda organizadores da MUNAY a cadastrar um evento esportivo ou cultural de Brasília a partir de uma IMAGEM (print de story do Instagram, cartaz, flyer).

Sua tarefa: LER a imagem e extrair o que estiver EXPLÍCITO nela. Você NÃO inventa e NÃO deduz o que não está escrito.

Hoje é ${hojeISO} (use só para inferir o ANO quando o cartaz mostra dia e mês mas não o ano — assuma a próxima ocorrência futura, e diga isso em "observacao").

MODALIDADES DISPONÍVEIS (use exatamente esta grafia):
${facetas.modalidades.map((m) => `- ${m}`).join("\n")}

Regras:
- Campo que a imagem não informa: devolva null. Null é a resposta certa quando não há informação — não chute.
- "titulo": o nome do evento como aparece no cartaz.
- "dataISO": a data do evento em "AAAA-MM-DD". Se o cartaz não mostra data, null. Se mostra dia/mês sem ano, assuma o próximo ano futuro e explique em "observacao".
- "hora": a hora de início em "HH:MM" (24h). Ex.: "19:00", "06:15". Sem hora, null.
- "local": onde acontece, como no cartaz. Ex.: "Parque da Cidade, portão 3".
- "modalidade": só pode sair da lista acima, com a grafia exata. Se o que o cartaz sugere não estiver na lista, null e explique em "observacao".
- "observacao": o que ficou ambíguo, ilegível ou que você não conseguiu extrair, pra pessoa revisar. Null se estiver tudo claro.

Responda SOMENTE com JSON válido, sem markdown:
{"titulo": string|null, "dataISO": string|null, "hora": string|null, "local": string|null, "modalidade": string|null, "observacao": string|null}`;
}

export type EntradaFlyer = {
  /** Base64 puro (sem prefixo data:). */
  base64: string;
  mediaType: string;
  facetas: FacetasFlyer;
  ip: string;
  /** "YYYY-MM-DD" de hoje (Brasília), para inferência de ano. */
  hojeISO: string;
};

/**
 * Extrai a sugestão de evento de um flyer. `null` quando não dá pra confiar —
 * e aí a tela mostra o formulário em branco (nada foi salvo, nada quebrou).
 */
export async function extrairEventoDeFlyer(
  entrada: EntradaFlyer,
): Promise<SugestaoEvento | null> {
  const provedor = fornecedor();
  if (!provedor.disponivel()) return null;
  if (!mediaTypeValido(entrada.mediaType)) return null;
  if (!entrada.base64) return null;

  const chaveCache = hashLeve(entrada.base64);
  const emCache = BALDE.lerCache<SugestaoEvento>(chaveCache);
  if (emCache) return emCache;

  const permissao = BALDE.podeChamar(entrada.ip);
  if (!permissao.ok) {
    console.info(`[ai:flyer] chamada barrada: ${permissao.motivo}`);
    return null;
  }

  const bruto = await provedor.gerar({
    sistema: montarPrompt(entrada.facetas, entrada.hojeISO),
    usuario:
      "Extraia os campos do evento desta imagem e responda só o JSON pedido.",
    imagem: { dados: entrada.base64, mediaType: entrada.mediaType },
    maxTokens: 500,
    // Visão pede mais folga que a busca de texto.
    timeoutMs: 20_000,
  });
  if (bruto === null) return null;

  const sugestao = validarSugestaoEvento(bruto, entrada.facetas);
  if (!sugestao) {
    console.error("[ai:flyer] resposta fora do formato esperado");
    return null;
  }

  BALDE.guardarCache(chaveCache, sugestao);
  return sugestao;
}

/** Só para teste: zera teto e cache entre casos. */
export function zerarTetosDoFlyer(): void {
  BALDE.zerar();
}
