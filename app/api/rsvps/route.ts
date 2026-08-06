import { NextResponse } from "next/server";
import { Prisma, type RsvpStatus } from "@prisma/client";
import { rsvpSchema } from "@/lib/rsvps";
import { prisma } from "@/lib/db";
import {
  isSerializationConflict,
  withSerializableRetry,
} from "@/lib/serializable";

// Serializable evita overbooking em RSVPs simultâneos; conflitos de
// serialização (P2034) são retentados pelo withSerializableRetry (lib/).

type Resultado =
  | { erro: 404 | 410 }
  | { jaExistia: true }
  | { status: RsvpStatus; token: string | null };

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const parsed = rsvpSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  // Honeypot preenchido → bot. Responde 200 sem gravar (não dá pista ao spammer).
  if (parsed.data.site) {
    return NextResponse.json({ ok: true });
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

  const { eventSlug, nome, whatsapp } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  try {
    const resultado = await withSerializableRetry(() =>
      prisma.$transaction(
        async (tx): Promise<Resultado> => {
          const evento = await tx.event.findFirst({
            where: { slug: eventSlug, ativo: true },
          });
          if (!evento) return { erro: 404 as const };
          if (evento.startsAt < new Date()) return { erro: 410 as const };

          const existente = await tx.rsvp.findUnique({
            where: { eventId_email: { eventId: evento.id, email } },
          });
          if (existente && existente.canceledAt === null) {
            return { jaExistia: true };
          }

          let status: RsvpStatus = "confirmado";
          if (evento.capacidade !== null) {
            const confirmados = await tx.rsvp.count({
              where: {
                eventId: evento.id,
                status: "confirmado",
                canceledAt: null,
              },
            });
            if (confirmados >= evento.capacidade) status = "lista_espera";
          }

          let token: string | null = null;
          if (existente) {
            // Reinscrição após cancelamento: reativa a mesma linha. createdAt
            // vira "agora" de propósito — a posição na fila é de quem chega,
            // não vale guardar lugar de uma inscrição cancelada.
            await tx.rsvp.update({
              where: { id: existente.id },
              data: {
                canceledAt: null,
                status,
                nome,
                whatsapp: whatsapp ?? null,
                createdAt: new Date(),
              },
            });
            // token não volta na reinscrição: e-mail digitado não é e-mail
            // provado — devolver o link aqui permitiria sequestrar a inscrição
            // de outra pessoa. (STORY-004 manda o link por e-mail.)
          } else {
            const novo = await tx.rsvp.create({
              data: {
                eventId: evento.id,
                nome,
                email,
                whatsapp: whatsapp ?? null,
                status,
              },
            });
            token = novo.token;
          }

          // Quem faz RSVP entra na base de leads (origem rsvp) — sem
          // sobrescrever quem já se cadastrou pelo site.
          await tx.lead.upsert({
            where: { email_tipo: { email, tipo: "participante" } },
            update: {},
            create: {
              tipo: "participante",
              nome,
              email,
              whatsapp: whatsapp ?? null,
              origem: "rsvp",
            },
          });

          return { status, token };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );

    if ("erro" in resultado) {
      return resultado.erro === 404
        ? NextResponse.json({ error: "Evento não encontrado." }, { status: 404 })
        : NextResponse.json(
            { error: "Esse evento já aconteceu." },
            { status: 410 },
          );
    }
    if ("jaExistia" in resultado) {
      return NextResponse.json({ ok: true, jaExistia: true });
    }
    return NextResponse.json({
      ok: true,
      status: resultado.status,
      token: resultado.token,
    });
  } catch (error) {
    // P2002 = unique violation (corrida entre duas inscrições do mesmo e-mail)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ ok: true, jaExistia: true });
    }
    // Conflito de serialização persistiu além do retry — concorrência alta
    if (isSerializationConflict(error)) {
      return NextResponse.json(
        { error: "Muita gente se inscrevendo ao mesmo tempo. Tenta de novo." },
        { status: 503 },
      );
    }
    console.error(
      "[rsvps] erro ao gravar:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Não foi possível salvar agora. Tenta de novo em instantes." },
      { status: 500 },
    );
  }
}
