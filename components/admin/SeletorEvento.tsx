import { query } from "@/lib/admin-lista";
import { Button, buttonVariants } from "@/components/ui/button";
import { SelectNativo } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Filtro de evento como `<select>`, não como fileira de chips.
 *
 * Um chip por evento cabia com os 2 do seed. Com uma temporada real
 * (dezenas), a fileira empurra a tabela pra baixo da dobra. Select tem
 * altura constante.
 *
 * **É o `<select>` NATIVO, não o Select do Radix** — ver a nota em
 * `components/ui/input.tsx`. Este formulário funciona sem JavaScript, e o
 * componente do Radix quebraria isso em troca de nada que o usuário perceba.
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
      <SelectNativo
        id="evento"
        name="evento"
        defaultValue={selecionado ?? ""}
        className="max-w-[22rem]"
      >
        <option value="">Todos os eventos</option>
        {eventos.map((e) => (
          <option key={e.slug} value={e.slug}>
            {e.titulo}
          </option>
        ))}
      </SelectNativo>
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
      {selecionado && (
        <a
          href={`${action}${query(ocultos)}`}
          className={cn(
            buttonVariants({ variant: "link", size: "default" }),
            "text-muted-foreground",
          )}
        >
          limpar
        </a>
      )}
    </form>
  );
}
