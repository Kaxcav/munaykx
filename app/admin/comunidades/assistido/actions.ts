"use server";

import { headers } from "next/headers";
import { assertAdmin } from "@/lib/admin-auth";
import { getCommunityFacets } from "@/lib/communities";
import { extrairComunidade, type SugestaoComunidade } from "@/lib/ai/extracao";
import { slugify } from "@/lib/admin";

/**
 * Analisa o texto colado e devolve uma SUGESTÃO — nada mais.
 *
 * Esta action não escreve no banco. Ela lê, propõe, e devolve o resultado pra
 * tela pré-preencher o formulário que já existe. Quem cria a comunidade é o
 * `salvarComunidade` de sempre, disparado por um humano que revisou os campos.
 * "A IA propõe, a pessoa decide" não é slogan aqui: é a ausência de qualquer
 * caminho de escrita neste arquivo.
 */

export type EstadoAssistido =
  | { status: "vazio" }
  | { status: "erro"; mensagem: string }
  | { status: "ok"; sugestao: SugestaoComunidade; slug: string };

export async function analisarTextoAction(
  _prev: EstadoAssistido,
  formData: FormData,
): Promise<EstadoAssistido> {
  await assertAdmin();

  const texto = String(formData.get("texto") ?? "").trim();
  if (texto.length < 20) {
    return {
      status: "erro",
      mensagem: "Cole um texto um pouco maior — bio do Instagram ou o convite do grupo.",
    };
  }

  // Mesmo padrão de identificação da busca: atrás de proxy, o IP real vem no
  // cabeçalho. Sem isso, todo mundo cairia no mesmo balde de teto.
  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "admin";

  const facetas = await getCommunityFacets();
  const sugestao = await extrairComunidade(texto, { modalidades: facetas.modalidades }, ip);

  if (!sugestao) {
    return {
      status: "erro",
      mensagem:
        "Não consegui extrair nada confiável desse texto. Preencha o formulário normalmente — nada foi salvo.",
    };
  }

  return {
    status: "ok",
    sugestao,
    // O slug acompanha o nome sugerido; o humano ajusta se quiser.
    slug: sugestao.nome ? slugify(sugestao.nome) : "",
  };
}
