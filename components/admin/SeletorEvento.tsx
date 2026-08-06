import { query } from "@/lib/admin-lista";

/**
 * Filtro de evento como `<select>`, não como fileira de chips.
 *
 * Motivo: um chip por evento cabia com os 2 eventos do seed. Com uma
 * temporada real (dezenas), a fileira empurra a tabela pra baixo da dobra
 * e a página fica ilegível. Select tem altura constante.
 *
 * Continua sendo `<form method="get">` sem JavaScript — o botão "Filtrar"
 * é o que troca a URL.
 */
export function SeletorEvento({
  action,
  eventos,
  selecionado,
  ocultos = {},
}: {
  action: string;
  eventos: { slug: string; titulo: string }[];
  selecionado?: string;
  ocultos?: Record<string, string | undefined>;
}) {
  if (eventos.length === 0) return null;

  return (
    <form
      method="get"
      action={action}
      className="flex flex-wrap items-center gap-2"
    >
      {Object.entries(ocultos).map(([nome, v]) =>
        v ? <input key={nome} type="hidden" name={nome} value={v} /> : null,
      )}
      <label htmlFor="evento" className="eyebrow mr-1">
        Evento
      </label>
      <select
        id="evento"
        name="evento"
        defaultValue={selecionado ?? ""}
        className="max-w-[22rem] rounded-full border border-petroleo/20 bg-white/70 px-4 py-2 text-sm outline-none transition-colors focus:border-petroleo"
      >
        <option value="">Todos os eventos</option>
        {eventos.map((e) => (
          <option key={e.slug} value={e.slug}>
            {e.titulo}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-full border border-petroleo px-5 py-2 text-sm font-semibold transition-colors hover:bg-petroleo hover:text-areia"
      >
        Filtrar
      </button>
      {selecionado && (
        <a
          href={`${action}${query(ocultos)}`}
          className="px-2 py-2 text-sm font-medium text-petroleo/60 underline underline-offset-4 hover:text-petroleo"
        >
          limpar
        </a>
      )}
    </form>
  );
}
