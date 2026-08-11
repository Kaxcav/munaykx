import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PerfilForm, { type PerfilInicial } from "@/components/perfil/PerfilForm";
import { Pagina } from "@/components/comum/Pagina";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { sessaoAtual } from "@/lib/sessao";
import { perguntasDoDia } from "@/lib/perfil-perguntas";
import { inferirPerfil } from "@/lib/inteligencia";
import { classesDoAcento } from "@/lib/modalidades";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meu perfil",
  // `noindex` obrigatório: a página mostra dado pessoal. Mesmo exigindo
  // sessão, robô que siga um link vazado não pode indexar isso.
  robots: { index: false, follow: false },
};

/** Date → "1998-03-15", que é o formato que `<input type="date">` espera. */
function paraCampoData(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

/** JSONB → Record<string,string>, tolerante a lixo antigo. */
function paraRespostas(valor: unknown): Record<string, string> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  const saida: Record<string, string> = {};
  for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
    if (typeof v === "string") saida[k] = v;
  }
  return saida;
}

export default async function PerfilPage() {
  // Mesmo contrato do `/minhas-inscricoes`: auth desligada = ninguém logado,
  // e a pessoa vai pro `/entrar`, que explica a situação. Nunca 500.
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const usuario = await prisma.user.findUnique({
    where: { id: sessao.user.id },
    select: {
      name: true,
      email: true,
      apelido: true,
      nascimento: true,
      genero: true,
      telefone: true,
      cep: true,
      cidade: true,
      uf: true,
      bio: true,
      perfilPublico: true,
      interesses: true,
      respostas: true,
      consentiuCadastro: true,
      consentiuRecomendacao: true,
      consentiuInsights: true,
    },
  });

  if (!usuario) redirect("/entrar");

  const respostas = paraRespostas(usuario.respostas);

  const inicial: PerfilInicial = {
    nome: usuario.name ?? "",
    apelido: usuario.apelido ?? "",
    nascimento: paraCampoData(usuario.nascimento),
    genero: usuario.genero ?? "",
    telefone: usuario.telefone ?? "",
    cep: usuario.cep ?? "",
    cidade: usuario.cidade ?? "",
    uf: usuario.uf ?? "",
    bio: usuario.bio ?? "",
    perfilPublico: usuario.perfilPublico,
    interesses: usuario.interesses ?? [],
    respostas,
    consentiuCadastro: usuario.consentiuCadastro !== null,
    consentiuRecomendacao: usuario.consentiuRecomendacao !== null,
    consentiuInsights: usuario.consentiuInsights !== null,
  };

  const perguntas = perguntasDoDia(sessao.user.id, respostas);

  // Item 10 — o que o histórico REAL diz. A pessoa vendo o próprio dado não
  // depende de opt-in; o que depende é usar isso pra recomendar (ver a nota
  // em lib/inteligencia.ts).
  const inferido = await inferirPerfil(sessao.user.id, inicial.interesses);

  return (
    <>
      <Header />
      <Pagina
        eyebrow="Sua conta"
        titulo="Meu perfil"
        descricao={
          <>
            Conta logada com <strong>{usuario.email}</strong>. Preenche o que
            quiser — nada aqui é obrigatório e dá pra voltar depois.
          </>
        }
      >
        {inferido.total > 0 && (
          <Card className="mt-10 border-salvia/40 bg-salvia-soft p-6">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-foreground/55">
              O que seu histórico diz
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/75">
              Isto vem das suas {inferido.total}{" "}
              {inferido.total === 1 ? "inscrição" : "inscrições"} — o que você
              fez, não o que você marcou. Só você vê.
            </p>

            <ul className="mt-4 flex flex-wrap gap-2">
              {inferido.sinais.slice(0, 6).map((s) => {
                const cor = classesDoAcento(s.acento);
                return (
                  <li
                    key={s.modalidade}
                    className={`rounded-full border px-4 py-1.5 text-sm ${cor.fundo} ${cor.borda} ${cor.tinta}`}
                  >
                    {s.modalidade}{" "}
                    <span className="font-mono text-xs opacity-70">×{s.vezes}</span>
                  </li>
                );
              })}
            </ul>

            {inferido.sugestoesDeTag.length > 0 && (
              <p className="mt-4 text-sm text-foreground/75">
                Você já foi em{" "}
                <strong>
                  {inferido.sugestoesDeTag.map((s) => s.rotulo).join(", ")}
                </strong>{" "}
                e ainda não marcou {inferido.sugestoesDeTag.length === 1 ? "essa tag" : "essas tags"} ali embaixo. Bora marcar?
              </p>
            )}
          </Card>
        )}

        <div className="mt-12">
          <PerfilForm inicial={inicial} perguntas={perguntas} />
        </div>

        <p className="mt-12 max-w-2xl text-xs leading-relaxed text-foreground/50">
          A MUNAY trata seus dados conforme a LGPD. Você pode consultar,
          corrigir ou apagar o que está aqui a qualquer momento — pela própria
          página ou falando com a gente. Detalhes na{" "}
          <Link href="/privacidade" className="underline underline-offset-4">
            política de privacidade
          </Link>
          .
        </p>
      </Pagina>
      <Footer />
    </>
  );
}
