"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { criarComunidade, type CadastroFormState } from "@/lib/cadastro";

/**
 * Cadastro de comunidade pelo painel (STORY-009, frente A).
 *
 * A SESSÃO É LIDA AQUI, NO SERVIDOR, e o `userId` NUNCA vem do formulário.
 * Server Action é endpoint HTTP como qualquer outro: aceitar um `userId` do
 * corpo deixaria qualquer pessoa cadastrar comunidade em nome de outra conta —
 * e sair como organizadora dela, com acesso à lista de inscritos.
 */
export async function cadastrarComunidade(
  _prev: CadastroFormState,
  formData: FormData,
): Promise<CadastroFormState> {
  const sessao = await sessaoAtual();
  if (!sessao) {
    // Sessão expirada no meio do preenchimento, ou auth indisponível. Não é
    // erro de dado: a pessoa precisa entrar de novo.
    return {
      error:
        "Sua sessão expirou. Entra de novo e o formulário continua valendo.",
    };
  }

  // "?? \"\"": campo ausente no POST vira vazio, e aí o Zod responde com a
  // mensagem de negócio em vez de "expected string, received null".
  const resultado = await criarComunidade(sessao.user.id, {
    nome: formData.get("nome") ?? "",
    modalidade: formData.get("modalidade") ?? "",
    regiao: formData.get("regiao") ?? "",
    city: formData.get("city") ?? "",
    descricao: formData.get("descricao") ?? "",
    horarios: formData.get("horarios") ?? "",
    local: formData.get("local") ?? "",
    nivel: formData.get("nivel") ?? "",
    // Checkbox desmarcado não é enviado no POST — vira `false`, e o
    // `z.literal(true)` do schema reprova com a mensagem certa.
    autorizacao: formData.get("autorizacao") === "on",
  });

  if (!resultado.ok) return { error: resultado.error };

  // A comunidade nasce `pendente`, então nada muda nas páginas públicas ainda.
  // Revalidamos assim mesmo porque a aprovação (frente B) não passa por aqui e
  // o cache desta rota precisa refletir o cadastro novo.
  revalidatePath("/painel/nova");

  // Não redireciona pro `/painel`: essa tela é da frente C e ainda não existe.
  // Mandar pra 404 depois de cadastrar seria a pior primeira impressão
  // possível. O `?ok=` devolve pra esta mesma página, em estado de sucesso.
  redirect(`/painel/nova?ok=${encodeURIComponent(resultado.slug)}`);
}
