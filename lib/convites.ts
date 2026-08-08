import { randomBytes } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { souOrganizador } from "@/lib/organizacao";

/**
 * CONVITES NOMINAIS (STORY-009, frente D).
 *
 * O convite nominal por e-mail é o **único** caminho para virar
 * `OrganizationMember` (organizador). É isso que separa "entrou no grupo" de
 * "pode ver a base de participantes": link aberto concederia `Membership`
 * (seguidor), nunca poder. `OrganizationMember` não tem papel — todo membro é
 * organizador —, então o convite é só por e-mail.
 *
 * Contrato de segurança:
 *  - **Só quem já é organizador da org convida.** `userId` vem da sessão no
 *    servidor; a função checa `souOrganizador` antes de qualquer escrita.
 *  - **O convite é escopado à organização.** Listar/revogar filtram por org, e
 *    revogar de org que não é sua não faz nada.
 *  - **Aceitar compara o e-mail da SESSÃO com o do convite** (ambos minúsculos).
 *    Não dá pra aceitar convite de outro — é o que impede pegar um token e
 *    entrar numa org alheia.
 *  - **Expiração e uso único** são respeitados: convite vencido ou já aceito
 *    não vira membro. Aceitar é transacional (cria o membro E marca o aceite).
 */

const DIAS_VALIDADE = 7;
const emailSchema = z.string().trim().toLowerCase().email();

function novoToken(): string {
  return randomBytes(24).toString("hex");
}

export type ResultadoConvite<T = undefined> =
  | { ok: true; dados: T }
  | {
      ok: false;
      motivo:
        | "nao-dono"
        | "email-invalido"
        | "ja-membro"
        | "inexistente"
        | "expirado"
        | "ja-usado"
        | "nao-e-seu";
    };

const naoDono = { ok: false, motivo: "nao-dono" } as const;

/** Cria (ou renova) um convite. Só um organizador da org convida. */
export async function convidar(
  userId: string,
  organizationId: string,
  emailBruto: string,
): Promise<ResultadoConvite<{ token: string; id: string; expiraEm: Date }>> {
  if (!(await souOrganizador(userId, organizationId))) return naoDono;

  const parsed = emailSchema.safeParse(emailBruto);
  if (!parsed.success) return { ok: false, motivo: "email-invalido" };
  const email = parsed.data;

  // Já é membro? (a pessoa com esse e-mail já administra a org) → não convida.
  const jaMembro = await prisma.organizationMember.findFirst({
    where: { organizationId, user: { email } },
    select: { id: true },
  });
  if (jaMembro) return { ok: false, motivo: "ja-membro" };

  const token = novoToken();
  const expiraEm = new Date(Date.now() + DIAS_VALIDADE * 24 * 60 * 60 * 1000);

  // @@unique([organizationId, email]): re-convidar o mesmo e-mail RENOVA o
  // convite (novo token e prazo) em vez de duplicar ou estourar.
  const convite = await prisma.organizationInvite.upsert({
    where: { organizationId_email: { organizationId, email } },
    create: { organizationId, email, token, expiraEm, convidadoPorId: userId },
    update: { token, expiraEm, aceitoEm: null, convidadoPorId: userId },
    select: { id: true, token: true, expiraEm: true },
  });

  return { ok: true, dados: convite };
}

export type ConvitePendente = {
  id: string;
  email: string;
  expiraEm: Date;
  expirado: boolean;
};

/** Convites ainda não aceitos da org. Só um organizador da org vê. */
export async function listarPendentes(
  userId: string,
  organizationId: string,
): Promise<ConvitePendente[]> {
  if (!(await souOrganizador(userId, organizationId))) return [];

  const linhas = await prisma.organizationInvite.findMany({
    where: { organizationId, aceitoEm: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, expiraEm: true },
  });
  const agora = Date.now();
  return linhas.map((l) => ({
    id: l.id,
    email: l.email,
    expiraEm: l.expiraEm,
    expirado: l.expiraEm.getTime() <= agora,
  }));
}

/** Revoga um convite pendente. Escopado à org: revogar de org alheia = no-op. */
export async function revogar(
  userId: string,
  organizationId: string,
  conviteId: string,
): Promise<ResultadoConvite> {
  if (!(await souOrganizador(userId, organizationId))) return naoDono;
  const r = await prisma.organizationInvite.deleteMany({
    where: { id: conviteId, organizationId },
  });
  if (r.count === 0) return { ok: false, motivo: "inexistente" };
  return { ok: true, dados: undefined };
}

/** Dados do convite pra tela de aceite (nome da org). `null` se não existe. */
export async function convitePorToken(token: string) {
  return prisma.organizationInvite.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      expiraEm: true,
      aceitoEm: true,
      organization: { select: { id: true, nome: true } },
    },
  });
}

/**
 * Aceita um convite: vira `OrganizationMember` da org. Transacional (cria o
 * membro E marca `aceitoEm` na mesma transação). O e-mail da sessão precisa
 * bater com o do convite — é a barreira contra aceitar convite de outro.
 */
export async function aceitar(
  userId: string,
  emailSessao: string,
  token: string,
): Promise<ResultadoConvite<{ organizationId: string }>> {
  const convite = await prisma.organizationInvite.findUnique({
    where: { token },
    select: { id: true, organizationId: true, email: true, expiraEm: true, aceitoEm: true },
  });
  if (!convite) return { ok: false, motivo: "inexistente" };
  if (convite.aceitoEm) return { ok: false, motivo: "ja-usado" };
  if (convite.expiraEm.getTime() <= Date.now()) return { ok: false, motivo: "expirado" };

  // A barreira: o convite é NOMINAL. Só o dono do e-mail aceita.
  if (convite.email !== emailSessao.trim().toLowerCase()) {
    return { ok: false, motivo: "nao-e-seu" };
  }

  return prisma.$transaction(async (tx) => {
    // Consome o convite (guard de uso único): só marca se ainda não foi aceito.
    const marca = await tx.organizationInvite.updateMany({
      where: { id: convite.id, aceitoEm: null },
      data: { aceitoEm: new Date() },
    });
    if (marca.count === 0) return { ok: false, motivo: "ja-usado" } as const;

    // Vira membro (idempotente: se já for, não duplica).
    await tx.organizationMember.upsert({
      where: { userId_organizationId: { userId, organizationId: convite.organizationId } },
      create: { userId, organizationId: convite.organizationId },
      update: {},
    });

    return { ok: true, dados: { organizationId: convite.organizationId } } as const;
  }).catch((error) => {
    // Corrida rara no upsert do membro sob unique — trata como já-membro ok.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: true, dados: { organizationId: convite.organizationId } } as const;
    }
    throw error;
  });
}
