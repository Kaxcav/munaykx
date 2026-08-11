import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { acentoDaModalidade, classesDoAcento } from "@/lib/modalidades";
import { selo, situacaoDe } from "@/lib/inscricoes";
import { cn } from "@/lib/utils";

/**
 * O INGRESSO — briefing 07/08/2026, itens 12 e 12.1.
 *
 * ── ITEM 12: A DIREÇÃO VISUAL É O OPOSTO DO RESTO DO SITE ────────────────
 *
 * "A área de ingressos deve fugir do padrão minimalista das demais telas.
 * (…) Cor chamativa, com ativação forte do verde. Densidade informacional
 * intencional: mais informação por tela. Complexo sem ser poluído — a
 * hierarquia precisa continuar clara mesmo com mais elementos."
 *
 * Como "complexo sem ser poluído" foi resolvido: **densidade em blocos, não
 * em sopa**. O ingresso tem três zonas de leitura, e cada uma responde uma
 * pergunta:
 *   1. topo colorido → "que rolê é esse e quando"
 *   2. grade de dados → "onde, que horas, qual meu estado"
 *   3. canhoto → "o que eu mostro na entrada"
 * A informação triplicou em relação ao card antigo; o número de decisões que
 * o olho precisa tomar, não.
 *
 * ── ITEM 12.1: O ATIVO VISUAL PRINCIPAL — E POR QUE ESTE ─────────────────
 *
 * O briefing pede: "Analisar qual será o principal ativo de identidade
 * visual dessa seção, considerando qual opção transmite mais liberdade e
 * mais sensação de paz no momento da compra. O critério de decisão não é
 * estético e sim emocional: o processo de compra precisa ser simples e
 * transparente. O ativo visual escolhido deve reduzir a ansiedade da
 * transação, não aumentá-la."
 *
 * **Escolha: o canhoto destacável — o ingresso de papel picotado.**
 *
 * O raciocínio, contra as alternativas óbvias:
 *
 * · **Por que não um QR gigante.** QR é o ativo que a indústria usa, e é
 *   exatamente o que AUMENTA ansiedade: é ilegível pra humano. A pessoa
 *   olha e não consegue conferir nada — precisa confiar que aquele borrão
 *   está certo. O critério do PO é o oposto disso. (E não existe leitor de
 *   QR na porta de nenhum evento MUNAY ainda; desenhar um agora seria
 *   ativo visual de um fluxo que não existe.)
 *
 * · **Por que não uma foto do evento.** Bonita, mas empurra o dado pra
 *   baixo — e o que acalma no momento da compra é ver data, hora e local
 *   sem rolar a tela.
 *
 * · **Por que o picote.** É um objeto que todo mundo já segurou: show,
 *   cinema, rifa de escola. Ele comunica três coisas sem uma palavra —
 *   *está pago, é seu, e é destacável* (ou seja, transferível, e portanto
 *   liberdade, que é o outro termo do critério). E, ao contrário do QR, o
 *   ingresso de papel se lê inteiro de relance: é a metáfora da
 *   transparência que o próprio briefing pede.
 *
 * O picote é feito com dois círculos na cor do FUNDO DA PÁGINA, posicionados
 * meio pra fora nas laterais — sem imagem, sem SVG, sem peso. Dependência
 * implícita que vale saber: eles são `bg-petroleo` porque a página é
 * `bg-petroleo`. Se algum dia este ingresso aparecer sobre outro fundo, o
 * picote vira duas bolinhas escuras flutuando.
 */

export type IngressoDados = {
  id: string;
  token: string;
  status: string;
  canceledAt: Date | null;
  event: {
    titulo: string;
    startsAt: Date;
    local: string | null;
    gratuito: boolean;
    community: { nome: string; modalidade: string; regiao: string };
  };
};

/** Código humano: 8 caracteres, agrupados, do token. Legível ao telefone. */
function codigoDe(token: string): string {
  const limpo = token.replace(/-/g, "").toUpperCase();
  return `${limpo.slice(0, 4)} ${limpo.slice(4, 8)}`;
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-areia/45">
        {rotulo}
      </dt>
      <dd className="mt-0.5 text-sm font-medium leading-snug text-areia">
        {valor}
      </dd>
    </div>
  );
}

export default function Ingresso({ dados }: { dados: IngressoDados }) {
  const cor = classesDoAcento(
    acentoDaModalidade(dados.event.community.modalidade),
  );
  const s = selo(dados);
  const situacao = situacaoDe(dados);
  const inativo = situacao === "cancelada";

  const data = new Date(dados.event.startsAt);
  const hora = data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const diaSemana = data.toLocaleDateString("pt-BR", { weekday: "long" });

  return (
    // O ingresso é `<Card>`, mas com a tinta invertida — e isso não é exceção
    // à toa: o item 12 do briefing pede EXPLICITAMENTE que esta tela fuja do
    // minimalismo claro do resto do site. O que o DS entrega aqui é a forma
    // (raio, recorte, comportamento); a cor escura é o pedido do PO.
    // A borda some porque em superfície escura ela viraria um fio claro em
    // volta do papel — o oposto do efeito de ingresso.
    <article className={cn("transition-opacity", inativo && "opacity-55")}>
      <Card className="overflow-hidden border-transparent bg-petroleo-soft">
        {/* Zona 1 — faixa da categoria: identifica antes de ler. */}
        <div
          className={`flex items-center justify-between gap-3 px-6 py-3 ${cor.traco}`}
        >
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-petroleo">
            {dados.event.community.modalidade}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-petroleo/70">
            {dados.event.community.regiao}
          </p>
        </div>

        <div className="px-6 pb-6 pt-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-lime">
            {dados.event.community.nome}
          </p>
          <h3 className="mt-1.5 font-display text-2xl font-extrabold leading-tight text-areia">
            {dados.event.titulo}
          </h3>

          {/* Zona 2 — a grade densa. Quatro dados sempre no mesmo lugar, em
            todo ingresso: é a repetição de posição que deixa o denso legível. */}
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-areia/15 py-5 sm:grid-cols-4">
            <Dado
              rotulo="Data"
              valor={data.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              })}
            />
            <Dado rotulo="Hora" valor={hora} />
            <Dado rotulo="Dia" valor={diaSemana} />
            <Dado
              rotulo="Valor"
              valor={dados.event.gratuito ? "Gratuito" : "Pago"}
            />
            <div className="col-span-2 sm:col-span-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-areia/45">
                Onde
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-areia">
                {dados.event.local ?? "Local a confirmar com a comunidade"}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className={
                situacao === "ativa" && dados.status === "confirmado"
                  ? "border-lime bg-lime text-petroleo"
                  : "border-areia/25 text-areia/70"
              }
            >
              {s.rotulo}
            </Badge>
            <p className="text-xs leading-relaxed text-areia/55">
              {dados.status === "lista_espera" && situacao === "ativa"
                ? "Você entra assim que alguém liberar vaga — a gente te avisa por e-mail."
                : situacao === "ativa"
                  ? "Tá tudo certo. É só aparecer."
                  : "Este ingresso já cumpriu o papel dele."}
            </p>
          </div>
        </div>

        {/* Zona 3 — o canhoto. Os dois círculos "mordem" as laterais na cor
          do fundo da página e produzem o efeito de papel picotado. */}
        <div className="relative border-t border-dashed border-areia/25 px-6 py-5">
          <span
            aria-hidden
            className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-petroleo"
          />
          <span
            aria-hidden
            className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-petroleo"
          />

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-areia/45">
                Seu código
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.2em] text-lime">
                {codigoDe(dados.token)}
              </p>
              <p className="mt-1 text-xs text-areia/50">
                É isso que você fala na entrada. Sem app, sem print.
              </p>
            </div>

            <Link
              href={`/rsvp/${dados.token}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                // Sobre fundo escuro o `outline` do DS (borda petróleo) some. O
                // lime é o único acento que sobrevive aqui — e é o uso raro que
                // o checklist item 5 autoriza: uma ação por ingresso.
                "border-2 border-lime px-5 text-sm text-lime hover:bg-lime hover:text-petroleo",
              )}
            >
              Gerenciar
            </Link>
          </div>
        </div>
      </Card>
    </article>
  );
}
