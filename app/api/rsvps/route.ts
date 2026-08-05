import { NextResponse } from "next/server";
import { Prisma, type RsvpStatus } from "@prisma/client";
import { rsvpSchema } from "@/lib/rsvps";
import { prisma } from "@/lib/db";

// Serializable evita overbooking em RSVPs simultâneos; conflitos de
// serialização (P2034) são esperados e resolvidos com retry + backoff.
const MAX_TENTATIVAS = 5;

function backoff(tentativa: number) {
  const ms = tentativa * 30 + Math.random() * 70;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      const resultado = await prisma.$transaction(
        async (tx) => {
          const evento = await tx.event.findFirst({
            where: { slug: eventSlug, ativo: true },
          });
          if (!evento) return { erro: 404 as const };
          if (evento.startsAt < new Date()) return { erro: 410 as const };

          let status: RsvpStatus = "confirmado";
          if (evento.capacidade !== null) {
            const confirmados = await tx.rsvp.count({
              where: { eventId: evento.id, status: "confirmado" },
            });
            if (confirmados >= evento.capacidade) status = "lista_espera";
          }

          await tx.rsvp.create({
            data: {
              eventId: evento.id,
              nome,
              email,
              whatsapp: whatsapp ?? null,
              status,
            },
          });

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

          return { status };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      if ("erro" in resultado) {
        return resultado.erro === 404
          ? NextResponse.json(
              { error: "Evento não encontrado." },
              { status: 404 },
            )
          : NextResponse.json(
              { error: "Esse evento já aconteceu." },
              { status: 410 },
            );
      }

      return NextResponse.json({ ok: true, status: resultado.status });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002 = unique violation (e-mail já inscrito neste evento)
        if (error.code === "P2002") {
          return NextResponse.json({ ok: true, jaExistia: true });
        }
        // P2034 = conflito de serialização — espera um pouco e tenta de novo
        if (error.code === "P2034" && tentativa < MAX_TENTATIVAS) {
          await backoff(tentativa);
          continue;
        }
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

  return NextResponse.json(
    { error: "Muita gente se inscrevendo ao mesmo tempo. Tenta de novo." },
    { status: 503 },
  );
}
