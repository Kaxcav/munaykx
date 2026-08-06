import { query } from "@/lib/admin-lista";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Busca das listagens do admin.
 *
 * É um `<form method="get">` de propósito: zero JavaScript, funciona com a
 * aba restaurada e o resultado fica na URL (dá pra mandar o link do recorte
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
      <Input
        type="search"
        name="q"
        defaultValue={valor ?? ""}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-[15rem] flex-1"
      />
      <Button type="submit" variant="outline">
        Buscar
      </Button>
      {valor && (
        // "limpar" apaga só a busca — os outros filtros continuam de pé.
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
