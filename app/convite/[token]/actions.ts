"use server";

import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { aceitar } from "@/lib/convites";

/**
 * Aceite do convite. A sessão é lida no SERVIDOR e o e-mail dela é o que
 * `aceitar` compara com o do convite — o titular do convite nunca vem do form.
 */
const MSG_ERRO: Record<string, string> = {
  inexistente: "Convite inválido ou revogado.",
  expirado: "Este convite expirou.",
  "ja-usado": "Este convite já foi usado.",
  "nao-e-seu": "Este convite é para outro e-mail. Entre com a conta convidada.",
};

export async function aceitarAction(formData: FormData): Promise<void> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const token = String(formData.get("token") ?? "").trim();
  const r = await aceitar(sessao.user.id, sessao.user.email, token);

  if (r.ok) redirect("/painel/convites?bemvindo=1");

  redirect(
    `/convite/${encodeURIComponent(token)}?erro=${encodeURIComponent(MSG_ERRO[r.motivo] ?? "Não foi possível aceitar.")}`,
  );
}
