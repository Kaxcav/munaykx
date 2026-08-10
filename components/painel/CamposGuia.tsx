import { CAMPOS_GUIA, lerGuia } from "@/lib/guia";

/**
 * Os campos do GUIA DE PRIMEIRA VEZ no form de identidade da comunidade.
 * Fieldset separado porque é uma seção conceitual ("o que o estreante precisa
 * saber"), não mais um campo solto. Um input por chave, nome `guia_<chave>` —
 * a action remonta o objeto (app/painel/(interno)/actions.ts).
 *
 * COMPÕE com `acolheIniciante` (#29): a mensagem cobra o guia justamente de quem
 * marcou "acolhe iniciantes", porque declarar que recebe e não dizer COMO é a
 * porta que continua fechada.
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
    <fieldset className="rounded-xl border border-petroleo/15 bg-areia/40 p-5">
      <legend className="px-2 font-display text-lg font-bold">
        Guia de primeira vez
      </legend>
      <p className="text-sm text-petroleo/80">
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
          <label key={c.chave} className="block">
            <span className="mb-1 block text-sm font-semibold">{c.rotulo}</span>
            <input
              name={`guia_${c.chave}`}
              defaultValue={guia[c.chave] ?? ""}
              maxLength={c.max}
              placeholder={c.dica}
              className="w-full rounded-lg border border-petroleo/20 bg-white p-3 text-sm"
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
