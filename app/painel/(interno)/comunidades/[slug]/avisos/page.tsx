import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { avisosDoPainel, DIAS_FEED_COMUNIDADE } from "@/lib/posts";
import { Pagina } from "@/components/comum/Pagina";
import { Secao } from "@/components/comum/Secao";
import { EstadoVazio } from "@/components/comum/EstadoVazio";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Aviso } from "@/components/painel/Aviso";
import { Campo } from "@/components/painel/Campo";
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
    <Pagina
      eyebrow="Avisos da comunidade"
      titulo="Avisar quem segue"
      voltar={{
        href: `/painel/comunidades/${encodeURIComponent(slug)}`,
        texto: "Voltar para a comunidade",
      }}
      descricao="Mudou o local, caiu por chuva, atrasou meia hora — escreva aqui. Quem segue vê na agenda e na página da comunidade. Quem ligou o aviso por e-mail recebe (no máximo um por dia, por comunidade)."
    >
      {ok ? <Aviso>Aviso publicado ✓</Aviso> : null}
      {erro ? <Aviso tom="erro">{erro}</Aviso> : null}

      <form action={publicarAvisoAction} className="mt-8 max-w-2xl">
        <input type="hidden" name="slug" value={slug} />
        <Campo
          rotulo="O aviso"
          dica="Texto puro, até 1000 caracteres. Links viram link sozinhos."
        >
          <Textarea
            name="corpo"
            rows={4}
            maxLength={1000}
            required
            placeholder="Hoje o treino é no campo 2, mesma hora."
          />
        </Campo>
        <Button type="submit" className="mt-4">
          Publicar aviso
        </Button>
      </form>

      <Secao titulo="Publicados" destaque>
        {avisos.length === 0 ? (
          <EstadoVazio
            className="mt-0"
            titulo="Nenhum aviso ainda"
            descricao="O primeiro aparece aqui e, no mesmo instante, no site e na agenda de quem segue."
          />
        ) : (
          <ul className="space-y-3">
            {avisos.map((a) => (
              <li key={a.id}>
                <Card className="p-5">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] tabular-nums text-foreground/60">
                    {a.createdAt.toLocaleDateString("pt-BR")} ·{" "}
                    {a.autorNome ?? "organizador da comunidade"}
                  </p>
                  <div className="mt-2">
                    <CorpoAviso corpo={a.corpo} />
                  </div>
                  {a.ocultoEm ? (
                    <Aviso tom="erro" className="mt-3 text-xs">
                      Oculto pela moderação da MUNAY
                      {a.ocultoMotivo ? `: ${a.ocultoMotivo}` : "."} Não aparece no
                      site nem na agenda de ninguém.
                    </Aviso>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <p className="mt-10 text-xs text-foreground/60">
        O site público mostra os avisos dos últimos {DIAS_FEED_COMUNIDADE} dias.
        Aqui você vê o histórico completo (últimos 50).
      </p>
    </Pagina>
  );
}
