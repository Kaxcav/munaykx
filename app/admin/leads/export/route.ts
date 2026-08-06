import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/admin";
import { desdeQuando, parseBusca, parsePeriodo } from "@/lib/admin-lista";

export const dynamic = "force-dynamic";

/**
 * CSV de leads (protegido pelo Basic Auth do middleware, como todo /admin).
 * Respeita os mesmos filtros da listagem: ?tipo=, ?origem=, ?q= e ?periodo=.
 *
 * A paginação (?p=) é ignorada de propósito: quem exporta quer o recorte
 * inteiro, não os 50 da tela.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tipoParam = url.searchParams.get("tipo");
  const origem = url.searchParams.get("origem");
  const q = parseBusca(url.searchParams.get("q") ?? undefined);
  const desde = desdeQuando(parsePeriodo(url.searchParams.get("periodo") ?? undefined));

  const tipo =
    tipoParam === "participante" || tipoParam === "organizador"
      ? tipoParam
      : undefined;

  const where: Prisma.LeadWhereInput = {
    ...(tipo ? { tipo } : {}),
    ...(origem ? { origem } : {}),
    ...(desde ? { createdAt: { gte: desde } } : {}),
    ...(q
      ? {
          OR: [
            { nome: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(
    [
      "criado_em",
      "tipo",
      "nome",
      "email",
      "whatsapp",
      "modalidades",
      "regiao",
      "organizacao",
      "modalidade",
      "origem",
    ],
    leads.map((l) => [
      l.createdAt.toISOString(),
      l.tipo,
      l.nome,
      l.email,
      l.whatsapp,
      l.modalidades,
      l.regiao,
      l.organizacao,
      l.modalidade,
      l.origem,
    ]),
  );

  // BOM: Excel pt-BR só reconhece UTF-8 com ele.
  return new Response(String.fromCharCode(0xfeff) + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="munay-leads.csv"',
    },
  });
}
