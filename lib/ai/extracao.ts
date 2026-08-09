import { z } from "zod";
import { Balde, fornecedor, normalizar } from "@/lib/ai";
import { REGIOES_COM_OUTRA } from "@/lib/regioes";

/**
 * CADASTRO DE PARCEIRO EM 30 SEGUNDOS.
 *
 * O problema: cadastrar uma comunidade é um formulário de nove campos, e o
 * organizador já escreveu tudo isso — na bio do Instagram, no convite do grupo
 * de WhatsApp. Copiar campo a campo é a fricção que faz o cadastro não
 * acontecer.
 *
 * O que esta camada faz: lê o texto colado e PROPÕE o preenchimento. Só isso.
 *
 * ── A REGRA QUE MANDA: a IA propõe, a pessoa decide ─────────────────────
 *
 * Nada aqui escreve no banco. `extrairComunidade` é uma função pura sobre o
 * texto — devolve uma sugestão que vai PRÉ-PREENCHER o formulário que já
 * existe, e é o humano que revisa e clica em salvar, pela mesma action de
 * sempre. Não há caminho de código daqui até uma comunidade publicada.
 *
 * Isso não é escrúpulo: a regra 3 do projeto proíbe publicar nome de parceiro
 * real sem autorização assinada. Uma IA que cadastrasse sozinha transformaria
 * um texto colado da internet numa afirmação pública da MUNAY.
 *
 * ── GROUNDED: só valores que existem ────────────────────────────────────
 *
 * Modalidade e região são validadas contra o banco (as facetas) e contra
 * `lib/regioes.ts`. Valor fora da lista vira `null` e o campo fica vazio pro
 * humano preencher — nunca um chute plausível, que é justamente o erro que
 * passaria despercebido na revisão.
 */

const MAX_ENTRADA = 2_000;

/** Balde EXCLUSIVO do cadastro assistido — não divide cota com a busca. */
const BALDE = new Balde({
  nome: "cadastro-assistido",
  // Menor que a busca: é operação de admin, feita algumas vezes por sessão.
  limiteIp: 20,
  janelaMs: 10 * 60 * 1000,
  limiteDia: Number(process.env.IA_LIMITE_DIA_CADASTRO) || 100,
  tamanhoCache: 50,
});

export type SugestaoComunidade = {
  nome: string | null;
  modalidade: string | null;
  regiao: string | null;
  descricao: string | null;
  horarios: string | null;
  local: string | null;
  nivel: string | null;
  /** O que a IA não conseguiu extrair — mostrado pra pessoa saber o que revisar. */
  observacao: string | null;
};

export type FacetasCadastro = { modalidades: string[] };

const respostaSchema = z.object({
  nome: z.string().nullable(),
  modalidade: z.string().nullable(),
  regiao: z.string().nullable(),
  descricao: z.string().nullable(),
  horarios: z.string().nullable(),
  local: z.string().nullable(),
  nivel: z.string().nullable(),
  observacao: z.string().nullable(),
});

/** Corta texto livre no limite do campo do banco, sem cortar no meio de palavra. */
function limitar(v: string | null, max: number): string | null {
  if (!v) return null;
  const t = v.trim();
  if (!t) return null;
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/**
 * A GUARDA. Exportada e testável sem chave de API, pelo mesmo motivo da busca:
 * a regra mais importante do arquivo não pode ser a menos testada.
 *
 * Devolve `null` quando o retorno é inutilizável. Campos fora das listas viram
 * `null` — o formulário mostra vazio e o humano preenche.
 */
export function validarSugestao(
  bruto: string,
  facetas: FacetasCadastro,
): SugestaoComunidade | null {
  const json = bruto.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

  let analisado;
  try {
    analisado = respostaSchema.safeParse(JSON.parse(json));
  } catch {
    return null;
  }
  if (!analisado.success) return null;
  const d = analisado.data;

  const naLista = (v: string | null, lista: readonly string[]) =>
    v && lista.includes(v) ? v : null;

  return {
    nome: limitar(d.nome, 120),
    // Modalidade aceita valor NOVO? Não. O catálogo vem do banco, e inventar
    // "Crossfit" onde só existe "Funcional" cria uma modalidade órfã que não
    // aparece em filtro nenhum — o mesmo bug da busca, do outro lado.
    modalidade: naLista(d.modalidade, facetas.modalidades),
    regiao: naLista(d.regiao, REGIOES_COM_OUTRA),
    descricao: limitar(d.descricao, 2000),
    horarios: limitar(d.horarios, 200),
    local: limitar(d.local, 200),
    nivel: limitar(d.nivel, 80),
    observacao: limitar(d.observacao, 300),
  };
}

function montarPrompt(facetas: FacetasCadastro): string {
  return `Você ajuda a equipe da MUNAY a cadastrar comunidades esportivas e culturais de Brasília a partir de um texto que o organizador já escreveu (bio de Instagram, convite de grupo de WhatsApp, mensagem solta).

Sua tarefa: LER o texto e extrair o que estiver EXPLÍCITO nele. Você NÃO inventa e NÃO deduz o que não está escrito.

MODALIDADES DISPONÍVEIS (use exatamente esta grafia):
${facetas.modalidades.map((m) => `- ${m}`).join("\n")}

REGIÕES DISPONÍVEIS (use exatamente esta grafia):
${REGIOES_COM_OUTRA.map((r) => `- ${r}`).join("\n")}

Regras:
- Campo que o texto não informa: devolva null. Null é a resposta certa quando não há informação — não chute.
- "modalidade" e "regiao" só podem sair das listas acima, com a grafia exata. Se o que o texto diz não estiver na lista, devolva null e explique em "observacao".
- "nome" é como a comunidade se chama, não a descrição dela.
- "horarios" é quando acontece, em texto curto. Ex.: "Terças e quintas, 6h".
- "local" é onde acontece. Ex.: "Parque da Cidade, entrada 3".
- "nivel" é pra quem serve. Ex.: "Iniciante" ou "Todos os níveis".
- "descricao" é um resumo curto e factual do que a comunidade faz, em pt-BR, baseado SÓ no texto.
- "observacao" é o que você não conseguiu extrair ou o que ficou ambíguo, pra pessoa revisar. Null se estiver tudo claro.

Responda SOMENTE com JSON válido, sem markdown:
{"nome": string|null, "modalidade": string|null, "regiao": string|null, "descricao": string|null, "horarios": string|null, "local": string|null, "nivel": string|null, "observacao": string|null}`;
}

/**
 * Extrai uma sugestão do texto colado. `null` quando não dá pra confiar — e aí
 * a tela mostra o formulário em branco, que é o que existia antes.
 */
export async function extrairComunidade(
  textoBruto: string,
  facetas: FacetasCadastro,
  ip: string,
): Promise<SugestaoComunidade | null> {
  const provedor = fornecedor();
  if (!provedor.disponivel()) return null;

  const texto = textoBruto.trim().slice(0, MAX_ENTRADA);
  if (texto.length < 20) return null;

  const chaveCache = `${normalizar(texto)}::${facetas.modalidades.length}`;
  const emCache = BALDE.lerCache<SugestaoComunidade>(chaveCache);
  if (emCache) return emCache;

  const permissao = BALDE.podeChamar(ip);
  if (!permissao.ok) {
    console.info(`[ai:cadastro] chamada barrada: ${permissao.motivo}`);
    return null;
  }

  const bruto = await provedor.gerar({
    sistema: montarPrompt(facetas),
    usuario: texto,
    maxTokens: 700,
  });
  if (bruto === null) return null;

  const sugestao = validarSugestao(bruto, facetas);
  if (!sugestao) {
    console.error("[ai:cadastro] resposta fora do formato esperado");
    return null;
  }

  BALDE.guardarCache(chaveCache, sugestao);
  return sugestao;
}

/** Só para teste: zera tetos e cache entre casos. */
export function zerarTetosDoCadastro(): void {
  BALDE.zerar();
}
