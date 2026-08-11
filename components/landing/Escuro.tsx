import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * SUPERFÍCIE ESCURA DA LANDING — a única exceção de tema do lote L6.
 *
 * O design system da MUNAY é desenhado pro fundo claro: `<Card>` é
 * `bg-card` (branco) sobre `bg-background` (areia), `<Input>` é `bg-card`
 * com `border-input`. Isso cobre 90% do site. Mas a landing tem TRÊS blocos
 * que são petróleo por decisão de briefing, não por acidente:
 *
 * - o card B2B do `<Publicos>` ("Sua comunidade merece ser achada");
 * - o Bloco 03 do `<PainelFuncional>` (o "motor" — largura inteira, fundo
 *   escuro, que é a recomendação estratégica do briefing virada layout);
 * - a seção de cadastro inteira (`<LeadSection>`), que é a última dobra.
 *
 * O jeito canônico do shadcn de virar o tema num escopo é redefinir as
 * variáveis CSS (`--card`, `--border`, …) num wrapper. Aqui isso não serve:
 * as variáveis são **calculadas** de `lib/brand.ts` por `lib/tema.ts` e
 * vigiadas pelo `tests/tema.spec.ts` — escrever HSL à mão num componente
 * seria fabricar uma segunda fonte de cor, exatamente o que a regra 4 do
 * `CLAUDE.md` proíbe. E o prefixo de variante escura do Tailwind também está
 * fora: o guardrail conta `dark-manual` e o baseline é ZERO, de propósito (o
 * tema da MUNAY não é claro/escuro por preferência do sistema — é claro, com
 * blocos escuros deliberados). E sim, este parágrafo já ficou vermelho uma
 * vez por CITAR o prefixo dentro de crase: o contador varre o arquivo
 * inteiro, comentário incluído. Ficou assim de propósito — guardrail que
 * abre exceção pra comentário é guardrail que se contorna com um comentário.
 *
 * Então o override é por CLASSE, com os tokens DA MARCA (`petroleo`,
 * `areia`, `lime`), que é o vocabulário que esses blocos já falavam antes
 * desta rodada. O ganho não é a cor mudar — é ela morar em UM lugar. Antes,
 * "campo de formulário sobre petróleo" era uma string de sete classes
 * copiada em oito campos; o `inputCls` do `LeadSection` era o começo dessa
 * dívida, com um só consumidor e nenhum nome.
 *
 * ⚠️ NÃO PROMOVA ISTO PRA `components/comum/` POR CONTA PRÓPRIA. É peça
 * LOCAL do L6, como o `<Campo>` é do L3 — quem promove é o dono do L1
 * (§5 do `docs/QUADRO-SHADCN-MUNAY.md`). Se a área do usuário (L5, que tem
 * a `/meus-ingressos` escura) precisar do mesmo, o caminho é o pedido, não
 * a cópia.
 */

/** Superfície-card sobre fundo escuro. Vai no `className` do `<Card>`. */
export const CARD_ESCURO = "border-areia/15 bg-areia/5 text-areia";

/** O bloco escuro que é o próprio fundo (não card sobre fundo). */
export const BLOCO_ESCURO = "border-transparent bg-petroleo text-areia";

/** Campo de formulário sobre petróleo. Vai no `className` de `<Input>`/`<SelectNativo>`. */
export const CONTROLE_ESCURO =
  "border-areia/25 bg-white/10 text-areia placeholder:text-areia/40 focus-visible:border-lime";

/**
 * Botão sólido em lime sobre escuro.
 *
 * Não é uma variante nova do `<Button>` — é o `className` que a variante
 * `default` recebe quando o fundo já é petróleo (aí o petróleo do botão
 * sumiria dentro do fundo). Regra 7 do projeto: lime é acento RARO, e a
 * ação principal da última dobra é exatamente o caso de uso dele.
 */
export const BOTAO_LIME = "bg-lime text-petroleo hover:bg-lime hover:opacity-90";

/** Botão de contorno sobre escuro (a ação secundária das duas trilhas). */
export const BOTAO_CONTORNO_ESCURO =
  "border-2 border-areia/30 bg-transparent text-areia hover:border-lime hover:bg-transparent hover:text-lime";

/**
 * A aba do formulário de cadastro (participante ↔ organizador).
 *
 * É `<ChipBotao>` porque é exatamente o que a peça descreve — pílula que
 * ALTERNA um estado na própria tela, com alvo de toque. O que o chip não
 * sabe fazer sozinho é viver sobre petróleo: o estado `ativo` dele é
 * `primary` sólido, que é o próprio fundo aqui. Sobre escuro o ativo vira
 * lime — é o único uso de lime como área nesta dobra, e é o caso que a
 * regra 7 chama de acento deliberado.
 */
export const abaEscura = (ativo: boolean) =>
  cn(
    "border-transparent px-5 py-2.5 font-semibold",
    ativo
      ? "bg-lime text-petroleo hover:bg-lime"
      : "bg-transparent text-areia/70 hover:bg-transparent hover:text-areia",
  );

/**
 * `<CampoEscuro>` — rótulo + controle, no formulário da última dobra.
 *
 * Mesma anatomia do `<Campo>` do painel (rótulo em cima, controle embaixo,
 * `htmlFor`/`id` amarrados por um `id` só), sem o dialeto: os oito campos do
 * `LeadSection` escreviam `<label className="mb-1.5 block text-sm
 * font-medium">` cada um, na mão, e a distância entre rótulo e campo era
 * digitada oito vezes.
 */
export function CampoEscuro({
  id,
  rotulo,
  opcional,
  className,
  children,
}: {
  id: string;
  rotulo: React.ReactNode;
  /** Rende o "(opcional)" que o WhatsApp já mostrava, em vez de cada tela inventar o seu. */
  opcional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 text-areia">
        {rotulo}
        {opcional && <span className="font-normal text-areia/50"> (opcional)</span>}
      </Label>
      {children}
    </div>
  );
}
