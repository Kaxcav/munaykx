import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { comunidadeDoUsuario } from "@/lib/organizacao";
import { SITE_URL } from "@/lib/site";
import { gerarCodigoAction, revogarCodigoAction } from "./actions";

/**
 * Link aberto de convite de UMA comunidade da pessoa.
 *
 * `comunidadeDoUsuario` devolve `null` quando não é dela — e a página vira
 * **404, nunca 403**, como o resto do painel.
 *
 * A tela diz, em texto, o que o link concede e o que ele NÃO concede. Não é
 * decoração: o organizador que acha que o link dá acesso ao painel vai
 * distribuí-lo achando que está delegando trabalho, e depois cobrar por quê o
 * convidado não consegue editar nada.
 */
export default async function ConviteAbertoDaComunidade({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const { slug } = await params;
  const com = await comunidadeDoUsuario(sessao.user.id, slug);
  if (!com) notFound();

  const { ok, erro } = await searchParams;
  const codigo = com.codigoConvite;
  // Sem `NEXT_PUBLIC_SITE_URL` o `SITE_URL` é vazio — o link vira relativo, e
  // continua funcionando pra copiar dentro do próprio site. Nunca chutar host.
  const link = codigo ? `${SITE_URL}/c/${codigo}` : null;

  return (
    <>
      <p className="eyebrow">Link de convite</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
        Chamar gente para {com.nome}
      </h1>
      <p className="mt-3 max-w-2xl text-petroleo/70">
        Um link só, para colar no grupo de WhatsApp. Quem abrir passa a{" "}
        <strong>seguir</strong> a comunidade: os eventos entram na agenda dela e
        os avisos chegam. <strong>Nada além disso</strong> — quem entra pelo
        link não vê a lista de inscritos, não edita evento e não vira
        organizador. Para dar poder a alguém, use o{" "}
        <Link href="/painel/convites" className="underline underline-offset-4">
          convite por e-mail
        </Link>
        , que exige aceite.
      </p>

      <Link
        href={`/painel/comunidades/${encodeURIComponent(slug)}`}
        className="mt-4 inline-block font-mono text-xs uppercase tracking-[0.14em] text-petroleo/60 hover:text-petroleo"
      >
        ← Voltar para a comunidade
      </Link>

      {ok === "gerado" ? (
        <p className="mt-6 rounded-xl border border-petroleo/15 bg-white/70 p-4 text-sm">
          Link novo criado ✓ — o anterior, se existia, parou de funcionar agora.
        </p>
      ) : null}
      {ok === "revogado" ? (
        <p className="mt-6 rounded-xl border border-petroleo/15 bg-white/70 p-4 text-sm">
          Link desligado ✓ — quem já entrou continua seguindo; ninguém novo
          entra por ele.
        </p>
      ) : null}
      {erro ? (
        <p className="mt-6 rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
          {erro}
        </p>
      ) : null}

      {link ? (
        <div className="mt-8 rounded-card border border-petroleo/10 bg-white/70 p-6">
          <p className="eyebrow">Link ativo</p>
          <p className="mt-3 break-all font-mono text-sm">{link}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <form action={gerarCodigoAction}>
              <input type="hidden" name="slug" value={com.slug} />
              <button
                type="submit"
                className="rounded-full border border-petroleo/20 px-5 py-2 text-sm font-semibold transition-colors hover:border-petroleo/50"
              >
                Gerar link novo
              </button>
            </form>
            <form action={revogarCodigoAction}>
              <input type="hidden" name="slug" value={com.slug} />
              <button
                type="submit"
                className="rounded-full border border-destructive/40 px-5 py-2 text-sm font-semibold text-destructive transition-colors hover:border-destructive"
              >
                Desligar o link
              </button>
            </form>
          </div>
          <p className="mt-4 text-xs text-petroleo/60">
            Vazou pra onde não devia? &ldquo;Gerar link novo&rdquo; invalida o
            antigo na hora — é só um link por comunidade.
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-card border border-petroleo/10 bg-white/70 p-6">
          <p className="font-display text-lg font-bold">
            Esta comunidade ainda não tem link
          </p>
          <p className="mt-2 text-sm text-petroleo/70">
            Crie um quando quiser chamar gente. Dá pra desligar depois.
          </p>
          <form action={gerarCodigoAction} className="mt-5">
            <input type="hidden" name="slug" value={com.slug} />
            <button
              type="submit"
              className="rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
            >
              Criar link de convite
            </button>
          </form>
        </div>
      )}
    </>
  );
}
