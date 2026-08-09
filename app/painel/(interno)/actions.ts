"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { marcarPresenca } from "@/lib/organizacao";
import {
  cancelarEvento,
  criarEvento,
  editarComunidade,
  editarEvento,
} from "@/lib/painel";

/**
 * Server Actions do painel do organizador (STORY-009, frente C).
 *
 * TODA action lê a sessão AQUI, no servidor (`sessaoAtual()`), e passa o
 * `userId` dela pra camada. NUNCA existe `userId` vindo do formulário — Server
 * Action é endpoint HTTP como outro qualquer, e aceitar dono do corpo deixaria
 * qualquer um agir em nome de outra conta. Sem sessão → volta pro /entrar.
 */

async function exigirUserId(): Promise<string> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");
  return sessao.user.id;
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

export async function editarComunidadeAction(formData: FormData): Promise<void> {
  const userId = await exigirUserId();
  const slug = texto(formData, "slug");
  const r = await editarComunidade(userId, slug, {
    descricao: texto(formData, "descricao"),
    horarios: texto(formData, "horarios"),
    local: texto(formData, "local"),
    nivel: texto(formData, "nivel"),
    ativo: formData.get("ativo") === "on",
  });
  if (!r.ok && r.motivo === "nao-dono") redirect("/painel");
  const base = `/painel/comunidades/${encodeURIComponent(slug)}`;
  if (!r.ok) redirect(`${base}?erro=${encodeURIComponent(r.erro ?? "Não foi possível salvar.")}`);
  revalidatePath(base);
  revalidatePath(`/comunidades/${slug}`);
  redirect(`${base}?ok=1`);
}

function entradaEvento(formData: FormData) {
  return {
    communityId: texto(formData, "communityId"),
    titulo: texto(formData, "titulo"),
    slug: texto(formData, "slug"),
    startsAt: texto(formData, "startsAt"),
    city: texto(formData, "city"),
    local: texto(formData, "local"),
    capacidade: texto(formData, "capacidade"),
    gratuito: formData.get("gratuito") === "on",
    demo: false,
    ativo: true,
  };
}

export async function criarEventoAction(formData: FormData): Promise<void> {
  const userId = await exigirUserId();
  const r = await criarEvento(userId, entradaEvento(formData));
  if (!r.ok && r.motivo === "nao-dono") redirect("/painel");
  if (!r.ok) {
    const slugCom = texto(formData, "comunidadeSlug");
    redirect(
      `/painel/eventos/novo?comunidade=${encodeURIComponent(slugCom)}&erro=${encodeURIComponent(r.erro ?? "Não foi possível criar.")}`,
    );
  }
  revalidatePath("/painel");
  redirect(`/painel/eventos/${r.dados.id}`);
}

export async function editarEventoAction(formData: FormData): Promise<void> {
  const userId = await exigirUserId();
  const id = texto(formData, "id");
  const r = await editarEvento(userId, id, entradaEvento(formData));
  if (!r.ok && r.motivo === "nao-dono") redirect("/painel");
  const base = `/painel/eventos/${encodeURIComponent(id)}`;
  if (!r.ok) redirect(`${base}?erro=${encodeURIComponent(r.erro ?? "Não foi possível salvar.")}`);
  revalidatePath(base);
  redirect(`${base}?ok=1`);
}

export async function cancelarEventoAction(formData: FormData): Promise<void> {
  const userId = await exigirUserId();
  const id = texto(formData, "id");
  const r = await cancelarEvento(userId, id);
  if (!r.ok && r.motivo === "nao-dono") redirect("/painel");
  const base = `/painel/eventos/${encodeURIComponent(id)}`;
  revalidatePath(base);
  redirect(`${base}?cancelado=1`);
}

export async function marcarCheckinAction(formData: FormData): Promise<void> {
  const userId = await exigirUserId();
  const rsvpId = texto(formData, "rsvpId");
  const eventoId = texto(formData, "eventoId");
  const presente = formData.get("presente") === "1";
  // marcarPresenca já é escopado por dono (devolve false se o RSVP não é de um
  // evento da pessoa) e idempotente. Não precisamos do retorno pra UI: a página
  // relê o estado real do banco.
  await marcarPresenca(userId, rsvpId, presente);
  redirect(`/painel/eventos/${encodeURIComponent(eventoId)}`);
}
