import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * CSV de RSVPs (protegido pelo Basic Auth do middleware, como todo /admin).
 * Respeita os mesmos filtros da listagem: ?status= e ?evento= (slug).
 * O token NÃO sai no export de propósito — ele autoriza cancelar a inscrição.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const evento = url.searchParams.get("evento");

  const status =
    statusParam === "confirmado" || statusParam === "lista_espera"
      ? statusParam
      : undefined;

  const where: Prisma.RsvpWhereInput = {
    ...(status ? { status } : {}),
    ...(evento ? { event: { slug: evento } } : {}),
  };

  const rsvps = await prisma.rsvp.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { event: { select: { titulo: true, slug: true } } },
  });

  const csv = toCsv(
    [
      "criado_em",
      "evento",
      "evento_slug",
      "nome",
      "email",
      "whatsapp",
      "status",
      "cancelado_em",
    ],
    rsvps.map((r) => [
      r.createdAt.toISOString(),
      r.event.titulo,
      r.event.slug,
      r.nome,
      r.email,
      r.whatsapp,
      r.status,
      r.canceledAt?.toISOString() ?? null,
    ]),
  );

  // BOM: Excel pt-BR só reconhece UTF-8 com ele.
  return new Response(String.fromCharCode(0xfeff) + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="munay-rsvps.csv"',
    },
  });
}
