import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { rsvpCancelSchema } from "@/lib/rsvps";
import { prisma } from "@/lib/db";
import {
  isSerializationConflict,
  withSerializableRetry,
} from "@/lib/serializable";
import {
  dispararEmail,
  emailRsvpCancelado,
  emailRsvpPromovido,
} from "@/lib/emails-rsvp";

// Cancelamento + promoção de waitlist (STORY-003). Transação Serializable:
// cancelar e promover precisam enxergar o mesmo instante do mundo, senão
// duas pessoas são promovidas pra mesma vaga.

type DadosEvento = {
  titulo: string;
  startsAt: Date;
  local: string | null;
  slug: string;
};

type Pessoa = { nome: string; email: string; token: string };

type Resultado =
  | { erro: 404 }
  | { jaCancelado: true }
  | {
      cancelado: true;
      quemCancelou: Pessoa;
      evento: DadosEvento;
      /** quem saiu da fila nesta transação — precisa ser avisado (STORY-004) */
      promovido: Pessoa | null;
    };

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const parsed = rsvpCancelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Link inválido." }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        error:
          "Inscrições ainda não configuradas. Defina DATABASE_URL (ver .env.example).",
      },
      { status: 503 },
    );
  }

  const { token } = parsed.data;

  try {
    const resultado = await withSerializableRetry(() =>
      prisma.$transaction(
        async (tx): Promise<Resultado> => {
          const rsvp = await tx.rsvp.findUnique({
            where: { token },
            include: { event: true },
          });
          if (!rsvp) return { erro: 404 as const };

          // Idempotente: cancelar de novo não explode nem promove duas vezes.
          if (rsvp.canceledAt !== null) return { jaCancelado: true };

          await tx.rsvp.update({
            where: { id: rsvp.id },
            data: { canceledAt: new Date() },
          });

          // Abriu vaga? Promove o mais antigo da fila — na MESMA transação.
          // Só faz sentido se quem saiu era confirmado, o evento tem
          // capacidade finita e ainda não aconteceu.
          const abreVaga =
            rsvp.status === "confirmado" &&
            rsvp.event.capacidade !== null &&
            rsvp.event.startsAt >= new Date();

          let promovido: Pessoa | null = null;
          if (abreVaga) {
            const confirmados = await tx.rsvp.count({
              where: {
                eventId: rsvp.eventId,
                status: "confirmado",
                canceledAt: null,
              },
            });
            if (confirmados < (rsvp.event.capacidade as number)) {
              const primeiroDaFila = await tx.rsvp.findFirst({
                where: {
                  eventId: rsvp.eventId,
                  status: "lista_espera",
                  canceledAt: null,
                },
                orderBy: { createdAt: "asc" },
              });
              if (primeiroDaFila) {
                await tx.rsvp.update({
                  where: { id: primeiroDaFila.id },
                  data: { status: "confirmado" },
                });
                promovido = {
                  nome: primeiroDaFila.nome,
                  email: primeiroDaFila.email,
                  token: primeiroDaFila.token,
                };
              }
            }
          }

          return {
            cancelado: true,
            quemCancelou: {
              nome: rsvp.nome,
              email: rsvp.email,
              token: rsvp.token,
            },
            evento: {
              titulo: rsvp.event.titulo,
              startsAt: rsvp.event.startsAt,
              local: rsvp.event.local,
              slug: rsvp.event.slug,
            },
            promovido,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );

    if ("erro" in resultado) {
      return NextResponse.json(
        { error: "Inscrição não encontrada." },
        { status: 404 },
      );
    }
    // E-mails DEPOIS do commit — dentro da transação, o retry mandaria
    // duplicado. Dois destinatários distintos: quem saiu e quem entrou.
    if ("cancelado" in resultado) {
      dispararEmail(
        emailRsvpCancelado({
          para: resultado.quemCancelou.email,
          nome: resultado.quemCancelou.nome,
          evento: resultado.evento,
        }),
      );
      if (resultado.promovido) {
        dispararEmail(
          emailRsvpPromovido({
            para: resultado.promovido.email,
            nome: resultado.promovido.nome,
            evento: resultado.evento,
            token: resultado.promovido.token,
          }),
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isSerializationConflict(error)) {
      return NextResponse.json(
        { error: "Muita gente mexendo nesse evento agora. Tenta de novo." },
        { status: 503 },
      );
    }
    console.error(
      "[rsvps/cancel] erro:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Não foi possível cancelar agora. Tenta de novo em instantes." },
      { status: 500 },
    );
  }
}
