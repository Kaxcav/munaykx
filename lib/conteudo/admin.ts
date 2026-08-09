import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { TAG_CONTEUDO } from "@/lib/conteudo";
import {
  REGISTRO,
  VERSAO_SCHEMA,
  ehChave,
  type Chave,
} from "@/lib/conteudo/registro";

/**
 * ESCRITA DO CONTEÚDO (ULTRAPLAN, Onda 1) — rascunho, publicação e rollback.
 *
 * Fluxo: salvar rascunho → conferir → publicar. Publicar é o único momento em
 * que o site público muda, e ele é TRANSACIONAL: carimba a versão e atualiza o
 * valor vigente juntos, senão uma falha no meio deixaria o histórico dizendo
 * uma coisa e o site mostrando outra.
 *
 * `ConteudoVersao` é append-only e faz dois papéis ao mesmo tempo: **audit
 * log** (quem, o quê, quando) e **rollback**. Reverter NUNCA apaga — cria uma
 * versão nova com o valor antigo, mesma regra do "ocultar é reversível, apagar
 * não" da STORY-010. Assim o histórico registra também a reversão.
 *
 * `quem` é a credencial do /admin (Basic Auth é compartilhada). É a identidade
 * que existe de verdade; gravar um nome de pessoa aqui seria registro falso.
 */

export type ResultadoConteudo<T = undefined> =
  | { ok: true; dados: T }
  | { ok: false; motivo: "chave-desconhecida" | "invalido"; erro?: string };

/** Valida contra o Zod da chave. É a MESMA validação da leitura — de propósito. */
function validarEntrada(chave: Chave, bruto: unknown): ResultadoConteudo<unknown> {
  const r = REGISTRO[chave].schema.safeParse(bruto);
  if (!r.success) {
    return {
      ok: false,
      motivo: "invalido",
      erro: r.error.issues[0]?.message ?? "Valor inválido.",
    };
  }
  return { ok: true, dados: r.data };
}

/** Salva um RASCUNHO (não toca no site público). */
export async function salvarRascunho(
  chave: string,
  valorBruto: unknown,
  quem: string,
): Promise<ResultadoConteudo> {
  if (!ehChave(chave)) return { ok: false, motivo: "chave-desconhecida" };

  const v = validarEntrada(chave, valorBruto);
  if (!v.ok) return v;

  await prisma.conteudoVersao.create({
    data: {
      chave,
      valor: v.dados as never,
      versaoSchema: VERSAO_SCHEMA,
      criadoPor: quem,
      publicadoEm: null,
    },
  });
  return { ok: true, dados: undefined };
}

/**
 * PUBLICA um valor: carimba a versão, atualiza o vigente e invalida o cache.
 *
 * A invalidação é parte da operação, não um detalhe: sem ela o dono vê
 * "publicado" e o site não muda (a home é estática). `revalidateTag` cobre a
 * leitura cacheada; `revalidatePath("/", "layout")` cobre o HTML já
 * prerenderizado da home e o rodapé, que vive no layout de toda página.
 */
export async function publicar(
  chave: string,
  valorBruto: unknown,
  quem: string,
): Promise<ResultadoConteudo> {
  if (!ehChave(chave)) return { ok: false, motivo: "chave-desconhecida" };

  const v = validarEntrada(chave, valorBruto);
  if (!v.ok) return v;
  const valor = v.dados as never;

  await prisma.$transaction(async (tx) => {
    await tx.conteudoVersao.create({
      data: {
        chave,
        valor,
        versaoSchema: VERSAO_SCHEMA,
        criadoPor: quem,
        publicadoEm: new Date(),
      },
    });
    await tx.conteudoSite.upsert({
      where: { chave },
      create: { chave, valor, versaoSchema: VERSAO_SCHEMA, atualizadoPor: quem },
      update: { valor, versaoSchema: VERSAO_SCHEMA, atualizadoPor: quem },
    });
  });

  invalidarConteudo();
  return { ok: true, dados: undefined };
}

/**
 * Invalidação do conteúdo público. Exportada porque o mesmo problema (página
 * estática que não reflete o banco) vale para a criação/aprovação de
 * comunidade — ver o comentário em `app/admin/aprovacoes/actions.ts`.
 */
export function invalidarConteudo(): void {
  // `revalidateTag`/`revalidatePath` LANÇAM fora do runtime do Next (script,
  // seed, processo de teste). Publicar de fora do servidor é operação
  // legítima, e a gravação já aconteceu — engolir aqui evita que a ausência
  // de cache transforme um publish bem-sucedido em erro. Dentro do Next, que
  // é onde importa, a invalidação acontece normalmente.
  try {
    revalidateTag(TAG_CONTEUDO);
    revalidatePath("/", "layout");
  } catch {
    // sem runtime de cache: nada a invalidar.
  }
}

export type VersaoDeConteudo = {
  id: string;
  valor: unknown;
  criadoEm: Date;
  criadoPor: string;
  publicadoEm: Date | null;
};

/** Histórico de uma chave — o audit log que a tela do /admin mostra. */
export async function historico(
  chave: string,
  limite = 20,
): Promise<VersaoDeConteudo[]> {
  if (!ehChave(chave)) return [];
  return prisma.conteudoVersao.findMany({
    where: { chave },
    orderBy: { criadoEm: "desc" },
    take: limite,
    select: {
      id: true,
      valor: true,
      criadoEm: true,
      criadoPor: true,
      publicadoEm: true,
    },
  });
}

/** O rascunho mais recente ainda não publicado, se houver. */
export async function rascunhoAtual(chave: string): Promise<VersaoDeConteudo | null> {
  if (!ehChave(chave)) return null;
  return prisma.conteudoVersao.findFirst({
    where: { chave, publicadoEm: null },
    orderBy: { criadoEm: "desc" },
    select: {
      id: true,
      valor: true,
      criadoEm: true,
      criadoPor: true,
      publicadoEm: true,
    },
  });
}

/**
 * ROLLBACK: republica o valor de uma versão anterior.
 *
 * Não apaga nem "desfaz" — cria uma versão NOVA com o valor antigo, então o
 * histórico registra que houve reversão, e quem reverteu. O valor antigo passa
 * pela mesma validação: se o formato mudou desde então, a reversão é recusada
 * com mensagem em vez de gravar lixo.
 */
export async function reverterPara(
  versaoId: string,
  quem: string,
): Promise<ResultadoConteudo> {
  const versao = await prisma.conteudoVersao.findUnique({
    where: { id: versaoId },
    select: { chave: true, valor: true },
  });
  if (!versao || !ehChave(versao.chave)) {
    return { ok: false, motivo: "chave-desconhecida" };
  }
  return publicar(versao.chave, versao.valor, quem);
}
