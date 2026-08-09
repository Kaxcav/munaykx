"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { getCommunityBySlug } from "@/lib/communities";
import { seguir, deixarDeSeguir } from "@/lib/membership";

/**
 * Seguir / deixar de seguir (STORY-008). A sessão é lida no SERVIDOR; sem ela,
 * o botão NÃO some — leva ao login preservando a intenção (`?proximo=`), e a
 * página de destino completa o seguir ao voltar (`?seguir=1`).
 */

export async function seguirAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "").trim();
  const sessao = await sessaoAtual();
  if (!sessao) {
    redirect(`/entrar?proximo=${encodeURIComponent(`/comunidades/${slug}?seguir=1`)}`);
  }
  const c = await getCommunityBySlug(slug);
  if (c) await seguir(sessao.user.id, c.id);
  revalidatePath(`/comunidades/${slug}`);
  redirect(`/comunidades/${slug}`);
}

export async function deixarDeSeguirAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "").trim();
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");
  const c = await getCommunityBySlug(slug);
  if (c) await deixarDeSeguir(sessao.user.id, c.id);
  revalidatePath(`/comunidades/${slug}`);
  redirect(`/comunidades/${slug}`);
}
