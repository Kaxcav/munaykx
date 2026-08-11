import { CAMPOS_GUIA, lerGuia } from "@/lib/guia";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Campo } from "@/components/painel/Campo";

/**
 * Os campos do GUIA DE PRIMEIRA VEZ no form de identidade da comunidade.
 * Fieldset separado porque é uma seção conceitual ("o que o estreante precisa
 * saber"), não mais um campo solto. Um input por chave, nome `guia_<chave>` —
 * a action remonta o objeto (app/painel/(interno)/actions.ts).
 *
 * COMPÕE com `acolheIniciante` (#29): a mensagem cobra o guia justamente de quem
 * marcou "acolhe iniciantes", porque declarar que recebe e não dizer COMO é a
 * porta que continua fechada.
 *
 * Continua `<fieldset>`/`<legend>` (é agrupamento de formulário, e o leitor de
 * tela anuncia o grupo antes de cada campo) — o que mudou é que a superfície
 * agora é o `<Card>` do DS, envolvendo o fieldset em vez de um raio e uma borda
 * escritos à mão.
 */
export default function CamposGuia({
  guiaAtual,
  acolheIniciante,
}: {
  guiaAtual: unknown;
  acolheIniciante: boolean;
}) {
  const guia = lerGuia(guiaAtual);
  return (
    <Card className="bg-secondary p-5">
      <fieldset>
        <legend className="font-display text-lg font-bold">
          Guia de primeira vez
        </legend>
        <p className="mt-1 text-sm text-foreground/80">
          O que alguém que nunca foi precisa saber pra chegar tranquilo. É a parte
          mais importante pra quem tá começando —{" "}
          {acolheIniciante ? (
            <span className="font-semibold">
              e você marcou que acolhe iniciantes, então vale caprichar aqui.
            </span>
          ) : (
            <>aparece na página quando &ldquo;acolhe iniciantes&rdquo; está ligado.</>
          )}
        </p>
        <div className="mt-4 space-y-4">
          {CAMPOS_GUIA.map((c) => (
            <Campo key={c.chave} rotulo={c.rotulo}>
              <Input
                name={`guia_${c.chave}`}
                defaultValue={guia[c.chave] ?? ""}
                maxLength={c.max}
                placeholder={c.dica}
              />
            </Campo>
          ))}
        </div>
      </fieldset>
    </Card>
  );
}
