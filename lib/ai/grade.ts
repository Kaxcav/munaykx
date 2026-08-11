import { z } from "zod";
import { Balde, fornecedor, normalizar } from "@/lib/ai";
import { REGIOES_COM_OUTRA } from "@/lib/regioes";
import {
  DIAS,
  LIMITE_HORARIOS,
  hhmmParaMinutos,
  minutosParaHHMM,
} from "@/lib/horarios";

/**
 * NORMALIZADOR DE GRADE — "segunda e quarta 6h30" vira dado estruturado.
 *
 * ── Por que este arquivo existe, se já há extração de cadastro ───────────
 *
 * `lib/ai/extracao.ts` (o cadastro em 30s) já lê texto colado e propõe os
 * campos da comunidade. Mas ele devolve `horarios` como TEXTO LIVRE, que é o
 * que a página exibe e nada mais. O eixo de tempo do `/mapa` não roda em cima
 * de texto: roda em cima de `HorarioRecorrente` (dia da semana + minuto), e
 * hoje esse dado só existe se o organizador abrir a sub-rota de horários e
 * cadastrar linha por linha, até 21 vezes.
 *
 * Ou seja: a comunidade que escreve "toda terça e quinta 6h15" está no site e
 * **fora do filtro por horário**. Este arquivo fecha exatamente essa distância
 * — e só ela. Não refaz a extração de comunidade.
 *
 * ── A REGRA QUE MANDA: a IA propõe, a pessoa decide ─────────────────────
 *
 * Nada aqui escreve no banco. Não há import de `prisma`, e há teste estrutural
 * que fica vermelho se um aparecer. A sugestão vai PRÉ-PREENCHER as linhas do
 * formulário que já existe, e cada linha só vira registro quando o organizador
 * clica em adicionar — pela `adicionarHorario` de sempre, que é owner-scoped.
 *
 * Isso não é excesso de zelo: horário recorrente ACENDE A RA NO MAPA PÚBLICO.
 * Uma IA que gravasse sozinha publicaria, em nome de um parceiro real, um
 * horário que ninguém conferiu.
 *
 * ── GROUNDED: o modelo não inventa dia, hora nem região ─────────────────
 *
 * O modelo devolve números e strings; quem decide o que é válido é o código:
 * dia tem que ser 0–6, hora tem que passar pelo mesmo `hhmmParaMinutos` do
 * formulário manual, e região tem que ser uma das 35 RAs (ou "Outra região").
 * Item que não passa é DESCARTADO, não corrigido — sugestão errada com cara de
 * certa é pior que linha faltando, porque o vazio pede revisão e o chute passa.
 */

const MAX_ENTRADA = 1_500;

/**
 * Balde EXCLUSIVO da normalização de grade.
 *
 * Teto próprio por feature é regra do `lib/ai/tetos.ts`: um balde compartilhado
 * faz a feature barulhenta consumir a cota da silenciosa, e o sintoma aparece
 * na errada. Esta roda no painel do organizador — algumas vezes por cadastro,
 * não continuamente como a busca pública.
 */
const BALDE = new Balde({
  nome: "normaliza-grade",
  limiteIp: 15,
  janelaMs: 10 * 60 * 1000,
  limiteDia: Number(process.env.IA_LIMITE_DIA_GRADE) || 120,
  tamanhoCache: 50,
});

/** Uma linha sugerida, já no formato que o formulário manual consome. */
export type ItemGrade = {
  diaSemana: number;
  /** "HH:MM" — a mesma forma do `<input type="time">` da tela. */
  horaInicio: string;
  horaFim: string | null;
  /** RA da ocorrência, só quando o texto disser uma diferente. `null` = a da comunidade. */
  regiao: string | null;
  /** Rótulo pronto ("Segunda, 6h30"), para a pessoa conferir sem decorar índice. */
  rotulo: string;
};

export type SugestaoGrade = {
  itens: ItemGrade[];
  /** O que ficou ambíguo ou não coube — mostrado para a pessoa revisar. */
  observacao: string | null;
  /** Quantas linhas o modelo mandou e o código recusou. Aparece na tela. */
  descartados: number;
};

const itemSchema = z.object({
  diaSemana: z.number(),
  horaInicio: z.string(),
  horaFim: z.string().nullable().optional(),
  regiao: z.string().nullable().optional(),
});

const respostaSchema = z.object({
  itens: z.array(itemSchema).max(60),
  observacao: z.string().nullable(),
});

function limitar(v: string | null, max: number): string | null {
  if (!v) return null;
  const t = v.trim();
  if (!t) return null;
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/**
 * A GUARDA. Exportada e testável sem chave de API — pelo mesmo motivo do resto
 * do `lib/ai/`: a regra mais importante do arquivo não pode ser a menos testada.
 *
 * Devolve `null` só quando a resposta é inutilizável (não é JSON, ou não tem a
 * forma esperada). Resposta legível com zero item válido devolve `itens: []`,
 * que é diferente: aí a tela diz "não consegui entender" e mostra o formulário
 * manual, em vez de sumir sem explicação.
 */
export function validarGrade(bruto: string): SugestaoGrade | null {
  const json = bruto.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

  let analisado;
  try {
    analisado = respostaSchema.safeParse(JSON.parse(json));
  } catch {
    return null;
  }
  if (!analisado.success) return null;

  const itens: ItemGrade[] = [];
  // Chave de deduplicação: dia + minuto. "segunda e quarta, 6h30, e também
  // segunda 6h30" é o texto real de gente escrevendo depressa — cadastrar duas
  // vezes o mesmo treino duplicaria a comunidade no scrubber do mapa.
  const vistos = new Set<string>();
  let descartados = 0;

  for (const bruto of analisado.data.itens) {
    if (itens.length >= LIMITE_HORARIOS) {
      descartados += 1;
      continue;
    }

    const dia = bruto.diaSemana;
    // `Number.isInteger` porque 2.5 passaria em `>= 0 && <= 6` e viraria índice
    // inválido lá na frente, onde o erro não teria mais nome.
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
      descartados += 1;
      continue;
    }

    // Mesma função do formulário manual: uma fonte de verdade para "que horas
    // é isso". Se o parser mudar, muda para os dois caminhos junto.
    const minutoInicio = hhmmParaMinutos(bruto.horaInicio ?? "");
    if (minutoInicio === null) {
      descartados += 1;
      continue;
    }

    let minutoFim: number | null = null;
    if (bruto.horaFim) {
      minutoFim = hhmmParaMinutos(bruto.horaFim);
      // Fim inválido ou antes do início: joga só o FIM fora, não a linha. A
      // hora de começar é o dado que importa, e `minutoFim` já é anulável no
      // schema (a duração padrão cobre).
      if (minutoFim === null || minutoFim <= minutoInicio) minutoFim = null;
    }

    const chave = `${dia}:${minutoInicio}`;
    if (vistos.has(chave)) {
      descartados += 1;
      continue;
    }
    vistos.add(chave);

    const regiao =
      bruto.regiao && REGIOES_COM_OUTRA.includes(bruto.regiao)
        ? bruto.regiao
        : null;

    const horaInicio = minutosParaHHMM(minutoInicio);
    itens.push({
      diaSemana: dia,
      horaInicio,
      horaFim: minutoFim === null ? null : minutosParaHHMM(minutoFim),
      regiao,
      rotulo: `${DIAS[dia]?.nome ?? "?"}, ${horaInicio}`,
    });
  }

  // Ordem de leitura humana: domingo → sábado, cedo → tarde. A mesma da lista
  // de horários já cadastrados, para as duas seções da tela baterem.
  itens.sort((a, b) =>
    a.diaSemana === b.diaSemana
      ? a.horaInicio.localeCompare(b.horaInicio)
      : a.diaSemana - b.diaSemana,
  );

  return {
    itens,
    observacao: limitar(analisado.data.observacao, 300),
    descartados,
  };
}

function montarPrompt(): string {
  return `Você ajuda organizadores de comunidades esportivas e culturais de Brasília a transformar em dado estruturado o horário que eles escreveram em texto solto (bio de Instagram, mensagem de grupo, recado no WhatsApp).

Sua tarefa: LER o texto e listar CADA ocorrência semanal que estiver EXPLÍCITA nele. Você NÃO inventa e NÃO deduz o que não está escrito.

DIAS DA SEMANA (use o número):
${DIAS.map((d) => `- ${d.indice} = ${d.nome}`).join("\n")}

REGIÕES DISPONÍVEIS (use exatamente esta grafia, e SÓ quando o texto disser que aquele dia acontece em região diferente do resto):
${REGIOES_COM_OUTRA.map((r) => `- ${r}`).join("\n")}

Regras:
- Um item por DIA. "Segunda e quarta às 6h30" são DOIS itens, não um.
- "horaInicio" e "horaFim" em 24h, no formato "HH:MM". "6h30" é "06:30". "18h" é "18:00".
- "horaFim" só quando o texto disser quando termina. Não invente duração — devolva null.
- "regiao" quase sempre é null. Só preencha quando o texto disser explicitamente que AQUELE dia é em outro lugar (grupo itinerante). Se o que o texto diz não estiver na lista acima, devolva null e diga em "observacao".
- Texto sem nenhum horário claro: devolva "itens" como lista vazia. Lista vazia é a resposta certa quando não há informação — não chute.
- Não repita o mesmo dia e hora duas vezes.
- "observacao" é o que ficou ambíguo ou o que você não conseguiu transformar, em pt-BR curto, para a pessoa revisar. Null se estiver tudo claro.

Responda SOMENTE com JSON válido, sem markdown:
{"itens": [{"diaSemana": number, "horaInicio": "HH:MM", "horaFim": "HH:MM"|null, "regiao": string|null}], "observacao": string|null}`;
}

/**
 * Lê o texto e propõe a grade. `null` quando não dá para confiar — e aí a tela
 * mostra o formulário manual de sempre, que é o que existia antes desta
 * feature. Fail-safe: IA fora do ar, teto estourado ou resposta ilegível
 * degradam para o caminho manual, nunca para erro na cara do organizador.
 */
export async function normalizarGrade(
  textoBruto: string,
  ip: string,
): Promise<SugestaoGrade | null> {
  const provedor = fornecedor();
  if (!provedor.disponivel()) return null;

  const texto = textoBruto.trim().slice(0, MAX_ENTRADA);
  if (texto.length < 6) return null;

  const chaveCache = normalizar(texto);
  const emCache = BALDE.lerCache<SugestaoGrade>(chaveCache);
  if (emCache) return emCache;

  const permissao = BALDE.podeChamar(ip);
  if (!permissao.ok) {
    console.info(`[ai:grade] chamada barrada: ${permissao.motivo}`);
    return null;
  }

  const bruto = await provedor.gerar({
    sistema: montarPrompt(),
    usuario: texto,
    maxTokens: 700,
  });
  if (bruto === null) return null;

  const sugestao = validarGrade(bruto);
  if (!sugestao) {
    console.error("[ai:grade] resposta fora do formato esperado");
    return null;
  }

  BALDE.guardarCache(chaveCache, sugestao);
  return sugestao;
}

/** Só para teste: zera tetos e cache entre casos. */
export function zerarTetosDaGrade(): void {
  BALDE.zerar();
}
