"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import {
  adicionarHorario,
  removerHorario,
  horariosDaComunidade,
} from "@/lib/horarios";
import { normalizarGrade, type SugestaoGrade } from "@/lib/ai/grade";
import {
  cancelarOcorrencia,
  alterarLocalOcorrencia,
  desfazerExcecao,
} from "@/lib/ocorrencias";

/**
 * Server Actions dos horários recorrentes (FASE 0 do mapa).
 *
 * Mesmo contrato do resto do painel: a sessão é lida AQUI, no servidor, e o
 * `userId` dela é o que desce pra camada. Server Action é endpoint HTTP como
 * outro qualquer — dono vindo do formulário deixaria qualquer um cadastrar
 * horário em nome de outra comunidade, e horário mexe no mapa público.
 *
 * Vive em sub-rota própria (como `avisos/` e `convite/`) e não no formulário de
 * edição da comunidade: são arquivos novos, sem colidir com quem estiver
 * editando aquele form em paralelo.
 */

/** Revalida o que o horário muda: a própria tela e o mapa público. */
function revalidar(base: string) {
  revalidatePath(base);
  // O mapa é `force-dynamic`, mas revalidar é barato e protege contra o dia em
  // que alguém ligar cache nele — o bug de "cadastrei e não apareceu" já
  // aconteceu neste projeto uma vez (a home era estática).
  revalidatePath("/mapa");
}

export async function adicionarHorarioAction(formData: FormData): Promise<void> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const slug = String(formData.get("slug") ?? "").trim();
  const base = `/painel/comunidades/${encodeURIComponent(slug)}/horarios`;

  const r = await adicionarHorario(sessao.user.id, slug, {
    diaSemana: formData.get("diaSemana"),
    horaInicio: String(formData.get("horaInicio") ?? ""),
    horaFim: String(formData.get("horaFim") ?? ""),
  });

  if (!r.ok && r.motivo === "nao-dono") redirect("/painel");
  if (!r.ok) {
    redirect(`${base}?erro=${encodeURIComponent(r.erro ?? "Não foi possível salvar.")}`);
  }

  revalidar(base);
  redirect(`${base}?ok=1`);
}

export async function removerHorarioAction(formData: FormData): Promise<void> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const slug = String(formData.get("slug") ?? "").trim();
  const base = `/painel/comunidades/${encodeURIComponent(slug)}/horarios`;

  const r = await removerHorario(
    sessao.user.id,
    slug,
    String(formData.get("horarioId") ?? ""),
  );

  if (!r.ok && r.motivo === "nao-dono") redirect("/painel");
  if (!r.ok) {
    redirect(`${base}?erro=${encodeURIComponent(r.erro ?? "Não foi possível remover.")}`);
  }

  revalidar(base);
  redirect(`${base}?ok=1`);
}

// ─── Normalizador por texto (a IA propõe, a pessoa adiciona) ──────────────

export type EstadoGrade =
  | { status: "vazio" }
  | { status: "indisponivel" }
  | { status: "nao-entendi"; observacao: string | null }
  | { status: "ok"; sugestao: SugestaoGrade };

/**
 * Lê o texto colado e devolve a grade sugerida. **Não grava nada.**
 *
 * A escrita continua sendo a `adicionarHorarioAction` acima, uma linha por
 * vez, com a pessoa clicando. Esta action é de LEITURA — é o que mantém a
 * regra "a IA propõe, a pessoa decide" valendo por construção, e não por
 * disciplina de quem mexer no arquivo depois.
 *
 * O dono é conferido mesmo assim, antes de gastar chamada de modelo:
 * `horariosDaComunidade` devolve `null` para comunidade que não é da pessoa.
 * Sem isso, qualquer sessão válida usaria o slug alheio como bilhete para
 * consumir a cota de IA da casa.
 */
export async function sugerirGradeAction(
  _prev: EstadoGrade,
  formData: FormData,
): Promise<EstadoGrade> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const slug = String(formData.get("slug") ?? "").trim();
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return { status: "vazio" };

  const dela = await horariosDaComunidade(sessao.user.id, slug);
  if (dela === null) redirect("/painel");

  // Mesmo padrão de identificação das outras features de IA: atrás de proxy o
  // IP real vem no cabeçalho. Serve só para o teto de custo e morre aqui.
  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "painel";

  const sugestao = await normalizarGrade(texto, ip);
  if (!sugestao) return { status: "indisponivel" };
  if (sugestao.itens.length === 0) {
    return { status: "nao-entendi", observacao: sugestao.observacao };
  }
  return { status: "ok", sugestao };
}

// ─── Exceções de ocorrência (a "sexta chuvosa") ───────────────────────────

/** Lê sessão + slug + monta a base, ou redireciona. Fecha a repetição das três
 *  actions de exceção abaixo. */
async function contextoExcecao(
  formData: FormData,
): Promise<{ userId: string; slug: string; base: string }> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");
  const slug = String(formData.get("slug") ?? "").trim();
  return {
    userId: sessao.user.id,
    slug,
    base: `/painel/comunidades/${encodeURIComponent(slug)}/horarios`,
  };
}

function finalizar(base: string, r: { ok: boolean; motivo?: string; erro?: string }): never {
  if (!r.ok && r.motivo === "nao-dono") redirect("/painel");
  if (!r.ok) {
    redirect(`${base}?erro=${encodeURIComponent(r.erro ?? "Não foi possível salvar.")}`);
  }
  revalidar(base);
  redirect(`${base}?ok=1`);
}

export async function cancelarOcorrenciaAction(formData: FormData): Promise<void> {
  const { userId, slug, base } = await contextoExcecao(formData);
  const r = await cancelarOcorrencia(
    userId,
    slug,
    String(formData.get("horarioId") ?? ""),
    String(formData.get("data") ?? ""),
    String(formData.get("observacao") ?? ""),
  );
  finalizar(base, r);
}

export async function alterarLocalOcorrenciaAction(formData: FormData): Promise<void> {
  const { userId, slug, base } = await contextoExcecao(formData);
  const r = await alterarLocalOcorrencia(
    userId,
    slug,
    String(formData.get("horarioId") ?? ""),
    String(formData.get("data") ?? ""),
    String(formData.get("localAlterado") ?? ""),
    String(formData.get("observacao") ?? ""),
  );
  finalizar(base, r);
}

export async function desfazerExcecaoAction(formData: FormData): Promise<void> {
  const { userId, slug, base } = await contextoExcecao(formData);
  const r = await desfazerExcecao(
    userId,
    slug,
    String(formData.get("excecaoId") ?? ""),
  );
  finalizar(base, r);
}
