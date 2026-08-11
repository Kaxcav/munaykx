import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { comunidadeDoUsuario } from "@/lib/organizacao";
import { SITE_URL } from "@/lib/site";
import { Pagina } from "@/components/comum/Pagina";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Aviso } from "@/components/painel/Aviso";
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
    <Pagina
      eyebrow="Link de convite"
      titulo={`Chamar gente para ${com.nome}`}
      voltar={{
        href: `/painel/comunidades/${encodeURIComponent(slug)}`,
        texto: "Voltar para a comunidade",
      }}
      descricao={
        <>
          Um link só, para colar no grupo de WhatsApp. Quem abrir passa a{" "}
          <strong>seguir</strong> a comunidade: os eventos entram na agenda dela e
          os avisos chegam. <strong>Nada além disso</strong> — quem entra pelo
          link não vê a lista de inscritos, não edita evento e não vira
          organizador. Para dar poder a alguém, use o{" "}
          <Link href="/painel/convites" className="underline underline-offset-4">
            convite por e-mail
          </Link>
          , que exige aceite.
        </>
      }
    >
      {ok === "gerado" ? (
        <Aviso>
          Link novo criado ✓ — o anterior, se existia, parou de funcionar agora.
        </Aviso>
      ) : null}
      {ok === "revogado" ? (
        <Aviso>
          Link desligado ✓ — quem já entrou continua seguindo; ninguém novo entra
          por ele.
        </Aviso>
      ) : null}
      {erro ? <Aviso tom="erro">{erro}</Aviso> : null}

      {link ? (
        <Card className="mt-8 max-w-2xl p-6">
          <p className="eyebrow">Link ativo</p>
          <p className="mt-3 break-all font-mono text-sm">{link}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <form action={gerarCodigoAction}>
              <input type="hidden" name="slug" value={com.slug} />
              <Button type="submit" variant="outline" size="sm">
                Gerar link novo
              </Button>
            </form>
            <form action={revogarCodigoAction}>
              <input type="hidden" name="slug" value={com.slug} />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Desligar o link
              </Button>
            </form>
          </div>
          <p className="mt-4 text-xs text-foreground/60">
            Vazou pra onde não devia? &ldquo;Gerar link novo&rdquo; invalida o
            antigo na hora — é só um link por comunidade.
          </p>
        </Card>
      ) : (
        <Card className="mt-8 max-w-2xl p-6">
          <p className="font-display text-lg font-bold">
            Esta comunidade ainda não tem link
          </p>
          <p className="mt-2 text-sm text-foreground/70">
            Crie um quando quiser chamar gente. Dá pra desligar depois.
          </p>
          <form action={gerarCodigoAction} className="mt-5">
            <input type="hidden" name="slug" value={com.slug} />
            <Button type="submit">Criar link de convite</Button>
          </form>
        </Card>
      )}
    </Pagina>
  );
}
