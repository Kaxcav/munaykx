"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin-auth";
import { ocultarAviso, reexibirAviso } from "@/lib/posts";

/**
 * Moderação do feed (STORY-010, tarefa 8).
 *
 * `assertAdmin()` é reconferido em CADA action — o layout do /admin não é
 * ponto único de falha, mesma regra da STORY-007. Server Action é endpoint
 * HTTP: sem esta linha, qualquer um postaria direto nela.
 *
 * Ocultar exige motivo e registra quem ocultou. "Quem" é o usuário do Basic
 * Auth (`ADMIN_USER`) — o /admin é credencial compartilhada, então essa é a
 * identidade que existe de verdade; inventar um nome de pessoa aqui seria
 * registro falso.
 */
export async function ocultarAvisoAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "");
  const r = await ocultarAviso(id, { motivo }, process.env.ADMIN_USER ?? "admin");

  revalidatePath("/admin/avisos");
  if (!r.ok) {
    redirect(`/admin/avisos?erro=${encodeURIComponent(r.erro ?? "Não foi possível ocultar.")}`);
  }
  redirect("/admin/avisos?ok=oculto");
}

export async function reexibirAvisoAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (id) await reexibirAviso(id);

  revalidatePath("/admin/avisos");
  redirect("/admin/avisos?ok=reexibido");
}
