import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { avisosDoPainel, DIAS_FEED_COMUNIDADE } from "@/lib/posts";
import CorpoAviso from "@/components/CorpoAviso";
import { publicarAvisoAction } from "./actions";

/**
 * Avisos de UMA comunidade da pessoa: publicar e ver o histórico.
 *
 * `avisosDoPainel` devolve `null` quando não é dela — e a página vira **404,
 * nunca 403** (403 confirmaria que o recurso existe e deixaria varrer slugs).
 * O histórico aqui mostra também os avisos OCULTOS, com o motivo: o
 * organizador descobrir moderação pela ausência é pior que ler por quê.
 */
export default async function AvisosDaComunidade({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const { slug } = await params;
  const avisos = await avisosDoPainel(sessao.user.id, slug);
  if (!avisos) notFound();

  const { ok, erro } = await searchParams;

  return (
    <>
      <p className="eyebrow">Avisos da comunidade</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
        Avisar quem segue
      </h1>
      <p className="mt-3 max-w-2xl text-petroleo/70">
        Mudou o local, caiu por chuva, atrasou meia hora — escreva aqui. Quem
        segue vê na agenda e na página da comunidade. Quem ligou o aviso por
        e-mail recebe (no máximo um por dia, por comunidade).
      </p>

      <Link
        href={`/painel/comunidades/${encodeURIComponent(slug)}`}
        className="mt-4 inline-block font-mono text-xs uppercase tracking-[0.14em] text-petroleo/60 hover:text-petroleo"
      >
        ← Voltar para a comunidade
      </Link>

      {ok ? (
        <p className="mt-6 rounded-xl border border-petroleo/15 bg-white/70 p-4 text-sm">
          Aviso publicado ✓
        </p>
      ) : null}
      {erro ? (
        <p className="mt-6 rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
          {erro}
        </p>
      ) : null}

      <form action={publicarAvisoAction} className="mt-8">
        <input type="hidden" name="slug" value={slug} />
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">O aviso</span>
          <textarea
            name="corpo"
            rows={4}
            maxLength={1000}
            required
            placeholder="Hoje o treino é no campo 2, mesma hora."
            className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
          />
        </label>
        <p className="mt-1 text-xs text-petroleo/60">
          Texto puro, até 1000 caracteres. Links viram link sozinhos.
        </p>
        <button
          type="submit"
          className="mt-4 rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
        >
          Publicar aviso
        </button>
      </form>

      <h2 className="mt-12 font-display text-2xl font-bold">Publicados</h2>
      {avisos.length === 0 ? (
        <p className="mt-4 text-petroleo/70">
          Nenhum aviso ainda. O primeiro aparece aqui e no site.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {avisos.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-petroleo/10 bg-white/70 p-5"
            >
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-petroleo/60">
                {a.createdAt.toLocaleDateString("pt-BR")} ·{" "}
                {a.autorNome ?? "organizador da comunidade"}
              </p>
              <div className="mt-2">
                <CorpoAviso corpo={a.corpo} />
              </div>
              {a.ocultoEm ? (
                <p className="mt-3 rounded-lg border border-destructive/30 p-3 text-xs text-destructive">
                  Oculto pela moderação da MUNAY
                  {a.ocultoMotivo ? `: ${a.ocultoMotivo}` : "."} Não aparece no
                  site nem na agenda de ninguém.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-xs text-petroleo/60">
        O site público mostra os avisos dos últimos {DIAS_FEED_COMUNIDADE} dias.
        Aqui você vê o histórico completo (últimos 50).
      </p>
    </>
  );
}
