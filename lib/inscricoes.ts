/**
 * CLASSIFICAÇÃO DAS INSCRIÇÕES — briefing 07/08/2026, item 9.
 *
 * "Dentro da mesma aba de perfil, incluir a área Minhas Inscrições,
 * organizada por status com chips validados: Ativos (inscrições vigentes),
 * Encerrados (experiências já realizadas), Pagos (histórico de compras
 * confirmadas)."
 *
 * ── POR QUE ESTA LÓGICA MORA NUM ARQUIVO SÓ ──────────────────────────────
 *
 * Três telas precisam da mesma resposta pra "esta inscrição está em que
 * estado?": `/minhas-inscricoes`, `/meus-ingressos` e a inferência de
 * consumo. Repetir `if (canceledAt) … else if (startsAt < hoje)` em três
 * lugares é como uma delas passa a discordar das outras — e o sintoma é a
 * pessoa vendo "1 ativo" numa tela e "2 ativos" na outra.
 *
 * ── ⚠️ SOBRE A ABA "PAGOS": ELA VAI NASCER VAZIA, E ISSO ESTÁ CERTO ──────
 *
 * O briefing dá peso estratégico a essa aba: "A seção de Pagos não serve
 * apenas ao usuário: ela é a base para avaliar o perfil do consumidor,
 * especificamente do público pagante. Separar quem paga de quem apenas se
 * inscreve permite identificar o segmento que realmente sustenta a receita."
 *
 * Concordo com o raciocínio. Só que **não existe pagamento no MUNAY**: não há
 * gateway, não há cobrança, não há registro de transação. O que existe é o
 * booleano `Event.gratuito`, e hoje todo evento é gratuito.
 *
 * As duas saídas ruins eram: (a) esconder a aba — o PO pediu, e sumir com
 * pedido sem avisar é o oposto de desvio confessado; (b) fingir que classifica
 * pagamento — a aba mostraria número que não veio de dinheiro nenhum, e
 * alguém tomaria decisão de negócio em cima.
 *
 * A saída aqui: a aba existe, classifica pelo único sinal REAL disponível
 * (`gratuito: false`) e o estado vazio diz com todas as letras que ingresso
 * pago ainda não existe. No dia em que o pagamento entrar, `ehPago()` passa a
 * olhar a transação e o resto do produto não muda.
 */

export type SituacaoInscricao = "ativa" | "encerrada" | "cancelada";
export type AbaInscricoes = "ativos" | "encerrados" | "pagos";

export const ABAS: { id: AbaInscricoes; rotulo: string; descricao: string }[] = [
  { id: "ativos", rotulo: "Ativos", descricao: "O que ainda vai acontecer" },
  { id: "encerrados", rotulo: "Encerrados", descricao: "O que você já viveu" },
  { id: "pagos", rotulo: "Pagos", descricao: "Suas compras confirmadas" },
];

export function ehAbaValida(valor: string | undefined): valor is AbaInscricoes {
  return valor === "ativos" || valor === "encerrados" || valor === "pagos";
}

/** Forma mínima que a classificação precisa — não amarra no tipo do Prisma. */
export type InscricaoClassificavel = {
  canceledAt: Date | null;
  status: string;
  event: { startsAt: Date; gratuito: boolean };
};

export function situacaoDe(
  r: InscricaoClassificavel,
  agora = new Date(),
): SituacaoInscricao {
  // Cancelada vence tudo: cancelou um evento que já passou continua sendo
  // cancelada, não "encerrada". Quem cancelou não viveu a experiência.
  if (r.canceledAt) return "cancelada";
  return r.event.startsAt >= agora ? "ativa" : "encerrada";
}

/**
 * Hoje: o evento não é gratuito e a inscrição não foi cancelada.
 *
 * Quando existir pagamento de verdade, é ESTA função que passa a consultar a
 * transação — e mais nada no produto muda.
 */
export function ehPago(r: InscricaoClassificavel): boolean {
  return !r.event.gratuito && r.canceledAt === null;
}

export function pertenceAAba(
  r: InscricaoClassificavel,
  aba: AbaInscricoes,
  agora = new Date(),
): boolean {
  if (aba === "pagos") return ehPago(r);
  const s = situacaoDe(r, agora);
  // Cancelada aparece em "Encerrados": some da lista de coisas por vir, mas
  // continua no histórico — a pessoa precisa conseguir provar que cancelou.
  if (aba === "ativos") return s === "ativa";
  return s === "encerrada" || s === "cancelada";
}

export function contarPorAba(
  inscricoes: InscricaoClassificavel[],
  agora = new Date(),
): Record<AbaInscricoes, number> {
  return {
    ativos: inscricoes.filter((r) => pertenceAAba(r, "ativos", agora)).length,
    encerrados: inscricoes.filter((r) => pertenceAAba(r, "encerrados", agora)).length,
    pagos: inscricoes.filter((r) => pertenceAAba(r, "pagos", agora)).length,
  };
}

/** Rótulo e cor do chip de estado de UMA inscrição (não da aba). */
export function selo(r: InscricaoClassificavel, agora = new Date()) {
  const s = situacaoDe(r, agora);
  if (s === "cancelada") {
    return { rotulo: "Cancelada", classe: "border-petroleo/15 bg-white/50 text-petroleo/55" };
  }
  if (s === "encerrada") {
    return { rotulo: "Já rolou", classe: "border-petroleo/20 bg-white/70 text-petroleo/70" };
  }
  if (r.status === "lista_espera") {
    return { rotulo: "Lista de espera", classe: "border-petroleo/25 bg-areia text-petroleo" };
  }
  return { rotulo: "Confirmada ✓", classe: "border-salvia bg-salvia-soft text-salvia-deep" };
}
