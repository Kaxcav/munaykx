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
import { Chip } from "@/components/ui/chip";
import { PaginaAdmin } from "@/components/admin/PaginaAdmin";
import { EstadoVazio } from "@/components/comum/EstadoVazio";
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
    <PaginaAdmin
      eyebrow="Operação"
      titulo={
        <>
          Leads{" "}
          <span className="text-muted-foreground tabular-nums">({total})</span>
        </>
      }
      descricao="A métrica dos 500 do edital. Leitura apenas — editar lead não existe de propósito."
      acoes={
        <a href={exportHref} className={buttonVariants({ variant: "outline" })}>
          Exportar CSV
        </a>
      }
    >
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
          <Chip href={href({ ...base, tipo: undefined })} ativo={!tipo} tamanho="sm">
            Todos
          </Chip>
          {TIPOS.map((t) => (
            <Chip
              key={t}
              href={href({ ...base, tipo: t })}
              ativo={tipo === t}
              tamanho="sm"
            >
              {t}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Origem</span>
          <Chip
            href={href({ ...base, origem: undefined })}
            ativo={!origem}
            tamanho="sm"
          >
            Todas
          </Chip>
          {ORIGENS.map((o) => (
            <Chip
              key={o}
              href={href({ ...base, origem: o })}
              ativo={origem === o}
              tamanho="sm"
            >
              {o}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Período</span>
          <Chip
            href={href({ ...base, periodo: undefined })}
            ativo={!periodo}
            tamanho="sm"
          >
            Desde sempre
          </Chip>
          {PERIODOS.map((p) => (
            <Chip
              key={p.valor}
              href={href({ ...base, periodo: p.valor })}
              ativo={periodo === p.valor}
              tamanho="sm"
            >
              Últimos {p.label}
            </Chip>
          ))}
        </div>
      </div>

      {leads.length === 0 ? (
        <EstadoVazio
          titulo={
            total > 0
              ? "Essa página não existe nesse recorte."
              : "Nenhum lead com esse recorte."
          }
          descricao={
            total > 0
              ? `O recorte tem ${total} lead(s), mas não nesta página.`
              : "Afrouxe um filtro ou amplie o período — os filtros vivem na URL, dá pra voltar."
          }
          acao={
            <Chip href="/admin/leads" tamanho="sm">
              Limpar filtros
            </Chip>
          }
        />
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
                    <TableCell className="font-mono text-xs tabular-nums">
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
    </PaginaAdmin>
  );
}
