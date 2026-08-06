import { query } from "@/lib/admin-lista";

/**
 * Busca das listagens do admin.
 *
 * É um `<form method="get">` de propósito: zero JavaScript, funciona com a
 * aba offline e o resultado fica na URL (dá pra mandar o link do recorte
 * pra outra pessoa). Os filtros que já estavam ativos viajam em campos
 * ocultos — senão buscar apagaria o filtro de tipo/status.
 *
 * `p` NÃO é preservado: busca nova sempre volta pra página 1. Manter a
 * página 7 numa busca que agora tem 3 resultados daria tela vazia.
 */
export function BuscaAdmin({
  action,
  valor,
  placeholder,
  ocultos = {},
}: {
  action: string;
  valor?: string;
  placeholder: string;
  /** Filtros ativos que devem sobreviver à busca. */
  ocultos?: Record<string, string | undefined>;
}) {
  return (
    <form method="get" action={action} className="flex flex-wrap gap-2">
      {Object.entries(ocultos).map(([nome, v]) =>
        v ? <input key={nome} type="hidden" name={nome} value={v} /> : null,
      )}
      <input
        type="search"
        name="q"
        defaultValue={valor ?? ""}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-[15rem] flex-1 rounded-full border border-petroleo/20 bg-white/70 px-4 py-2 text-sm outline-none transition-colors placeholder:text-petroleo/40 focus:border-petroleo"
      />
      <button
        type="submit"
        className="rounded-full border border-petroleo px-5 py-2 text-sm font-semibold transition-colors hover:bg-petroleo hover:text-areia"
      >
        Buscar
      </button>
      {valor && (
        // "limpar" apaga só a busca — os outros filtros continuam de pé.
        <a
          href={`${action}${query(ocultos)}`}
          className="rounded-full px-3 py-2 text-sm font-medium text-petroleo/60 underline underline-offset-4 hover:text-petroleo"
        >
          limpar
        </a>
      )}
    </form>
  );
}
