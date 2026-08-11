import Link from "next/link";
import { linkMarcarTreino, type ItemSemana } from "@/lib/painel-hoje";
import { Secao } from "@/components/comum/Secao";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

/**
 * "ESTA SEMANA" — a linha do tempo do organizador na home do painel. Organiza
 * por FREQUÊNCIA DE USO: o que vem primeiro no topo, com a ação grande à mão.
 *
 * - Ocorrência da grade → "Marcar este treino" (abre o form pré-preenchido).
 * - Evento publicado → confirmados / fila / de 1ª vez + "Avisar o grupo" e
 *   "Check-in".
 */

/** "2026-09-05" → "05/09". */
function diaMes(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

/** Data curta de um evento no fuso de Brasília: "05/09 · 06:15". */
function quandoEvento(d: Date): string {
  const f = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return f.format(d).replace(", ", " · ");
}

export default function EstaSemana({ itens }: { itens: ItemSemana[] }) {
  if (itens.length === 0) return null;

  return (
    <Secao
      titulo="Esta semana"
      destaque
      descricao="Seus próximos encontros. Marque o treino da grade num clique e avise o grupo."
    >
      <ul className="space-y-3">
        {itens.map((item) =>
          item.tipo === "grade" ? (
            <li key={`g-${item.horarioId}-${item.dataISO}`}>
              <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] tabular-nums text-foreground/80">
                    {item.diaSemanaRotulo}, {diaMes(item.dataISO)} ·{" "}
                    {item.horaInicio}
                  </p>
                  <p className="mt-1 font-display text-lg font-bold">
                    {item.comunidadeNome}
                  </p>
                  <p className="text-sm text-foreground/80">
                    Treino da grade
                    {item.localAlterado ? ` · hoje em ${item.localAlterado}` : ""}
                  </p>
                </div>
                <Link
                  href={linkMarcarTreino(item)}
                  className={buttonVariants({ size: "sm" })}
                >
                  Marcar este treino →
                </Link>
              </Card>
            </li>
          ) : (
            <li key={`e-${item.eventId}`}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.14em] tabular-nums text-foreground/80">
                      {quandoEvento(item.startsAt)}
                      {item.local ? ` · ${item.local}` : ""}
                    </p>
                    <p className="mt-1 font-display text-lg font-bold">
                      {item.titulo}
                    </p>
                    <p className="text-sm text-foreground/80">
                      {item.comunidadeNome}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold tabular-nums">
                      {item.confirmados}
                      {item.capacidade ? (
                        <span className="text-foreground/60">
                          /{item.capacidade}
                        </span>
                      ) : null}
                      <span className="ml-1 text-sm font-normal text-foreground/80">
                        confirmado{item.confirmados === 1 ? "" : "s"}
                      </span>
                    </p>
                    <p className="text-sm tabular-nums text-foreground/80">
                      {item.fila > 0 ? `${item.fila} na fila · ` : ""}
                      {item.primeiraVez > 0
                        ? `${item.primeiraVez} de 1ª vez`
                        : "ninguém de 1ª vez ainda"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/painel/comunidades/${encodeURIComponent(item.comunidadeSlug)}/avisos`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    Avisar o grupo
                  </Link>
                  <Link
                    href={`/painel/eventos/${item.eventId}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Check-in e inscritos
                  </Link>
                </div>
              </Card>
            </li>
          ),
        )}
      </ul>
    </Secao>
  );
}
