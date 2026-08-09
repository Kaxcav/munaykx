import Link from "next/link";
import { avisosDoAdmin } from "@/lib/posts";
import CorpoAviso from "@/components/CorpoAviso";
import { ocultarAvisoAction, reexibirAvisoAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Moderação do feed de avisos (STORY-010, tarefa 8).
 *
 * Ocultar é reversível; apagar não existe nesta tela — de propósito. O botão
 * precisa existir pro caso de alguém publicar dado pessoal de terceiro às 3h
 * de um sábado, e nesse cenário a decisão certa é tirar do ar agora e revisar
 * depois, não destruir a evidência.
 */
export default async function AdminAvisos({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string; filtro?: string }>;
}) {
  const { ok, erro, filtro } = await searchParams;
  const apenasOcultos = filtro === "ocultos";
  const avisos = await avisosDoAdmin({ apenasOcultos });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Avisos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Feed das comunidades. Ocultar tira de toda superfície — site, agenda
            e e-mail — e é reversível.
          </p>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link
            href="/admin/avisos"
            className={apenasOcultos ? "text-muted-foreground" : "font-semibold underline"}
          >
            Todos
          </Link>
          <Link
            href="/admin/avisos?filtro=ocultos"
            className={apenasOcultos ? "font-semibold underline" : "text-muted-foreground"}
          >
            Só ocultos
          </Link>
        </nav>
      </div>

      {ok === "oculto" ? (
        <p className="mt-6 rounded-lg border p-4 text-sm">Aviso ocultado ✓</p>
      ) : null}
      {ok === "reexibido" ? (
        <p className="mt-6 rounded-lg border p-4 text-sm">Aviso reexibido ✓</p>
      ) : null}
      {erro ? (
        <p className="mt-6 rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
          {erro}
        </p>
      ) : null}

      {avisos.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          {apenasOcultos ? "Nenhum aviso oculto." : "Nenhum aviso publicado ainda."}
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {avisos.map((a) => (
            <li key={a.id} className="rounded-lg border p-5">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {a.createdAt.toLocaleString("pt-BR")} ·{" "}
                <Link
                  href={`/comunidades/${a.comunidade.slug}`}
                  className="underline underline-offset-4"
                >
                  {a.comunidade.nome}
                </Link>{" "}
                · {a.autorNome ?? "autor removido"}
              </p>

              <div className="mt-3">
                <CorpoAviso corpo={a.corpo} />
              </div>

              {a.ocultoEm ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <p className="text-xs text-destructive">
                    Oculto em {a.ocultoEm.toLocaleString("pt-BR")}
                    {a.ocultoPor ? ` por ${a.ocultoPor}` : ""}
                    {a.ocultoMotivo ? ` — ${a.ocultoMotivo}` : ""}
                  </p>
                  <form action={reexibirAvisoAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      className="rounded-full border px-4 py-2 text-xs font-semibold"
                    >
                      Reexibir
                    </button>
                  </form>
                </div>
              ) : (
                <form action={ocultarAvisoAction} className="mt-4 flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={a.id} />
                  <input
                    name="motivo"
                    required
                    minLength={3}
                    maxLength={300}
                    placeholder="Motivo (obrigatório)"
                    className="min-w-[240px] flex-1 rounded-lg border p-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-full border px-4 py-2 text-xs font-semibold"
                  >
                    Ocultar
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
