import type { Metadata } from "next";
import { assertAdmin } from "@/lib/admin-auth";
import { listarPendentes } from "@/lib/aprovacao";
import { buttonVariants } from "@/components/ui/button";
import { aprovarAction, recusarAction } from "./actions";

export const metadata: Metadata = {
  title: "Fila de aprovação",
  robots: { index: false, follow: false },
};

const fmtData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

/**
 * Fila de aprovação do /admin (STORY-009, frente B).
 *
 * Comunidades que chegaram pelo painel nascem `pendente` e não existem pro
 * mundo até alguém aqui decidir. Aprovar abre as seis portas públicas; recusar
 * mantém fora e avisa o organizador com o motivo. A tela MOSTRA o texto de
 * autorização aceito — sem ele, aprovar o nome de um parceiro real violaria a
 * regra 3 (RODADA §B).
 */
export default async function AdminAprovacoesPage() {
  // O layout já barra, mas o portão não é ponto único de falha.
  await assertAdmin();
  const pendentes = await listarPendentes();

  return (
    <>
      <div>
        <p className="eyebrow mb-3">Operação</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Fila de aprovação
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Comunidades cadastradas pelo painel, aguardando revisão.{" "}
          <strong>Aprovar</strong> publica no site na hora;{" "}
          <strong>recusar</strong> mantém fora e avisa o organizador com o
          motivo. Antes de aprovar, confira o texto de autorização aceito.
        </p>
      </div>

      {pendentes.length === 0 ? (
        <p className="mt-10 text-muted-foreground">
          Nada na fila — nenhuma comunidade pendente de aprovação.
        </p>
      ) : (
        <ul className="mt-8 space-y-5">
          {pendentes.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-petroleo/10 p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold">{c.nome}</h2>
                  <p className="font-mono text-xs text-muted-foreground">
                    /{c.slug}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {c.modalidade} · {c.regiao}
                    {c.organizacao ? ` · ${c.organizacao}` : ""} · cadastrada em{" "}
                    {fmtData.format(c.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-petroleo/10 bg-areia/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Autorização aceita
                  {c.autorizacaoEm ? ` · ${fmtData.format(c.autorizacaoEm)}` : ""}
                </p>
                <p className="mt-1 text-sm">
                  {c.autorizacaoTexto ?? (
                    <span className="text-muted-foreground">
                      — sem texto de autorização registrado —
                    </span>
                  )}
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
                <form action={aprovarAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className={buttonVariants()}>
                    Aprovar e publicar
                  </button>
                </form>

                <form
                  action={recusarAction}
                  className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end"
                >
                  <input type="hidden" name="id" value={c.id} />
                  <label className="flex-1">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Motivo da recusa (vai no e-mail)
                    </span>
                    <textarea
                      name="motivo"
                      required
                      rows={2}
                      placeholder="Ex.: precisamos da autorização assinada do responsável pela marca."
                      className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petroleo/30"
                    />
                  </label>
                  <button
                    type="submit"
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Recusar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
