"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { definirAviso } from "@/lib/membership";

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
