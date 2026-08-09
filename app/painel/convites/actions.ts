"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { convidar, revogar, convitePorToken } from "@/lib/convites";
import { emailConvite } from "@/lib/emails-convite";
import { dispararEmail } from "@/lib/emails-rsvp";

/**
 * Server Actions dos convites (STORY-009, frente D).
 *
 * A sessão é lida no SERVIDOR; o `userId` nunca vem do form. `lib/convites.ts`
 * confere `souOrganizador` antes de qualquer escrita, então mesmo um POST com
 * `organizationId` de terceiro é barrado (`nao-dono`).
 */

const BASE = "/painel/convites";

async function exigirUserId(): Promise<string> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");
  return sessao.user.id;
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

const MSG_ERRO: Record<string, string> = {
  "nao-dono": "Você não administra essa organização.",
  "email-invalido": "E-mail inválido.",
  "ja-membro": "Essa pessoa já administra a organização.",
};

export async function convidarAction(formData: FormData): Promise<void> {
  const userId = await exigirUserId();
  const organizationId = texto(formData, "organizationId");
  const email = texto(formData, "email");

  const r = await convidar(userId, organizationId, email);
  if (!r.ok) {
    redirect(`${BASE}?erro=${encodeURIComponent(MSG_ERRO[r.motivo] ?? "Não foi possível convidar.")}`);
  }

  // Nome da org pro corpo do e-mail — derivado no servidor, não do form.
  const conv = await convitePorToken(r.dados.token);
  if (conv) {
    dispararEmail(
      emailConvite({ para: email, organizacao: conv.organization.nome, token: r.dados.token }),
    );
  }

  revalidatePath(BASE);
  redirect(`${BASE}?ok=${encodeURIComponent(email)}`);
}

export async function revogarAction(formData: FormData): Promise<void> {
  const userId = await exigirUserId();
  const organizationId = texto(formData, "organizationId");
  const conviteId = texto(formData, "conviteId");

  await revogar(userId, organizationId, conviteId);
  revalidatePath(BASE);
  redirect(`${BASE}?revogado=1`);
}
