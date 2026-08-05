import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { leadSchema } from "@/lib/leads";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
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
          "Captação ainda não configurada. Defina DATABASE_URL (ver .env.example).",
      },
      { status: 503 },
    );
  }

  const { tipo, nome, email, whatsapp, modalidades, regiao, organizacao, modalidade } =
    parsed.data;

  try {
    await prisma.lead.create({
      data: {
        tipo,
        nome,
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp ?? null,
        modalidades: modalidades || null,
        regiao: regiao || null,
        organizacao: organizacao || null,
        modalidade: modalidade || null,
        origem: "site",
      },
    });
  } catch (error) {
    // P2002 = unique violation (email já cadastrado para o mesmo tipo)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ ok: true, jaExistia: true });
    }
    console.error(
      "[leads] erro ao gravar:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Não foi possível salvar agora. Tenta de novo em instantes." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
