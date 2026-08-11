import Link from "next/link";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { comunidadesDoUsuario } from "@/lib/organizacao";
import { iaDisponivel } from "@/lib/ai";
import { TIPOS_IMAGEM } from "@/lib/ai/flyer";
import { extrairFlyerAction } from "./actions";

/**
 * FLYER → EVENTO: manda o print do story/cartaz e a IA pré-preenche o evento.
 *
 * Só aparece quando a IA está ligada (mesma regra do Copiloto: a UI não oferece
 * o que o ambiente não entrega). Sem organizar nada → volta pro /painel.
 */
export default async function FlyerParaEvento() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const comunidades = await comunidadesDoUsuario(sessao.user.id);
  if (comunidades.length === 0) redirect("/painel");

  return (
    <>
      <p className="eyebrow">Novo evento</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
        Tem o cartaz? Manda o print.
      </h1>
      <p className="mt-4 max-w-2xl text-petroleo/80">
        A gente lê a imagem do story ou do flyer e <strong>pré-preenche</strong> o
        evento pra você. Você confere e ajusta antes de publicar — nada é salvo
        sem a sua revisão.
      </p>

      {iaDisponivel() ? (
        <form
          action={extrairFlyerAction}
          className="mt-8 max-w-xl rounded-2xl border border-petroleo/10 bg-white/60 p-6"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Imagem do cartaz</span>
            <input
              type="file"
              name="flyer"
              required
              accept={TIPOS_IMAGEM.join(",")}
              className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-petroleo file:px-4 file:py-2 file:text-sm file:font-semibold file:text-areia hover:file:bg-lime hover:file:text-petroleo"
            />
          </label>
          <p className="mt-2 text-xs text-petroleo/80">
            PNG, JPG, WEBP ou GIF, até 5 MB. A imagem é lida só para extrair os
            campos — não guardamos o arquivo.
          </p>
          <button
            type="submit"
            className="mt-5 rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
          >
            Ler o cartaz e pré-preencher
          </button>
        </form>
      ) : (
        <p className="mt-8 max-w-xl rounded-xl border border-petroleo/15 bg-white/70 p-4 text-sm text-petroleo/80">
          A leitura de cartaz por IA está indisponível agora. Você pode{" "}
          <Link href="/painel/eventos/novo" className="underline underline-offset-4">
            criar o evento manualmente
          </Link>{" "}
          — é rápido.
        </p>
      )}

      <p className="mt-8">
        <Link
          href="/painel/eventos/novo"
          className="text-sm font-semibold underline underline-offset-4 hover:opacity-70"
        >
          Prefiro preencher na mão →
        </Link>
      </p>
    </>
  );
}
