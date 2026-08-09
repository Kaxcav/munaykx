import { z } from "zod";
import { prisma } from "@/lib/db";
import { Balde, fornecedor, normalizar } from "@/lib/ai";

/**
 * COPILOTO DO ORGANIZADOR (ideia #4).
 *
 * O organizador pergunta em português — "quantas pessoas faltaram nas últimas
 * 3 semanas?", "qual meu evento com mais presença?" — e recebe o número do
 * painel dele, sem mexer em filtro nem exportar planilha.
 *
 * ── O DESENHO INTEIRO EXISTE PRA EVITAR UMA COISA: text-to-SQL ──────────
 *
 * A IA **não escreve query e não escolhe dado**. Ela faz uma única coisa:
 * mapear a pergunta para UMA de um conjunto FIXO de intenções, definido aqui
 * embaixo, mais parâmetros numéricos com limite. Quem consulta o banco é o
 * CÓDIGO, com Prisma parametrizado.
 *
 * Isso não é preferência de estilo. Um modelo que escreve SQL num sistema
 * multi-inquilino é um furo de dados esperando prompt: basta a pergunta certa
 * pra ele consultar o evento de outro organizador. Aqui isso é impossível por
 * construção — não existe caminho onde texto do modelo vire cláusula.
 *
 * ── ESCOPO POR DONO: no código, nunca na IA ─────────────────────────────
 *
 * Todo executor recebe `userId` como PRIMEIRO argumento, lido da sessão no
 * servidor, e filtra por `daPessoa(userId)`. A IA nunca vê, nunca escolhe e
 * nunca influencia de quem é o dado. Se o modelo devolvesse `userId`, ele
 * seria ignorado — o parâmetro nem existe no schema das intenções.
 *
 * ── OS NÚMEROS NÃO PASSAM PELO MODELO ───────────────────────────────────
 *
 * A resposta em texto é montada por TEMPLATE, com os números que o Prisma
 * devolveu. É um desvio do pedido original ("a IA formata a resposta"), e o
 * motivo é forte: número que passa por modelo pode voltar arredondado,
 * traduzido ou trocado, e ninguém confere resposta de painel. Formatar em
 * código torna alucinação de número impossível — e ainda corta metade do
 * custo, porque é uma chamada em vez de duas.
 *
 * ── LGPD ────────────────────────────────────────────────────────────────
 *
 * Opera só sobre o que o organizador JÁ vê no painel: agregados dos eventos
 * dele. Nenhuma intenção devolve nome, e-mail ou WhatsApp de inscrito — a
 * lista nominal continua onde sempre esteve, na tela de inscritos.
 */

const MAX_ENTRADA = 200;

/** Balde EXCLUSIVO do copiloto — não divide cota com busca, cadastro ou semana. */
const BALDE = new Balde({
  nome: "copiloto",
  limiteIp: 20,
  janelaMs: 10 * 60 * 1000,
  limiteDia: Number(process.env.IA_LIMITE_DIA_COPILOTO) || 200,
  tamanhoCache: 100,
});

/** O filtro de dono. Igual ao de `lib/organizacao.ts`, aplicado em todo executor. */
const daPessoa = (userId: string) => ({
  organization: { membros: { some: { userId } } },
});

function diasAtras(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

export type Resposta = {
  /** A frase pronta, montada por template com os números do banco. */
  texto: string;
  /** A intenção que atendeu — aparece na UI pra pessoa saber o que foi lido. */
  intencao: Chave;
  /** Os números crus, pra UI mostrar sem depender de parsing do texto. */
  dados: Record<string, number | string | null>;
};

const semanasSchema = z.object({
  semanas: z.number().int().min(1).max(52).default(3),
});
const diasSchema = z.object({
  dias: z.number().int().min(1).max(365).default(30),
});
const semParametro = z.object({});

/**
 * O CONJUNTO FIXO DE INTENÇÕES.
 *
 * Cada uma foi conferida contra o schema antes de entrar: só existe intenção
 * que os dados do painel realmente respondem. `presença` depende de
 * `Rsvp.checkinEm`, que a tela de inscritos já preenche; `faltas` depende do
 * mesmo campo — por isso as duas avisam quando o organizador ainda não marcou
 * presença em nenhum evento, em vez de devolver um número que parece dado e é
 * ausência de dado.
 */
export const INTENCOES = {
  proximos_eventos: {
    descricao: "Quais são meus próximos eventos e quantos inscritos cada um tem.",
    exemplos: ["quais são meus próximos eventos", "quantos inscritos tenho pra semana que vem"],
    schema: semParametro,
    executar: async (userId: string) => {
      const eventos = await prisma.event.findMany({
        where: {
          community: daPessoa(userId),
          ativo: true,
          canceladoEm: null,
          startsAt: { gte: new Date() },
        },
        orderBy: { startsAt: "asc" },
        take: 5,
        select: {
          titulo: true,
          startsAt: true,
          _count: { select: { rsvps: { where: { canceledAt: null, status: "confirmado" } } } },
        },
      });

      if (eventos.length === 0) {
        return {
          texto: "Você não tem nenhum evento futuro publicado agora.",
          dados: { eventos: 0 },
        };
      }

      const linhas = eventos
        .map(
          (e) =>
            `• ${e.titulo} — ${e.startsAt.toLocaleDateString("pt-BR")}: ${e._count.rsvps} confirmado(s)`,
        )
        .join("\n");
      return {
        texto: `Seus próximos ${eventos.length === 1 ? "evento" : `${eventos.length} eventos`}:\n${linhas}`,
        dados: { eventos: eventos.length },
      };
    },
  },

  inscritos_no_periodo: {
    descricao: "Quantas pessoas se inscreveram nos últimos N dias.",
    exemplos: ["quantas inscrições tive esse mês", "quantos se inscreveram nos últimos 7 dias"],
    schema: diasSchema,
    executar: async (userId: string, p: { dias: number }) => {
      const total = await prisma.rsvp.count({
        where: {
          event: { community: daPessoa(userId) },
          createdAt: { gte: diasAtras(p.dias) },
          canceledAt: null,
        },
      });
      return {
        texto:
          total === 0
            ? `Ninguém se inscreveu nos seus eventos nos últimos ${p.dias} dias.`
            : `${total} pessoa(s) se inscreveram nos seus eventos nos últimos ${p.dias} dias.`,
        dados: { total, dias: p.dias },
      };
    },
  },

  faltas_ultimas_semanas: {
    descricao:
      "Quantas pessoas confirmaram presença e não apareceram (não tiveram check-in) nos eventos que já aconteceram nas últimas N semanas.",
    exemplos: ["quantas pessoas faltaram nas últimas 3 semanas", "teve muito no-show esse mês"],
    schema: semanasSchema,
    executar: async (userId: string, p: { semanas: number }) => {
      const desde = diasAtras(p.semanas * 7);
      const base = {
        event: {
          community: daPessoa(userId),
          startsAt: { gte: desde, lt: new Date() },
        },
        canceledAt: null,
        status: "confirmado" as const,
      };

      const [confirmados, presentes, eventosComCheckin] = await Promise.all([
        prisma.rsvp.count({ where: base }),
        prisma.rsvp.count({ where: { ...base, checkinEm: { not: null } } }),
        prisma.event.count({
          where: {
            community: daPessoa(userId),
            startsAt: { gte: desde, lt: new Date() },
            rsvps: { some: { checkinEm: { not: null } } },
          },
        }),
      ]);

      if (confirmados === 0) {
        return {
          texto: `Nenhum evento seu com inscritos aconteceu nas últimas ${p.semanas} semanas.`,
          dados: { confirmados: 0, presentes: 0, faltas: 0, semanas: p.semanas },
        };
      }

      // A honestidade que importa: sem check-in registrado, "faltas" seria
      // igual a "todos os confirmados" — número que parece dado e é ausência
      // de dado. Melhor dizer o que falta do que devolver a métrica errada.
      if (eventosComCheckin === 0) {
        return {
          texto: `Nas últimas ${p.semanas} semanas você teve ${confirmados} confirmado(s), mas nenhum check-in foi marcado — então não dá pra saber quem faltou. A presença se marca na tela de inscritos de cada evento.`,
          dados: { confirmados, presentes: 0, faltas: null, semanas: p.semanas },
        };
      }

      const faltas = confirmados - presentes;
      return {
        texto: `Nas últimas ${p.semanas} semanas: ${confirmados} confirmado(s), ${presentes} com presença marcada — ${faltas} não apareceram.`,
        dados: { confirmados, presentes, faltas, semanas: p.semanas },
      };
    },
  },

  taxa_comparecimento: {
    descricao:
      "Qual a taxa de comparecimento (presentes sobre confirmados) nos eventos das últimas N semanas.",
    exemplos: ["qual minha taxa de comparecimento", "que porcentagem aparece de verdade"],
    schema: semanasSchema,
    executar: async (userId: string, p: { semanas: number }) => {
      const desde = diasAtras(p.semanas * 7);
      const base = {
        event: {
          community: daPessoa(userId),
          startsAt: { gte: desde, lt: new Date() },
        },
        canceledAt: null,
        status: "confirmado" as const,
      };
      const [confirmados, presentes] = await Promise.all([
        prisma.rsvp.count({ where: base }),
        prisma.rsvp.count({ where: { ...base, checkinEm: { not: null } } }),
      ]);

      if (confirmados === 0) {
        return {
          texto: `Nenhum evento seu com inscritos aconteceu nas últimas ${p.semanas} semanas.`,
          dados: { confirmados: 0, presentes: 0, taxa: null, semanas: p.semanas },
        };
      }
      if (presentes === 0) {
        return {
          texto: `Nas últimas ${p.semanas} semanas nenhum check-in foi marcado, então a taxa de comparecimento não dá pra calcular. A presença se marca na tela de inscritos.`,
          dados: { confirmados, presentes: 0, taxa: null, semanas: p.semanas },
        };
      }

      const taxa = Math.round((presentes / confirmados) * 100);
      return {
        texto: `Taxa de comparecimento das últimas ${p.semanas} semanas: ${taxa}% (${presentes} de ${confirmados} confirmados apareceram).`,
        dados: { confirmados, presentes, taxa, semanas: p.semanas },
      };
    },
  },

  evento_maior_presenca: {
    descricao: "Qual dos meus eventos teve mais gente presente (mais check-ins).",
    exemplos: ["qual meu evento com mais presença", "qual evento bombou mais"],
    schema: semParametro,
    executar: async (userId: string) => {
      const eventos = await prisma.event.findMany({
        where: {
          community: daPessoa(userId),
          startsAt: { lt: new Date() },
          rsvps: { some: { checkinEm: { not: null } } },
        },
        select: {
          titulo: true,
          startsAt: true,
          _count: { select: { rsvps: { where: { checkinEm: { not: null } } } } },
        },
      });

      if (eventos.length === 0) {
        return {
          texto:
            "Nenhum evento seu tem presença marcada ainda, então não dá pra dizer qual teve mais gente. A presença se marca na tela de inscritos de cada evento.",
          dados: { evento: null, presentes: null },
        };
      }

      const campeao = eventos.reduce((a, b) =>
        b._count.rsvps > a._count.rsvps ? b : a,
      );
      return {
        texto: `Seu evento com mais presença foi "${campeao.titulo}" (${campeao.startsAt.toLocaleDateString("pt-BR")}), com ${campeao._count.rsvps} pessoa(s) presentes.`,
        dados: { evento: campeao.titulo, presentes: campeao._count.rsvps },
      };
    },
  },

  lista_espera: {
    descricao: "Quantas pessoas estão na lista de espera dos meus eventos futuros.",
    exemplos: ["tem gente na lista de espera", "quantos esperando vaga"],
    schema: semParametro,
    executar: async (userId: string) => {
      const total = await prisma.rsvp.count({
        where: {
          event: {
            community: daPessoa(userId),
            startsAt: { gte: new Date() },
            canceladoEm: null,
          },
          status: "lista_espera",
          canceledAt: null,
        },
      });
      return {
        texto:
          total === 0
            ? "Ninguém está na lista de espera dos seus eventos futuros."
            : `${total} pessoa(s) na lista de espera dos seus eventos futuros. Se abrir vaga, elas são promovidas automaticamente.`,
        dados: { total },
      };
    },
  },

  cancelamentos: {
    descricao: "Quantas pessoas cancelaram a inscrição nos últimos N dias.",
    exemplos: ["quantos cancelaram essa semana", "teve muito cancelamento"],
    schema: diasSchema,
    executar: async (userId: string, p: { dias: number }) => {
      const total = await prisma.rsvp.count({
        where: {
          event: { community: daPessoa(userId) },
          canceledAt: { gte: diasAtras(p.dias) },
        },
      });
      return {
        texto:
          total === 0
            ? `Ninguém cancelou inscrição nos seus eventos nos últimos ${p.dias} dias.`
            : `${total} pessoa(s) cancelaram inscrição nos seus eventos nos últimos ${p.dias} dias.`,
        dados: { total, dias: p.dias },
      };
    },
  },
} as const;

export type Chave = keyof typeof INTENCOES;
export const CHAVES = Object.keys(INTENCOES) as Chave[];

export function ehIntencao(v: string): v is Chave {
  return Object.prototype.hasOwnProperty.call(INTENCOES, v);
}

/** As sugestões mostradas quando nada casa. Saem dos próprios exemplos. */
export function sugestoes(): string[] {
  return CHAVES.flatMap((c) => INTENCOES[c].exemplos.slice(0, 1));
}

const escolhaSchema = z.object({
  intencao: z.string().nullable(),
  semanas: z.number().nullable().optional(),
  dias: z.number().nullable().optional(),
});

/**
 * A GUARDA. Recebe o texto do modelo e devolve uma intenção CONHECIDA com
 * parâmetros VALIDADOS, ou `null`.
 *
 * Exportada e testável sem chave de API — a regra mais importante do arquivo
 * não pode ser a menos testada. Note o que ela não faz: não aceita nome de
 * campo, não aceita filtro, não aceita id. Só o nome de uma intenção do
 * registro e dois números com limite.
 */
export function validarEscolha(
  bruto: string,
): { intencao: Chave; params: Record<string, number> } | null {
  const json = bruto.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

  let analisado;
  try {
    analisado = escolhaSchema.safeParse(JSON.parse(json));
  } catch {
    return null;
  }
  if (!analisado.success) return null;

  const nome = analisado.data.intencao;
  // Intenção que não está no registro é DESCARTADA. É aqui que morre qualquer
  // tentativa de fazer o modelo escolher algo que não oferecemos.
  if (!nome || !ehIntencao(nome)) return null;

  const bruto2: Record<string, number> = {};
  if (typeof analisado.data.semanas === "number") bruto2.semanas = analisado.data.semanas;
  if (typeof analisado.data.dias === "number") bruto2.dias = analisado.data.dias;

  // O Zod da intenção corta o resto: número fora do limite vira default, campo
  // que ela não usa é ignorado.
  const p = INTENCOES[nome].schema.safeParse(bruto2);
  if (!p.success) return null;

  return { intencao: nome, params: p.data as Record<string, number> };
}

function montarPrompt(): string {
  const lista = CHAVES.map((c) => {
    const i = INTENCOES[c];
    const params =
      i.schema === semanasSchema
        ? ' (aceita "semanas": número de 1 a 52)'
        : i.schema === diasSchema
          ? ' (aceita "dias": número de 1 a 365)'
          : " (sem parâmetro)";
    return `- ${c}${params}: ${i.descricao}\n  ex.: ${i.exemplos.join(" / ")}`;
  }).join("\n");

  return `Você ajuda organizadores da plataforma MUNAY a consultar os próprios dados de eventos.

Sua tarefa: ler a pergunta e escolher UMA das intenções abaixo. Você NÃO consulta dados, NÃO escreve consulta e NÃO responde a pergunta — só classifica.

INTENÇÕES DISPONÍVEIS (estas são todas — não existe nenhuma outra):
${lista}

Regras:
- Devolva EXATAMENTE o nome de uma intenção da lista, ou null se nenhuma servir.
- Se a pergunta não for sobre os dados de eventos do organizador, devolva null. Não force.
- Extraia "semanas" ou "dias" só se a pergunta disser o número. "últimas 3 semanas" → semanas: 3. "esse mês" → dias: 30. Se não disser, omita e o padrão é usado.
- Nunca invente uma intenção que não está na lista.

Responda SOMENTE com JSON válido, sem markdown:
{"intencao": string|null, "semanas": number|null, "dias": number|null}`;
}

export type ResultadoCopiloto =
  | { ok: true; resposta: Resposta }
  | { ok: false; motivo: "nao-entendi" | "indisponivel"; sugestoes: string[] };

/**
 * Responde a pergunta do organizador.
 *
 * `userId` é o PRIMEIRO argumento e vem da sessão lida no servidor — a
 * assinatura é a barreira, igual ao resto do painel.
 */
export async function responder(
  userId: string,
  pergunta: string,
  ip: string,
): Promise<ResultadoCopiloto> {
  const provedor = fornecedor();
  if (!provedor.disponivel()) {
    return { ok: false, motivo: "indisponivel", sugestoes: sugestoes() };
  }

  const texto = pergunta.trim().slice(0, MAX_ENTRADA);
  if (texto.length < 5) {
    return { ok: false, motivo: "nao-entendi", sugestoes: sugestoes() };
  }

  // Cache da CLASSIFICAÇÃO, nunca da resposta: a mesma pergunta significa a
  // mesma intenção pra qualquer organizador, mas os NÚMEROS são de cada um.
  // Guardar resposta pronta aqui vazaria dado de um pro outro.
  const chaveCache = normalizar(texto);
  let escolha = BALDE.lerCache<{ intencao: Chave; params: Record<string, number> }>(
    chaveCache,
  );

  if (!escolha) {
    const permissao = BALDE.podeChamar(ip);
    if (!permissao.ok) {
      console.info(`[copiloto] chamada barrada: ${permissao.motivo}`);
      return { ok: false, motivo: "indisponivel", sugestoes: sugestoes() };
    }

    const bruto = await provedor.gerar({
      sistema: montarPrompt(),
      usuario: texto,
      maxTokens: 200,
    });
    if (bruto === null) {
      return { ok: false, motivo: "indisponivel", sugestoes: sugestoes() };
    }

    const validada = validarEscolha(bruto);
    if (!validada) {
      return { ok: false, motivo: "nao-entendi", sugestoes: sugestoes() };
    }
    escolha = validada;
    BALDE.guardarCache(chaveCache, validada);
  }

  const def = INTENCOES[escolha.intencao];
  // O executor é quem toca o banco, com o userId do servidor. O texto do
  // modelo não chega aqui: só o nome da intenção e números validados.
  const r = await (
    def.executar as (
      userId: string,
      p: Record<string, number>,
    ) => Promise<{ texto: string; dados: Record<string, number | string | null> }>
  )(userId, escolha.params);

  return {
    ok: true,
    resposta: { texto: r.texto, intencao: escolha.intencao, dados: r.dados },
  };
}

/** Só para teste: zera teto e cache entre casos. */
export function zerarTetoDoCopiloto(): void {
  BALDE.zerar();
}
