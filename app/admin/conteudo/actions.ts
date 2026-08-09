"use server";

import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/admin-auth";
import { REGISTRO, ehChave } from "@/lib/conteudo/registro";
import { publicar, reverterPara, salvarRascunho } from "@/lib/conteudo/admin";

/**
 * Server Actions do editor de conteúdo (ULTRAPLAN, Onda 1).
 *
 * `assertAdmin()` PRIMEIRO em toda action — o middleware cobre `/admin/*`, mas
 * não pode ser ponto único de falha (a mesma regra que o PR #18 aplicou ao
 * resto do /admin). Aqui vale ainda mais: este é o endpoint que muda o que o
 * site público mostra.
 *
 * `quem` é a credencial do Basic Auth. Compartilhada, então o audit log
 * registra a credencial e não uma pessoa — é a identidade que existe de
 * verdade (D2 do ULTRAPLAN).
 */

function quemEdita(): string {
  return process.env.ADMIN_USER ?? "admin";
}

const MAX_FUNDADORES = 6;

/**
 * Monta o valor a partir do formulário, no formato que o Zod da chave espera.
 *
 * A validação REAL é do registro — isto aqui só transporta. Nunca confiar
 * nesta função como barreira: `salvarRascunho`/`publicar` revalidam tudo, e é
 * lá que a barreira está.
 */
function valorDoForm(chave: string, formData: FormData): unknown {
  if (!ehChave(chave)) return null;

  if (REGISTRO[chave].tipo === "lista-fundadores") {
    const lista: unknown[] = [];
    for (let i = 0; i < MAX_FUNDADORES; i++) {
      const nome = String(formData.get(`nome_${i}`) ?? "").trim();
      // Linha sem nome é linha vazia do formulário — não é erro, é ausência.
      if (!nome) continue;
      lista.push({
        nome,
        papel: String(formData.get(`papel_${i}`) ?? "").trim(),
        instagram: String(formData.get(`instagram_${i}`) ?? "").trim(),
        link: String(formData.get(`link_${i}`) ?? "").trim(),
        autorizadoPor: String(formData.get(`autorizadoPor_${i}`) ?? "").trim(),
      });
    }
    return lista;
  }

  return String(formData.get("valor") ?? "").trim();
}

function destino(chave: string, extra = ""): string {
  return `/admin/conteudo?chave=${encodeURIComponent(chave)}${extra}`;
}

export async function salvarRascunhoAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const chave = String(formData.get("chave") ?? "");
  const r = await salvarRascunho(chave, valorDoForm(chave, formData), quemEdita());

  if (!r.ok) {
    redirect(destino(chave, `&erro=${encodeURIComponent(r.erro ?? "Valor inválido.")}`));
  }
  redirect(destino(chave, "&ok=rascunho"));
}

export async function publicarAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const chave = String(formData.get("chave") ?? "");
  const r = await publicar(chave, valorDoForm(chave, formData), quemEdita());

  if (!r.ok) {
    redirect(destino(chave, `&erro=${encodeURIComponent(r.erro ?? "Valor inválido.")}`));
  }
  redirect(destino(chave, "&ok=publicado"));
}

/** Publica um rascunho já salvo, sem reescrever o formulário. */
export async function publicarRascunhoAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const versaoId = String(formData.get("versaoId") ?? "");
  const chave = String(formData.get("chave") ?? "");
  const r = await reverterPara(versaoId, quemEdita());

  if (!r.ok) {
    redirect(
      destino(chave, `&erro=${encodeURIComponent(r.erro ?? "Não foi possível publicar.")}`),
    );
  }
  redirect(destino(chave, "&ok=publicado"));
}

/**
 * ROLLBACK. Republica o valor de uma versão anterior — cria versão nova, nunca
 * apaga, então o histórico registra a reversão e quem reverteu.
 */
export async function reverterAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const versaoId = String(formData.get("versaoId") ?? "");
  const chave = String(formData.get("chave") ?? "");
  const r = await reverterPara(versaoId, quemEdita());

  if (!r.ok) {
    redirect(
      destino(
        chave,
        `&erro=${encodeURIComponent(r.erro ?? "Esta versão não vale mais no formato atual.")}`,
      ),
    );
  }
  redirect(destino(chave, "&ok=revertido"));
}
