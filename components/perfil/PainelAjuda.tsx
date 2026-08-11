"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * PAINEL DE AJUDA — briefing 07/08/2026, item 8.3.
 *
 * "Incluir um painel de ajuda para qualquer configuração incorreta: erros de
 * preenchimento, campos inválidos e dúvidas sobre dados."
 *
 * ── ELE FAZ DUAS COISAS QUE PARECEM UMA SÓ ───────────────────────────────
 *
 * 1. **Erro de preenchimento** — lista o que está pendente AGORA, com um
 *    botão que leva o foco pro campo. Num formulário longo, saber que "tem
 *    erro" sem saber ONDE é a pior parte: a pessoa rola pra cima e pra baixo
 *    caçando a borda vermelha. Aqui ela clica e chega.
 *
 * 2. **Dúvida sobre dados** — o "por que vocês querem isso?". Essas
 *    perguntas existem na cabeça de quem preenche mesmo quando ninguém
 *    escreve; não responder não faz a dúvida sumir, faz a pessoa abandonar o
 *    formulário no meio do caminho.
 *
 * ── POR QUE `<details>` E NÃO UM ACCORDION DE BIBLIOTECA ─────────────────
 *
 * `<details>`/`<summary>` é nativo: abre sem JavaScript, é acessível por
 * padrão (o navegador já anuncia estado expandido/recolhido) e é
 * pesquisável pelo Ctrl+F do navegador em vários browsers. Um accordion do
 * Radix custaria kilobytes pra reimplementar isso pior.
 */

export type Problema = { campo: string; mensagem: string };

const DUVIDAS = [
  {
    p: "Vocês pedem CPF?",
    r: "Não. Já chegou a existir um campo de CPF aqui e ele foi removido: a gente não coleta documento sem ter o que fazer com ele. Se um dia existir ingresso pago e nominal, aí a gente pede — explicando exatamente pra quê, e com a política de privacidade atualizada antes.",
  },
  {
    p: "Quem enxerga o que eu escrevo aqui?",
    r: "Por padrão, ninguém além de você. Nome, foto, descrição e interesses só aparecem pra comunidade se você ligar o perfil público lá embaixo. Data de nascimento, telefone e CEP NUNCA aparecem — nem com o perfil público ligado.",
  },
  {
    p: "Pra que serve o CEP?",
    r: "Pra te mostrar o que acontece perto de você e pra entender em que regiões do DF falta oferta. A gente guarda o CEP, não o endereço — número e complemento a gente nem pergunta.",
  },
  {
    p: "As perguntas divertidas são obrigatórias?",
    r: "Nenhuma. Elas existem porque um cadastro só com data de nascimento e CEP não diz nada sobre você — e a MUNAY é sobre encontrar gente parecida, não sobre preencher ficha.",
  },
  {
    p: "Posso apagar tudo depois?",
    r: "Pode, a qualquer momento, no botão no fim da página. Some o perfil e ficam a conta e suas inscrições — se apagássemos as inscrições junto, quem organiza perderia a lista de quem confirmou presença.",
  },
  {
    p: "Recebi um erro e não entendi.",
    r: "Chama a gente pelo e-mail do rodapé com o print. Erro que a pessoa não entende é falha nossa de texto, não sua de preenchimento.",
  },
];

export default function PainelAjuda({
  problemas,
  salvo,
}: {
  problemas: Problema[];
  salvo: boolean;
}) {
  const temProblema = problemas.length > 0;

  function irPara(campo: string) {
    const alvo =
      document.getElementById(campo) ??
      document.querySelector<HTMLElement>(`[name="${campo}"]`);
    alvo?.scrollIntoView({ block: "center", behavior: "smooth" });
    alvo?.focus({ preventScroll: true });
  }

  return (
    <aside className="lg:sticky lg:top-24" aria-label="Ajuda do cadastro">
      <Card
        className={cn(
          "p-6 transition-colors",
          temProblema
            ? "border-destructive/40 bg-destructive/5"
            : "border-salvia/40 bg-salvia-soft",
        )}
      >
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-foreground/55">
          Painel de ajuda
        </p>

        {/* `aria-live`: quem usa leitor de tela ouve o painel mudar de estado
            sem precisar navegar até aqui pra descobrir. */}
        <div aria-live="polite">
          {temProblema ? (
            <>
              <p className="mt-2 font-display text-lg font-bold">
                {problemas.length === 1
                  ? "Falta ajustar um campo"
                  : `Faltam ajustar ${problemas.length} campos`}
              </p>
              <ul className="mt-4 space-y-3">
                {problemas.map((p) => (
                  <li key={p.campo + p.mensagem} className="text-sm">
                    {/* `variant="link"` com o sublinhado do painel por cima:
                        o item é um atalho de texto que leva o foco pro campo,
                        não um botão de ação — dar a ele o corpo de um
                        `<Button>` cheio transformaria uma lista de pendências
                        numa fileira de pílulas. */}
                    <Button
                      variant="link"
                      onClick={() => irPara(p.campo)}
                      className="h-auto justify-start whitespace-normal p-0 text-left text-sm font-normal leading-relaxed text-foreground/80 decoration-destructive/50 hover:text-foreground"
                    >
                      {p.mensagem}
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="mt-2 font-display text-lg font-bold">
                {salvo ? "Salvo ✓" : "Tá tudo certo por aqui"}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                {salvo
                  ? "Seu perfil está guardado. Pode fechar ou continuar mexendo."
                  : "Nenhum campo com problema. Preenche o que quiser e salva — dá pra voltar e completar depois."}
              </p>
            </>
          )}
        </div>
      </Card>

      <Card className="mt-4 bg-card/60 p-6">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-foreground/55">
          Dúvidas sobre os dados
        </p>
        <div className="mt-3 divide-y divide-border">
          {DUVIDAS.map((d) => (
            <details key={d.p} className="group py-3">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-medium marker:content-none">
                {d.p}
                <span
                  aria-hidden
                  className="mt-0.5 shrink-0 text-foreground/40 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">{d.r}</p>
            </details>
          ))}
        </div>
      </Card>
    </aside>
  );
}
