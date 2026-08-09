"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-auth";
import { aprovar, recusar } from "@/lib/aprovacao";
import { emailComunidadeRecusada } from "@/lib/emails-aprovacao";
import { dispararEmail } from "@/lib/emails-rsvp";

/**
 * Server Actions da fila de aprovação.
 *
 * Cada action reconfere `assertAdmin()` no servidor (defesa em profundidade: o
 * middleware de Basic Auth já cobre o POST em /admin/*, mas o portão não pode
 * ser ponto único de falha — mesma lição do `assertAdmin` no layout). O `id`
 * vem do form como campo oculto; nada de identidade de usuário vem do form —
 * quem autoriza é o header Basic, lido no servidor.
 */

export async function aprovarAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await aprovar(id);

  // Publicar muda o que o site aberto mostra: revalida a descoberta.
  revalidatePath("/admin/aprovacoes");
  revalidatePath("/comunidades");
  // A HOME também: `components/Vitrine.tsx` lista comunidades do banco numa
  // página com ISR. Sem esta linha, a comunidade recém-aprovada só apareceria
  // quando o cache expirasse — bug latente que a Onda 1 fecha.
  revalidatePath("/");
}

export async function recusarAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();
  // Motivo é obrigatório: recusar sem dizer por quê não ajuda o organizador e
  // é o que a RODADA pede ("recusa leva o motivo"). Sem motivo, não recusa.
  if (!id || !motivo) return;

  const r = await recusar(id, motivo);

  // E-mail SÓ depois do commit da decisão, e nunca trava a resposta
  // (dispararEmail é fire-and-forget que engole erro). Sem organização dona
  // (comunidade de admin) não há quem avisar.
  if (r.ok && r.destino) {
    dispararEmail(
      emailComunidadeRecusada({ para: r.destino, nome: r.comunidade.nome, motivo }),
    );
  }

  revalidatePath("/admin/aprovacoes");
  revalidatePath("/comunidades");
  // A HOME também: `components/Vitrine.tsx` lista comunidades do banco numa
  // página com ISR. Sem esta linha, a comunidade recém-aprovada só apareceria
  // quando o cache expirasse — bug latente que a Onda 1 fecha.
  revalidatePath("/");
}
