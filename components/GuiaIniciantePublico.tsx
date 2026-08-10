import { CAMPOS_GUIA, lerGuia, temGuia } from "@/lib/guia";

/**
 * O GUIA DE PRIMEIRA VEZ na página pública da comunidade. Aparece só quando a
 * comunidade acolhe iniciante E preencheu ao menos um campo — senão some, sem
 * deixar seção vazia (a mesma disciplina do "silêncio é escolha de design").
 *
 * É a tese virando tela: quem nunca foi lê aqui como atravessar a porta.
 * Contraste AA (texto em petroleo/80 sobre o fundo salvia claro), sem o muted
 * abaixo de AA que a auditoria pegou.
 */
export default function GuiaIniciantePublico({
  guia,
  acolheIniciante,
}: {
  guia: unknown;
  acolheIniciante: boolean;
}) {
  if (!acolheIniciante) return null;
  const g = lerGuia(guia);
  if (!temGuia(g)) return null;

  return (
    <section className="mt-8 max-w-2xl rounded-card border border-salvia bg-salvia-soft p-6">
      <h2 className="font-display text-lg font-bold text-salvia-deep">
        É sua primeira vez? Bora, a gente te espera.
      </h2>
      <dl className="mt-4 space-y-3">
        {CAMPOS_GUIA.map((c) =>
          g[c.chave] ? (
            <div key={c.chave}>
              <dt className="text-xs font-semibold uppercase tracking-wider text-salvia-deep">
                {c.rotulo}
              </dt>
              <dd className="mt-0.5 text-sm text-petroleo/80">{g[c.chave]}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </section>
  );
}
