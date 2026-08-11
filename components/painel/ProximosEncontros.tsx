import type { OcorrenciaConcreta } from "@/lib/ocorrencias";
import { Secao } from "@/components/comum/Secao";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Campo } from "@/components/painel/Campo";
import {
  cancelarOcorrenciaAction,
  alterarLocalOcorrenciaAction,
  desfazerExcecaoAction,
} from "@/app/painel/(interno)/comunidades/[slug]/horarios/actions";

/**
 * PRÓXIMOS ENCONTROS — as datas concretas da grade, onde o organizador cancela
 * ou altera UM dia (a "sexta chuvosa"). Sem isto, cancelar um treino por chuva
 * exigiria apagar a grade toda ou criar-e-cancelar um evento — e o dono perde a
 * confiança na primeira sexta molhada. A grade semanal (o padrão) segue
 * intacta; aqui muda só o dia.
 */

/** "2026-09-05" → "05/09". */
function diaMes(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export default function ProximosEncontros({
  ocorrencias,
  slug,
}: {
  ocorrencias: OcorrenciaConcreta[];
  slug: string;
}) {
  if (ocorrencias.length === 0) return null;

  return (
    <Secao
      titulo="Próximos encontros"
      destaque
      descricao={
        <>
          As próximas datas da sua grade. Choveu, feriado, imprevisto? Cancele ou
          mude o local <strong>só naquele dia</strong> — a grade semanal continua
          como está.
        </>
      }
    >
      <ul className="space-y-2">
        {ocorrencias.map((o) => {
          const rotulo = `${o.diaSemanaRotulo}, ${diaMes(o.dataISO)} às ${o.horaInicio}`;
          return (
            <li key={`${o.horarioId}-${o.dataISO}`}>
              <Card className="px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={
                      o.cancelada
                        ? "font-medium tabular-nums text-foreground/50 line-through"
                        : "font-medium tabular-nums"
                    }
                  >
                    {rotulo}
                  </span>

                  {o.cancelada ? (
                    <span className="inline-flex items-center gap-2">
                      <Badge variant="demo">Cancelado</Badge>
                      <DesfazerBotao
                        slug={slug}
                        excecaoId={o.excecaoId!}
                        rotulo="Reativar"
                      />
                    </span>
                  ) : o.localAlterado ? (
                    <span className="inline-flex items-center gap-2 text-sm">
                      <span className="text-foreground/80">
                        Hoje em: <strong>{o.localAlterado}</strong>
                      </span>
                      <DesfazerBotao
                        slug={slug}
                        excecaoId={o.excecaoId!}
                        rotulo="Voltar ao normal"
                      />
                    </span>
                  ) : (
                    <AcoesDoDia slug={slug} horarioId={o.horarioId} data={o.dataISO} />
                  )}
                </div>

                {o.observacao ? (
                  <p className="mt-2 text-sm text-foreground/80">{o.observacao}</p>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
    </Secao>
  );
}

function DesfazerBotao({
  slug,
  excecaoId,
  rotulo,
}: {
  slug: string;
  excecaoId: string;
  rotulo: string;
}) {
  return (
    <form action={desfazerExcecaoAction}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="excecaoId" value={excecaoId} />
      <Button type="submit" variant="link" size="sm" className="h-auto px-0">
        {rotulo}
      </Button>
    </form>
  );
}

/** As duas ações de um dia normal, escondidas atrás de um disclosure pra não
 *  poluir a lista: cancelar (com motivo opcional) e mudar o local. */
function AcoesDoDia({
  slug,
  horarioId,
  data,
}: {
  slug: string;
  horarioId: string;
  data: string;
}) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold text-primary underline underline-offset-4 hover:opacity-70">
        Cancelar ou mudar
      </summary>
      <Card className="mt-3 space-y-3 bg-secondary p-4">
        <form
          action={cancelarOcorrenciaAction}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="horarioId" value={horarioId} />
          <input type="hidden" name="data" value={data} />
          <Campo
            className="flex-1"
            rotulo="Motivo (opcional, aparece pra quem for)"
          >
            <Input
              name="observacao"
              maxLength={200}
              placeholder="Ex.: cancelado por chuva"
            />
          </Campo>
          <Button type="submit" size="sm">
            Cancelar este dia
          </Button>
        </form>

        <form
          action={alterarLocalOcorrenciaAction}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="horarioId" value={horarioId} />
          <input type="hidden" name="data" value={data} />
          <Campo className="flex-1" rotulo="Mudar o local só neste dia">
            <Input
              name="localAlterado"
              maxLength={200}
              placeholder="Ex.: hoje a saída é do portão 3"
            />
          </Campo>
          <Button type="submit" variant="outline" size="sm">
            Salvar local
          </Button>
        </form>
      </Card>
    </details>
  );
}
