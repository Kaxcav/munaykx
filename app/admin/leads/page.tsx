import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { pendentesDeAviso, jaAvisados, LOTE_MAX } from "@/lib/lancamento";
import AvisoLancamento from "@/components/admin/AvisoLancamento";
import { formatarDataAdmin } from "@/lib/admin";
import {
  PERIODOS,
  desdeQuando,
  fatia,
  parseBusca,
  parsePagina,
  parsePeriodo,
  query,
} from "@/lib/admin-lista";
import { BuscaAdmin } from "@/components/admin/BuscaAdmin";
import { Paginacao } from "@/components/admin/Paginacao";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TIPOS = ["participante", "organizador"] as const;
const ORIGENS = ["site", "rsvp"] as const;

type Filtros = {
  tipo?: string;
  origem?: string;
  q?: string;
  periodo?: string;
  p?: number;
};

type SearchParams = Promise<{
  tipo?: string;
  origem?: string;
  q?: string;
  periodo?: string;
  p?: string;
}>;

const href = (f: Filtros) => `/admin/leads${query({ ...f })}`;

const chip = (ativo: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    ativo
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border hover:border-primary/40"
  }`;

/** Leads read-only: a métrica dos 500 do edital. Edição não existe de propósito. */
export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [pendentesLancamento, avisadosLancamento] = await Promise.all([
    pendentesDeAviso(),
    jaAvisados(),
  ]);

  const params = await searchParams;
  const tipo = TIPOS.find((t) => t === params.tipo);
  const origem = ORIGENS.find((o) => o === params.origem);
  const q = parseBusca(params.q);
  const periodo = parsePeriodo(params.periodo);
  const pagina = parsePagina(params.p);
  const desde = desdeQuando(periodo);

  const where: Prisma.LeadWhereInput = {
    ...(tipo ? { tipo } : {}),
    ...(origem ? { origem } : {}),
    ...(desde ? { createdAt: { gte: desde } } : {}),
    // Busca no que a pessoa realmente digita procurando alguém: nome e
    // e-mail. `insensitive` porque ninguém lembra a caixa do cadastro.
    ...(q
      ? {
          OR: [
            { nome: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...fatia(pagina),
    }),
    prisma.lead.count({ where }),
  ]);

  // Export leva o recorte, nunca a página — ver nota em lib/admin-lista.ts.
  const exportHref = `/admin/leads/export${query({ tipo, origem, q, periodo })}`;
  const base = { tipo, origem, q, periodo };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Operação</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Leads <span className="text-muted-foreground">({total})</span>
          </h1>
        </div>
        <a
          href={exportHref}
          className={buttonVariants({ variant: "outline" })}
        >
          Exportar CSV
        </a>
      </div>

      {/* A ferramenta de lançamento fica aqui, e não numa tela própria, porque
          é aqui que o dono olha a base antes de decidir. Ela NÃO dispara nada
          sozinha — ver lib/lancamento.ts. */}
      <AvisoLancamento
        pendentes={pendentesLancamento}
        avisados={avisadosLancamento}
        lote={LOTE_MAX}
      />

      <div className="mt-6 space-y-2">
        <BuscaAdmin
          action="/admin/leads"
          valor={q}
          placeholder="Buscar por nome ou e-mail"
          ocultos={{ tipo, origem, periodo }}
        />

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="eyebrow mr-1">Tipo</span>
          <Link href={href({ ...base, tipo: undefined })} className={chip(!tipo)}>
            Todos
          </Link>
          {TIPOS.map((t) => (
            <Link
              key={t}
              href={href({ ...base, tipo: t })}
              className={chip(tipo === t)}
            >
              {t}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Origem</span>
          <Link
            href={href({ ...base, origem: undefined })}
            className={chip(!origem)}
          >
            Todas
          </Link>
          {ORIGENS.map((o) => (
            <Link
              key={o}
              href={href({ ...base, origem: o })}
              className={chip(origem === o)}
            >
              {o}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Período</span>
          <Link
            href={href({ ...base, periodo: undefined })}
            className={chip(!periodo)}
          >
            Desde sempre
          </Link>
          {PERIODOS.map((p) => (
            <Link
              key={p.valor}
              href={href({ ...base, periodo: p.valor })}
              className={chip(periodo === p.valor)}
            >
              Últimos {p.label}
            </Link>
          ))}
        </div>
      </div>

      {leads.length === 0 ? (
        <p className="mt-10 text-muted-foreground">
          {total > 0
            ? "Essa página não existe nesse recorte."
            : "Nenhum lead com esse recorte."}
        </p>
      ) : (
        <>
          <div className="mt-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Interesses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs">
                      {formatarDataAdmin(l.createdAt)}
                    </TableCell>
                    <TableCell className="font-semibold">{l.nome}</TableCell>
                    <TableCell>
                      <a
                        href={`mailto:${l.email}`}
                        className="underline underline-offset-4 hover:text-muted-foreground"
                      >
                        {l.email}
                      </a>
                    </TableCell>
                    <TableCell>{l.whatsapp ?? "—"}</TableCell>
                    <TableCell>{l.tipo}</TableCell>
                    <TableCell className="font-mono text-xs">{l.origem}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {[l.modalidades, l.regiao, l.organizacao, l.modalidade]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Paginacao
            total={total}
            pagina={pagina}
            href={(p) => href({ ...base, p })}
          />
        </>
      )}
    </>
  );
}
