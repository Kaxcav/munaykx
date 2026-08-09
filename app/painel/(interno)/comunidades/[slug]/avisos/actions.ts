"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { publicarAviso } from "@/lib/posts";
import { dispararAvisosDePostNovo } from "@/lib/avisos-post";

/**
 * Server Actions do feed de avisos (STORY-010, tarefa 4).
 *
 * Mesmo contrato do resto do painel: a sessão é lida AQUI, no servidor, e o
 * `userId` dela é o que vai pra camada. Server Action é endpoint HTTP como
 * outro qualquer — dono vindo do formulário deixaria qualquer um publicar em
 * nome de outra comunidade.
 *
 * O e-mail sai **depois** da escrita, via `dispararAvisosDePostNovo`
 * (fire-and-forget). Padrão permanente do projeto: e-mail nunca sai de dentro
 * da transação — a de RSVP tem retry, e enviar lá dentro faria a pessoa
 * receber o mesmo e-mail a cada repetição.
 */
export async function publicarAvisoAction(formData: FormData): Promise<void> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const slug = String(formData.get("slug") ?? "").trim();
  const base = `/painel/comunidades/${encodeURIComponent(slug)}/avisos`;

  const r = await publicarAviso(sessao.user.id, slug, {
    corpo: String(formData.get("corpo") ?? ""),
  });

  if (!r.ok && r.motivo === "nao-dono") redirect("/painel");
  if (!r.ok) {
    redirect(`${base}?erro=${encodeURIComponent(r.erro ?? "Não foi possível publicar.")}`);
  }

  dispararAvisosDePostNovo(r.dados.id);

  revalidatePath(base);
  revalidatePath(`/comunidades/${slug}`);
  redirect(`${base}?ok=1`);
}
