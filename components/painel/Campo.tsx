import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * `<Campo>` — rótulo + controle + dica, a linha de formulário do painel.
 *
 * POR QUE EXISTE: a receita
 * `<label className="block"><span className="mb-1 block text-sm font-semibold">…`
 * estava copiada **vinte e três vezes** só nas telas do organizador — em três
 * dialetos (`mb-1 block text-sm font-semibold`, `block text-sm font-semibold`,
 * `mb-1 block text-xs font-medium text-petroleo/70`). Nenhum dos três foi
 * decidido; foram três momentos de digitação. Aqui vira um.
 *
 * É `<label>` ENVOLVENDO o controle (associação implícita), e não
 * `htmlFor`/`id`: as telas do painel são server components e não podem chamar
 * `useId()`, e inventar id à mão em formulário que se repete (a grade tem uma
 * linha por horário) é como nasce id duplicado — que quebra o clique no
 * rótulo justamente onde ele mais serve.
 *
 * ⚠️ NÃO é `components/comum/`. O L1 é o único dono dos compartilhados nesta
 * rodada (regra 2 do QUADRO). Se o L4/L5 precisarem da mesma peça, o caminho
 * é o §5 do quadro — promover daqui pra `comum/`, não copiar.
 */
export function Campo({
  rotulo,
  opcional = false,
  dica,
  className,
  children,
}: {
  rotulo: React.ReactNode;
  /** Escreve "(opcional)" em peso normal ao lado do rótulo. */
  opcional?: boolean;
  /** A linha pequena embaixo do campo — o porquê, não a repetição do rótulo. */
  dica?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Label className={cn("block", className)}>
      <span className="mb-1 block">
        {rotulo}
        {opcional && (
          <span className="font-normal text-foreground/50"> (opcional)</span>
        )}
      </span>
      {children}
      {dica && (
        <span className="mt-1 block text-xs font-normal text-foreground/60">
          {dica}
        </span>
      )}
    </Label>
  );
}

/**
 * `<CampoCheck>` — a caixa de marcar, com o rótulo à direita.
 *
 * ⚠️ A caixa de marcar aqui é o elemento NATIVO, de propósito, e continua
 * contando no `verificar:higiene` — não é isenção disfarçada. O DS ainda não
 * tem `Checkbox` (é peça de `components/ui/`, que só o L1 escreve nesta
 * rodada), então a alternativa seria inventar uma nona variante de caixa de
 * marcar no painel e ter duas no projeto. Pedido registrado no §5 do
 * `docs/QUADRO-SHADCN-MUNAY.md`; quando a peça existir, é aqui que ela entra —
 * num arquivo, não nas seis telas.
 *
 * `accent-primary` faz o navegador pintar a marca de seleção com a cor da
 * marca em vez do azul do sistema: é token, não hex, e some junto se a paleta
 * mudar.
 */
export function CampoCheck({
  nome,
  rotulo,
  defaultChecked,
  required,
  className,
  alinharAoTopo = false,
}: {
  nome: string;
  rotulo: React.ReactNode;
  defaultChecked?: boolean;
  /** O aceite de autorização do cadastro é obrigatório — não é decoração. */
  required?: boolean;
  className?: string;
  /** Para rótulo de várias linhas (o aceite de autorização), a caixa sobe. */
  alinharAoTopo?: boolean;
}) {
  return (
    <Label
      className={cn(
        "flex gap-2.5 font-normal",
        alinharAoTopo ? "items-start" : "items-center",
        className,
      )}
    >
      <input
        type="checkbox"
        name={nome}
        defaultChecked={defaultChecked}
        required={required}
        className={cn(
          "size-4 shrink-0 accent-primary",
          alinharAoTopo && "mt-0.5",
        )}
      />
      <span className="text-sm">{rotulo}</span>
    </Label>
  );
}
