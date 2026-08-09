import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { PUBLICO } from "@/lib/communities";
import { comunidadeDoUsuario } from "@/lib/organizacao";
import { seguir } from "@/lib/membership";

/**
 * LINK ABERTO DE CONVITE — a metade que faltava da frente D (RODADA-painel §D).
 *
 * A separação entre os dois convites É a segurança do produto, e está escrita
 * em três lugares que agora finalmente concordam (`docs/RODADA-painel.md` §D,
 * o comentário de `codigoConvite` no `schema.prisma` e o cabeçalho de
 * `lib/convites.ts`):
 *
 *  - **Link aberto** (aqui) → `Membership`, ou seja, **seguir**. Qualquer um
 *    com o link entra. É o link que vai pro grupo de WhatsApp.
 *  - **Convite nominal** (`lib/convites.ts`) → `OrganizationMember`, ou seja,
 *    **poder**. Exige e-mail, aceite e comparação com a sessão.
 *
 * Se o link aberto desse poder, qualquer um que recebesse o link encaminhado
 * veria nome, e-mail e WhatsApp de gente real na lista de inscritos. Por isso
 * este arquivo **não importa nada** que crie `OrganizationMember` — a única
 * escrita de vínculo que ele faz é `seguir()`.
 *
 * Não há migration: `codigoConvite` já existe no schema desde a STORY-009.
 */

/** Só um código ativo por comunidade — gerar de novo INVALIDA o anterior. */
function novoCodigo(): string {
  // 16 bytes = 128 bits em base64url (~22 caracteres). Curto o bastante pra
  // caber num link de WhatsApp, longo o bastante pra não se adivinhar. Nunca
  // sequencial: código previsível é o mesmo que comunidade sem link.
  return randomBytes(16).toString("base64url");
}

export type ResultadoConviteAberto<T = undefined> =
  | { ok: true; dados: T }
  | { ok: false; motivo: "nao-dono" | "nao-publicavel" };

const naoDono = { ok: false, motivo: "nao-dono" } as const;

/**
 * Gera (ou renova) o link aberto da comunidade da pessoa.
 *
 * Renovar é a revogação seletiva que existe: o link antigo para de funcionar
 * na hora, porque o campo é um só. É o que se faz quando o link vaza pra
 * lugar errado — sem precisar de tabela de códigos revogados.
 */
export async function gerarCodigoConvite(
  userId: string,
  comunidadeSlug: string,
): Promise<ResultadoConviteAberto<{ codigo: string }>> {
  const com = await comunidadeDoUsuario(userId, comunidadeSlug);
  if (!com) return naoDono;

  if (com.statusPublicacao !== "aprovada" || !com.ativo) {
    // Link de comunidade que o público não vê seria um caminho lateral pra
    // furar a moderação da frente B: quem tem o link entraria numa comunidade
    // que ninguém aprovou.
    return { ok: false, motivo: "nao-publicavel" };
  }

  const codigo = novoCodigo();
  await prisma.community.update({
    where: { id: com.id },
    data: { codigoConvite: codigo },
  });
  return { ok: true, dados: { codigo } };
}

/** Desliga o link. `null` = comunidade sem link ativo (o schema já diz isso). */
export async function revogarCodigoConvite(
  userId: string,
  comunidadeSlug: string,
): Promise<ResultadoConviteAberto> {
  const com = await comunidadeDoUsuario(userId, comunidadeSlug);
  if (!com) return naoDono;

  await prisma.community.update({
    where: { id: com.id },
    data: { codigoConvite: null },
  });
  return { ok: true, dados: undefined };
}

export type ComunidadeDoConvite = {
  id: string;
  slug: string;
  nome: string;
  modalidade: string;
  regiao: string;
};

/**
 * Resolve o código para a comunidade. `null` quando o código não existe, está
 * vazio, ou a comunidade não é pública.
 *
 * Só devolve o que a página da comunidade já mostra pra qualquer visitante —
 * nome, modalidade, região. Nada de inscritos, nada de contato: o link é
 * aberto, então o que ele revela tem que ser o que já é público.
 */
export async function comunidadePorCodigo(
  codigo: string,
): Promise<ComunidadeDoConvite | null> {
  const limpo = codigo.trim();
  // Guard explícito: sem ele, um código vazio casaria com toda comunidade cujo
  // `codigoConvite` é "" — e `findFirst` devolveria a primeira delas.
  if (!limpo) return null;

  return prisma.community.findFirst({
    where: { codigoConvite: limpo, ...PUBLICO },
    select: { id: true, slug: true, nome: true, modalidade: true, regiao: true },
  });
}

/**
 * Entra na comunidade pelo código: cria o `Membership` (seguir) e nada além
 * disso. Idempotente — `seguir` já é `upsert`, então abrir o link duas vezes
 * não duplica nem reseta a preferência de aviso.
 */
export async function entrarPorCodigo(
  userId: string,
  codigo: string,
): Promise<ComunidadeDoConvite | null> {
  const com = await comunidadePorCodigo(codigo);
  if (!com) return null;
  await seguir(userId, com.id);
  return com;
}
