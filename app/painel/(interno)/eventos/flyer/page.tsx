import Link from "next/link";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { comunidadesDoUsuario } from "@/lib/organizacao";
import { iaDisponivel } from "@/lib/ai";
import { TIPOS_IMAGEM } from "@/lib/ai/flyer";
import { Pagina } from "@/components/comum/Pagina";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Aviso } from "@/components/painel/Aviso";
import { Campo } from "@/components/painel/Campo";
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
    <Pagina
      eyebrow="Novo evento"
      titulo="Tem o cartaz? Manda o print."
      voltar={{
        href: "/painel/eventos/novo",
        texto: "Prefiro preencher na mão",
      }}
      descricao={
        <>
          A gente lê a imagem do story ou do flyer e <strong>pré-preenche</strong>{" "}
          o evento pra você. Você confere e ajusta antes de publicar — nada é
          salvo sem a sua revisão.
        </>
      }
    >
      {iaDisponivel() ? (
        <Card className="mt-8 max-w-xl p-6">
          <form action={extrairFlyerAction}>
            <Campo
              rotulo="Imagem do cartaz"
              dica="PNG, JPG, WEBP ou GIF, até 5 MB. A imagem é lida só para extrair os campos — não guardamos o arquivo."
            >
              <Input
                type="file"
                name="flyer"
                required
                accept={TIPOS_IMAGEM.join(",")}
                // O `<Input>` do DS já traz o reset de `file:`; o que sobra
                // aqui é só vestir o botão do navegador com a pílula da marca.
                // A altura vira `auto` porque o botão interno do seletor é mais
                // alto que o texto e estouraria a `h-11` fixa do campo.
                className="h-auto py-2.5 file:mr-4 file:rounded-full file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-primary-foreground hover:file:bg-lime hover:file:text-primary"
              />
            </Campo>
            <Button type="submit" className="mt-5">
              Ler o cartaz e pré-preencher
            </Button>
          </form>
        </Card>
      ) : (
        <Aviso className="max-w-xl text-foreground/80">
          A leitura de cartaz por IA está indisponível agora. Você pode{" "}
          <Link
            href="/painel/eventos/novo"
            className="underline underline-offset-4"
          >
            criar o evento manualmente
          </Link>{" "}
          — é rápido.
        </Aviso>
      )}
    </Pagina>
  );
}
