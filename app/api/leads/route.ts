import { NextResponse } from "next/server";
import { leadSchema } from "@/lib/leads";
import { getSupabaseAdmin } from "@/lib/supabase";

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

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Captação ainda não configurada. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ver README).",
      },
      { status: 503 },
    );
  }

  const { tipo, nome, email, whatsapp, modalidades, regiao, organizacao, modalidade } =
    parsed.data;

  const { error } = await supabase.from("leads").insert({
    tipo,
    nome,
    email,
    whatsapp: whatsapp ?? null,
    modalidades: modalidades || null,
    regiao: regiao || null,
    organizacao: organizacao || null,
    modalidade: modalidade || null,
    origem: "site",
  });

  if (error) {
    // 23505 = unique_violation (email já cadastrado para o mesmo tipo)
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, jaExistia: true });
    }
    console.error("[leads] erro ao gravar:", error.message);
    return NextResponse.json(
      { error: "Não foi possível salvar agora. Tenta de novo em instantes." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
