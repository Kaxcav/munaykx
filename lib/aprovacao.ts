import { prisma } from "@/lib/db";

/**
 * FILA DE APROVAÇÃO — camada de dado (STORY-009, frente B).
 *
 * O oposto de `lib/organizacao.ts`: lá toda função recebe `userId` e o escopo
 * é por dono; aqui NÃO há filtro de dono, porque a fila é da MUNAY, não de um
 * organizador. Quem barra o acesso é o Basic Auth em `assertAdmin()` (no
 * layout do /admin e em cada server action) — nunca um id vindo do formulário.
 *
 * TRÊS DECISÕES QUE NÃO SE NEGOCIAM AQUI:
 *
 * 1. **Recusar é STATUS, não delete** (RODADA §B). A linha continua no banco
 *    com `statusPublicacao: "recusada"` e a autorização aceita intacta —
 *    apagar seria perder a prova da regra 3 do projeto.
 *
 * 2. **A transição só parte de `pendente`.** O guard mora no `where` do
 *    `updateMany` (`statusPublicacao: "pendente"`), dentro da transação: clique
 *    duplo, corrida entre dois admins ou reprocessamento NÃO re-disparam a
 *    decisão nem o e-mail. `count === 0` = "não era mais pendente".
 *
 * 3. **O motivo da recusa é persistido** em `Community.motivoRecusa` (migration
 *    `..._motivo_recusa`, a pedido do dono) E vai no e-mail de recusa (RODADA:
 *    "o e-mail leva o motivo"). Persistir além do e-mail deixa auditável por
 *    que algo foi barrado, sem depender da caixa de ninguém. Aprovar não
 *    preenche o campo; só recusar.
 */

export type ComunidadePendente = {
  id: string;
  slug: string;
  nome: string;
  modalidade: string;
  regiao: string;
  createdAt: Date;
  autorizacaoTexto: string | null;
  autorizacaoEm: Date | null;
  organizacao: string | null;
};

/** Fila FIFO: a mais antiga primeiro, que é a que espera há mais tempo. */
export async function listarPendentes(): Promise<ComunidadePendente[]> {
  const linhas = await prisma.community.findMany({
    where: { statusPublicacao: "pendente" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      nome: true,
      modalidade: true,
      regiao: true,
      createdAt: true,
      autorizacaoTexto: true,
      autorizacaoEm: true,
      organization: { select: { nome: true } },
    },
  });

  return linhas.map((c) => ({
    id: c.id,
    slug: c.slug,
    nome: c.nome,
    modalidade: c.modalidade,
    regiao: c.regiao,
    createdAt: c.createdAt,
    autorizacaoTexto: c.autorizacaoTexto,
    autorizacaoEm: c.autorizacaoEm,
    organizacao: c.organization?.nome ?? null,
  }));
}

export type ResultadoDecisao =
  | { ok: false; motivo: "inexistente" | "nao-pendente" }
  | {
      ok: true;
      comunidade: { id: string; nome: string; slug: string };
      /** E-mail do organizador dono, pra notificar. `null` = comunidade sem
       *  organização (cadastrada pelo admin) — não há quem avisar. */
      destino: string | null;
    };

/** Aprova: publica nas seis portas públicas. Só a partir de `pendente`. */
export function aprovar(id: string): Promise<ResultadoDecisao> {
  return decidir(id, "aprovada");
}

/** Recusa: mantém fora do site (status), sem apagar, gravando o motivo. Só a
 *  partir de `pendente`. */
export function recusar(id: string, motivo: string): Promise<ResultadoDecisao> {
  return decidir(id, "recusada", motivo);
}

async function decidir(
  id: string,
  novo: "aprovada" | "recusada",
  motivo?: string,
): Promise<ResultadoDecisao> {
  return prisma.$transaction(async (tx) => {
    const atual = await tx.community.findUnique({
      where: { id },
      select: { statusPublicacao: true },
    });
    if (!atual) return { ok: false, motivo: "inexistente" };
    if (atual.statusPublicacao !== "pendente") {
      return { ok: false, motivo: "nao-pendente" };
    }

    // O guard REAL: a transição só acontece se ainda estiver pendente. Duas
    // decisões concorrentes → só a primeira muda `count`, a segunda é no-op.
    const r = await tx.community.updateMany({
      where: { id, statusPublicacao: "pendente" },
      data:
        novo === "recusada"
          ? { statusPublicacao: "recusada", motivoRecusa: motivo?.trim() || null }
          : { statusPublicacao: "aprovada" },
    });
    if (r.count === 0) return { ok: false, motivo: "nao-pendente" };

    const c = await tx.community.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        nome: true,
        slug: true,
        organization: {
          select: {
            membros: {
              select: { user: { select: { email: true } } },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        },
      },
    });

    return {
      ok: true,
      comunidade: { id: c.id, nome: c.nome, slug: c.slug },
      destino: c.organization?.membros[0]?.user.email ?? null,
    };
  });
}
