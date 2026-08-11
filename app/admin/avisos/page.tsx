import Link from "next/link";
import { avisosDoAdmin } from "@/lib/posts";
import CorpoAviso from "@/components/CorpoAviso";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { PaginaAdmin } from "@/components/admin/PaginaAdmin";
import { EstadoVazio } from "@/components/comum/EstadoVazio";
import { ocultarAvisoAction, reexibirAvisoAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Moderação do feed de avisos (STORY-010, tarefa 8).
 *
 * Ocultar é reversível; apagar não existe nesta tela — de propósito. O botão
 * precisa existir pro caso de alguém publicar dado pessoal de terceiro às 3h
 * de um sábado, e nesse cenário a decisão certa é tirar do ar agora e revisar
 * depois, não destruir a evidência.
 *
 * O par Todos/Só ocultos virou `<Chip>` do DS: era um `<Link>` com
 * `font-semibold underline` ternário, que é uma pílula de filtro disfarçada de
 * link de texto. Chip é a peça que a MUNAY já usa pra filtro na descoberta, e
 * o filtro continua vivendo na URL.
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
    <PaginaAdmin
      eyebrow="Operação"
      titulo="Avisos"
      descricao="Feed das comunidades. Ocultar tira de toda superfície — site, agenda e e-mail — e é reversível."
      acoes={
        <>
          <Chip href="/admin/avisos" ativo={!apenasOcultos} tamanho="sm">
            Todos
          </Chip>
          <Chip
            href="/admin/avisos?filtro=ocultos"
            ativo={apenasOcultos}
            tamanho="sm"
          >
            Só ocultos
          </Chip>
        </>
      }
    >
      {ok === "oculto" ? (
        <Card className="mt-6 p-4 text-sm">Aviso ocultado ✓</Card>
      ) : null}
      {ok === "reexibido" ? (
        <Card className="mt-6 p-4 text-sm">Aviso reexibido ✓</Card>
      ) : null}
      {erro ? (
        <Card className="mt-6 border-destructive/40 p-4 text-sm text-destructive">
          {erro}
        </Card>
      ) : null}

      {avisos.length === 0 ? (
        <EstadoVazio
          titulo={apenasOcultos ? "Nenhum aviso oculto." : "Nenhum aviso publicado ainda."}
          descricao={
            apenasOcultos
              ? "Nada foi tirado do ar — é o estado saudável desta fila."
              : "Quando uma comunidade publicar no feed dela, o aviso aparece aqui pra moderação."
          }
        />
      ) : (
        <ul className="mt-8 space-y-4">
          {avisos.map((a) => (
            <li key={a.id}>
              <Card className="p-5">
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
                      <Button type="submit" variant="outline" size="sm">
                        Reexibir
                      </Button>
                    </form>
                  </div>
                ) : (
                  <form
                    action={ocultarAvisoAction}
                    className="mt-4 flex flex-wrap gap-2"
                  >
                    <input type="hidden" name="id" value={a.id} />
                    <Input
                      name="motivo"
                      required
                      minLength={3}
                      maxLength={300}
                      placeholder="Motivo (obrigatório)"
                      aria-label="Motivo para ocultar"
                      className="min-w-[15rem] flex-1"
                    />
                    <Button type="submit" variant="outline">
                      Ocultar
                    </Button>
                  </form>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PaginaAdmin>
  );
}
