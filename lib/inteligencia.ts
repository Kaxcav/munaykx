import { prisma } from "@/lib/db";
import { acentoDaModalidade, familiaDaModalidade } from "@/lib/modalidades";
import { INTERESSES, interessePorId } from "@/lib/interesses";

/**
 * INTELIGÊNCIA DE CONSUMO — briefing 07/08/2026, item 10.
 *
 * "Capturar os dados de perfil com base na ativação de compra. A lógica é
 * identificar as preferências dos clientes através do consumo real, não
 * apenas do que eles declaram. Exemplo prático: se a Adriana vai a um jogo
 * de basquete e sempre compra pipoca, esse padrão é registrado no perfil
 * dela."
 *
 * ── O QUE EXISTE PRA MEDIR HOJE, E O QUE NÃO EXISTE ──────────────────────
 *
 * Não existe compra no MUNAY. Não há pagamento, não há ingresso pago, não há
 * item de consumo — a "pipoca da Adriana" não tem onde ser registrada, e
 * inventar a tabela agora seria construir sobre um fluxo que ninguém sabe
 * ainda como vai ser.
 *
 * O que EXISTE é ativação de verdade: o RSVP. A pessoa se inscreveu, o
 * evento tem modalidade, comunidade, região e horário — e ela apareceu ou
 * cancelou. Isso já é comportamento efetivo, não declaração. É a mesma
 * lógica do briefing aplicada ao dado que o produto tem hoje: **o que a
 * pessoa FAZ, comparado com o que ela DIZ**.
 *
 * Quando o pagamento existir, este arquivo ganha a fonte nova e a interface
 * não muda. É por isso que ele calcula em vez de guardar coluna "preferência
 * inferida": preferência que vira coluna congela o dia em que foi calculada,
 * e ninguém lembra de recalcular.
 *
 * ── ⚠️ O ITEM 10.1 NÃO ESTÁ IMPLEMENTADO, E É DE PROPÓSITO ───────────────
 *
 * O briefing lista duas oportunidades: (a) personalização pro usuário final
 * e (b) "produto de dados para organizadores de eventos e empresas de
 * serviço do mercado wellness — inteligência de público como serviço
 * vendável".
 *
 * (Nota de 07/08: o CPF citado abaixo NÃO é mais coletado — o campo foi
 * removido. A advertência do briefing segue valendo integralmente para
 * localização e histórico de consumo, que continuam sendo coletados.)
 *
 * (a) está aqui. (b) NÃO ESTÁ, e o próprio briefing explica por quê, no
 * PONTO DE ATENÇÃO — LGPD: "A coleta de CPF, localização e histórico de
 * consumo, somada ao compartilhamento de inteligência de público com
 * terceiros, exige base legal explícita, consentimento granular e política
 * de privacidade clara. Este ponto precisa ser validado ANTES da
 * implementação: é um risco jurídico e reputacional, não apenas técnico."
 *
 * Compartilhar perfil de público com terceiro sem base legal é infração de
 * LGPD com multa de até 2% do faturamento — e, num projeto que é candidato a
 * edital público, o risco reputacional é maior que o financeiro.
 *
 * O que existe aqui é `panoramaAgregado()`: números AGREGADOS, com corte de
 * k-anonimato, pro `/admin` interno. Nada individual, nada exportável pra
 * fora, nada vendável. A ponte pro produto de dados é decisão jurídica
 * primeiro, código depois.
 */

/** Ninguém aparece num agregado com menos de K pessoas por trás. */
export const K_ANONIMATO = 5;

export type SinalDeConsumo = {
  modalidade: string;
  familia: string | null;
  acento: ReturnType<typeof acentoDaModalidade>;
  vezes: number;
  /** Inscreveu e cancelou conta contra, não a favor. */
  cancelamentos: number;
  ultimaVez: Date | null;
};

export type PerfilInferido = {
  sinais: SinalDeConsumo[];
  regioes: { regiao: string; vezes: number }[];
  /** Períodos em que a pessoa realmente se inscreve. */
  periodos: { periodo: "manhã" | "tarde" | "noite"; vezes: number }[];
  /** Praticado de fato, mas não marcado nas tags — a lacuna interessante. */
  sugestoesDeTag: { id: string; rotulo: string }[];
  /** Marcado nas tags, mas nunca praticado — a outra lacuna. */
  declaradoSemPratica: { id: string; rotulo: string }[];
  total: number;
};

function periodoDe(data: Date): "manhã" | "tarde" | "noite" {
  const h = data.getHours();
  if (h < 12) return "manhã";
  if (h < 18) return "tarde";
  return "noite";
}

function ordenarPorVezes<T extends { vezes: number }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => b.vezes - a.vezes);
}

/**
 * O que o histórico de inscrição diz sobre esta pessoa.
 *
 * NÃO checa consentimento — quem chama é que decide. O uso pra recomendar
 * exige `consentiuRecomendacao`; o uso pra ela MESMA ver o próprio histórico
 * é legítimo interesse do titular sobre o próprio dado e não depende de
 * opt-in (a pessoa está olhando a própria inscrição, que ela já vê na tela
 * `/minhas-inscricoes` desde a STORY-007).
 */
export async function inferirPerfil(
  userId: string,
  interessesDeclarados: string[] = [],
): Promise<PerfilInferido> {
  const inscricoes = await prisma.rsvp.findMany({
    where: { userId },
    include: { event: { include: { community: true } } },
    orderBy: { event: { startsAt: "desc" } },
  });

  const porModalidade = new Map<string, SinalDeConsumo>();
  const porRegiao = new Map<string, number>();
  const porPeriodo = new Map<"manhã" | "tarde" | "noite", number>();

  for (const r of inscricoes) {
    const modalidade = r.event.community.modalidade;
    const atual = porModalidade.get(modalidade) ?? {
      modalidade,
      familia: familiaDaModalidade(modalidade),
      acento: acentoDaModalidade(modalidade),
      vezes: 0,
      cancelamentos: 0,
      ultimaVez: null,
    };
    atual.vezes += 1;
    if (r.canceledAt) atual.cancelamentos += 1;
    if (!atual.ultimaVez || r.event.startsAt > atual.ultimaVez) {
      atual.ultimaVez = r.event.startsAt;
    }
    porModalidade.set(modalidade, atual);

    const regiao = r.event.community.regiao;
    porRegiao.set(regiao, (porRegiao.get(regiao) ?? 0) + 1);

    const p = periodoDe(r.event.startsAt);
    porPeriodo.set(p, (porPeriodo.get(p) ?? 0) + 1);
  }

  const sinais = ordenarPorVezes([...porModalidade.values()]);

  // ── As duas lacunas ───────────────────────────────────────────────────
  // O valor do item 10 não está em confirmar o que a pessoa já disse — está
  // exatamente onde o dito e o feito discordam.
  const declarados = new Set(interessesDeclarados);
  const praticados = new Set(sinais.map((s) => s.modalidade.toLowerCase()));

  const sugestoesDeTag = INTERESSES.filter(
    (i) =>
      i.tipo === "pratica" &&
      i.modalidade &&
      praticados.has(i.modalidade.toLowerCase()) &&
      !declarados.has(i.id),
  ).map((i) => ({ id: i.id, rotulo: i.rotulo }));

  const declaradoSemPratica = [...declarados]
    .map((id) => interessePorId(id))
    .filter(
      (i): i is NonNullable<typeof i> =>
        Boolean(i) &&
        i!.tipo === "pratica" &&
        Boolean(i!.modalidade) &&
        !praticados.has(i!.modalidade!.toLowerCase()),
    )
    .map((i) => ({ id: i.id, rotulo: i.rotulo }));

  return {
    sinais,
    regioes: ordenarPorVezes(
      [...porRegiao.entries()].map(([regiao, vezes]) => ({ regiao, vezes })),
    ),
    periodos: ordenarPorVezes(
      [...porPeriodo.entries()].map(([periodo, vezes]) => ({ periodo, vezes })),
    ),
    sugestoesDeTag,
    declaradoSemPratica,
    total: inscricoes.length,
  };
}

export type LinhaPanorama = { chave: string; pessoas: number };

/**
 * Panorama AGREGADO pro `/admin` — nunca individual, nunca exportado.
 *
 * O corte de k-anonimato não é enfeite: com 2 pessoas numa modalidade, "80%
 * do público de escalada é do Lago Sul" identifica alguém. Recorte abaixo de
 * `K_ANONIMATO` é descartado, não arredondado — arredondar deixa a linha na
 * tela e dá a impressão de que o dado existe.
 *
 * Conta PESSOAS distintas, não inscrições: quem se inscreveu em 8 eventos de
 * corrida é uma pessoa, não oito. Contar inscrição faria um usuário ativo
 * sozinho furar o k-anonimato.
 */
export async function panoramaAgregado(): Promise<{
  modalidades: LinhaPanorama[];
  regioes: LinhaPanorama[];
  suprimidos: number;
}> {
  const inscricoes = await prisma.rsvp.findMany({
    where: { userId: { not: null }, canceledAt: null },
    select: {
      userId: true,
      event: { select: { community: { select: { modalidade: true, regiao: true } } } },
    },
  });

  const porModalidade = new Map<string, Set<string>>();
  const porRegiao = new Map<string, Set<string>>();

  for (const r of inscricoes) {
    if (!r.userId) continue;
    const { modalidade, regiao } = r.event.community;
    if (!porModalidade.has(modalidade)) porModalidade.set(modalidade, new Set());
    porModalidade.get(modalidade)!.add(r.userId);
    if (!porRegiao.has(regiao)) porRegiao.set(regiao, new Set());
    porRegiao.get(regiao)!.add(r.userId);
  }

  let suprimidos = 0;
  const aplicarCorte = (mapa: Map<string, Set<string>>): LinhaPanorama[] =>
    [...mapa.entries()]
      .map(([chave, pessoas]) => ({ chave, pessoas: pessoas.size }))
      .filter((l) => {
        if (l.pessoas < K_ANONIMATO) {
          suprimidos += 1;
          return false;
        }
        return true;
      })
      .sort((a, b) => b.pessoas - a.pessoas);

  return {
    modalidades: aplicarCorte(porModalidade),
    regioes: aplicarCorte(porRegiao),
    suprimidos,
  };
}
