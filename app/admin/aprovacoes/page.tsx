import type { Metadata } from "next";
import { assertAdmin } from "@/lib/admin-auth";
import { listarPendentes } from "@/lib/aprovacao";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PaginaAdmin } from "@/components/admin/PaginaAdmin";
import { EstadoVazio } from "@/components/comum/EstadoVazio";
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
    <PaginaAdmin
      eyebrow="Operação"
      titulo="Fila de aprovação"
      descricao={
        <>
          Comunidades cadastradas pelo painel, aguardando revisão.{" "}
          <strong>Aprovar</strong> publica no site na hora;{" "}
          <strong>recusar</strong> mantém fora e avisa o organizador com o
          motivo. Antes de aprovar, confira o texto de autorização aceito.
        </>
      }
    >
      {pendentes.length === 0 ? (
        <EstadoVazio
          titulo="Nada na fila."
          descricao="Nenhuma comunidade pendente de aprovação — o que entrar pelo painel aparece aqui."
        />
      ) : (
        <ul className="mt-8 space-y-5">
          {pendentes.map((c) => (
            <li key={c.id}>
              <Card className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-bold">{c.nome}</h2>
                    <p className="font-mono text-xs text-muted-foreground">
                      /{c.slug}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {c.modalidade} · {c.regiao}
                      {c.organizacao ? ` · ${c.organizacao}` : ""} · cadastrada
                      em {fmtData.format(c.createdAt)}
                    </p>
                  </div>
                </div>

                <Card className="mt-4 bg-muted p-4">
                  <p className="eyebrow">
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
                </Card>

                <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
                  <form action={aprovarAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit">Aprovar e publicar</Button>
                  </form>

                  <form
                    action={recusarAction}
                    className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end"
                  >
                    <input type="hidden" name="id" value={c.id} />
                    <label className="flex-1">
                      <span className="eyebrow mb-1 block">
                        Motivo da recusa (vai no e-mail)
                      </span>
                      <Textarea
                        name="motivo"
                        required
                        rows={2}
                        placeholder="Ex.: precisamos da autorização assinada do responsável pela marca."
                      />
                    </label>
                    <Button type="submit" variant="outline">
                      Recusar
                    </Button>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PaginaAdmin>
  );
}
