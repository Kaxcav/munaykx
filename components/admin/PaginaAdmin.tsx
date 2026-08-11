import * as React from "react";
import { Pagina } from "@/components/comum/Pagina";
import { cn } from "@/lib/utils";

/**
 * `<PaginaAdmin>` — o `<Pagina>` do L1 na densidade do admin.
 *
 * Existe por UM motivo e só ele: o `<Pagina>` abre com `py-20` porque é a
 * respiração de uma tela pública, que começa logo abaixo do header e precisa
 * do ar. O `/admin` já tem a própria barra escura em cima e é ferramenta de
 * trabalho — cinco rem de vazio antes do primeiro número empurram a tabela
 * pra baixo da dobra em notebook. Densidade é feature (é a régua do playbook
 * pra tela interna).
 *
 * Então a diferença é UMA classe, e ela mora aqui em vez de estar digitada
 * `className="py-10"` em doze telas — que é exatamente a deriva que esta
 * rodada veio matar. Tudo o mais (eyebrow → h1 display → descrição → ações)
 * é o `<Pagina>` compartilhado, sem cópia.
 *
 * NÃO é peça de `components/ui/` nem de `components/comum/`: aquilo é do L1 e
 * serve o site inteiro. Isto é do admin, mora em `components/admin/` e some
 * no dia em que o admin quiser a mesma respiração do resto.
 */
export function PaginaAdmin({
  className,
  ...props
}: React.ComponentProps<typeof Pagina>) {
  return <Pagina className={cn("py-10", className)} {...props} />;
}
