"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { definirAviso } from "@/lib/membership";
import { definirAvisoPosts } from "@/lib/posts";

/** Liga/desliga o aviso de evento novo de uma comunidade. Sessão no servidor. */
export async function alternarAvisoAction(formData: FormData): Promise<void> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");
  const communityId = String(formData.get("communityId") ?? "").trim();
  const avisar = formData.get("avisar") === "1";
  if (communityId) await definirAviso(sessao.user.id, communityId, avisar);
  revalidatePath("/minhas-comunidades");
  redirect("/minhas-comunidades");
}

/**
 * Liga/desliga o aviso de AVISOS (posts) — opt-in separado do de evento
 * (STORY-010, decisão 4). Nasce desligado: é e-mail que a pessoa não pediu.
 */
export async function alternarAvisoPostsAction(formData: FormData): Promise<void> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");
  const communityId = String(formData.get("communityId") ?? "").trim();
  const avisar = formData.get("avisar") === "1";
  if (communityId) await definirAvisoPosts(sessao.user.id, communityId, avisar);
  revalidatePath("/minhas-comunidades");
  redirect("/minhas-comunidades");
}
