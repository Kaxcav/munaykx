"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { comunidadesDoUsuario } from "@/lib/organizacao";
import {
  extrairEventoDeFlyer,
  escolherComunidadeSlug,
  montarStartsAt,
  mediaTypeValido,
  MAX_BYTES_IMAGEM,
} from "@/lib/ai/flyer";

/**
 * FLYER → EVENTO (action). Recebe a imagem, extrai os campos e REDIRECIONA pro
 * formulário de novo evento PRÉ-PREENCHIDO — o mesmo caminho do "marcar o
 * próximo treino". Nunca cria evento aqui: esta action não fala com o Prisma de
 * escrita. Quem salva é o organizador, revisando, pela action de sempre.
 *
 * Owner-scoped: a sessão é lida no servidor; as modalidades vêm das comunidades
 * DA PESSOA (então a IA escolhe entre o que ela realmente tem, e a seleção de
 * comunidade casa). Sem sessão → /entrar.
 */

/** Volta pro form em branco com um aviso — nada foi salvo. */
function falhou(motivo: string): never {
  redirect(`/painel/eventos/novo?flyerFalhou=${encodeURIComponent(motivo)}`);
}

export async function extrairFlyerAction(formData: FormData): Promise<void> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const arquivo = formData.get("flyer");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    falhou("Escolha uma imagem do cartaz.");
  }
  if (arquivo.size > MAX_BYTES_IMAGEM) {
    falhou("Imagem muito grande (máx. 5 MB). Manda um print menor.");
  }
  if (!mediaTypeValido(arquivo.type)) {
    falhou("Formato não suportado. Use PNG, JPG, WEBP ou GIF.");
  }

  const comunidades = await comunidadesDoUsuario(sessao.user.id);
  if (comunidades.length === 0) redirect("/painel");

  // Modalidades das comunidades DA PESSOA (distintas) — a IA escolhe entre o que
  // ela tem, e a seleção de comunidade abaixo casa por modalidade.
  const modalidades = Array.from(new Set(comunidades.map((c) => c.modalidade)));

  const base64 = Buffer.from(await arquivo.arrayBuffer()).toString("base64");

  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "painel";

  // Hoje em Brasília (YYYY-MM-DD) — pra IA inferir o ano quando o cartaz omite.
  const hojeISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const sugestao = await extrairEventoDeFlyer({
    base64,
    mediaType: arquivo.type,
    facetas: { modalidades },
    ip,
    hojeISO,
  });

  if (!sugestao) {
    falhou(
      "Não consegui ler o cartaz com confiança. Preencha o evento normalmente — nada foi salvo.",
    );
  }

  // Monta o pré-preenchimento e manda pro form de sempre, pra REVISÃO humana.
  const params = new URLSearchParams({ doFlyer: "1" });
  const slug = escolherComunidadeSlug(sugestao.modalidade, comunidades);
  if (slug) params.set("comunidade", slug);
  if (sugestao.titulo) params.set("titulo", sugestao.titulo);
  const startsAt = montarStartsAt(sugestao.dataISO, sugestao.hora);
  if (startsAt) params.set("startsAt", startsAt);
  if (sugestao.local) params.set("local", sugestao.local);
  if (sugestao.observacao) params.set("flyerObs", sugestao.observacao);

  redirect(`/painel/eventos/novo?${params.toString()}`);
}
