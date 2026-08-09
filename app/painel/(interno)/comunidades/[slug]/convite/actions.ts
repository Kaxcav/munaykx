"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { gerarCodigoConvite, revogarCodigoConvite } from "@/lib/convite-aberto";

/**
 * Server Actions do link aberto (frente D, metade faltante).
 *
 * Mesmo contrato do resto do painel: a sessão é lida AQUI, no servidor, e o
 * `userId` dela vai pra camada — nunca vem do formulário. Server Action é
 * endpoint HTTP como outro qualquer; aceitar dono do corpo deixaria qualquer
 * um gerar o link de convite de uma comunidade alheia.
 */

async function exigirUserId(): Promise<string> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");
  return sessao.user.id;
}

export async function gerarCodigoAction(formData: FormData): Promise<void> {
  const userId = await exigirUserId();
  const slug = String(formData.get("slug") ?? "").trim();
  const base = `/painel/comunidades/${encodeURIComponent(slug)}/convite`;

  const r = await gerarCodigoConvite(userId, slug);
  if (!r.ok && r.motivo === "nao-dono") redirect("/painel");
  if (!r.ok) {
    redirect(
      `${base}?erro=${encodeURIComponent("Esta comunidade ainda não está publicada, então o link não levaria a lugar nenhum.")}`,
    );
  }

  revalidatePath(base);
  redirect(`${base}?ok=gerado`);
}

export async function revogarCodigoAction(formData: FormData): Promise<void> {
  const userId = await exigirUserId();
  const slug = String(formData.get("slug") ?? "").trim();
  const base = `/painel/comunidades/${encodeURIComponent(slug)}/convite`;

  const r = await revogarCodigoConvite(userId, slug);
  if (!r.ok) redirect("/painel");

  revalidatePath(base);
  redirect(`${base}?ok=revogado`);
}
