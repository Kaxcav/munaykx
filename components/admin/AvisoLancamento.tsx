"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  enviarAvisoLancamentoAction,
  type EstadoLancamento,
} from "@/app/admin/leads/actions";

/**
 * O BOTÃO DE AVISAR A LISTA — a única superfície que dispara o lançamento.
 *
 * Três coisas na tela existem para o mesmo fim: que ninguém mande sem querer.
 * O número de quem ainda não recebeu fica ANTES do botão (a pessoa lê para
 * quantos vai antes de clicar), o checkbox é obrigatório do lado do servidor
 * também, e o resultado diz quantos saíram e quantos falharam — em vez de um
 * "pronto!" que esconde o 429 do provedor.
 */

function Botao({ desabilitado }: { desabilitado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || desabilitado}
      className="rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo disabled:opacity-50"
    >
      {pending ? "Enviando…" : "Enviar aviso de lançamento"}
    </button>
  );
}

export default function AvisoLancamento({
  pendentes,
  avisados,
  lote,
}: {
  pendentes: number;
  avisados: number;
  lote: number;
}) {
  const [estado, enviar] = useActionState<EstadoLancamento, FormData>(
    enviarAvisoLancamentoAction,
    { status: "parado" },
  );

  const nesteLote = Math.min(pendentes, lote);

  return (
    <section className="mt-8 rounded-card border border-petroleo/15 bg-white/70 p-6">
      <h2 className="font-display text-xl font-bold">Aviso de lançamento</h2>
      <p className="mt-1 text-sm text-petroleo/80">
        Manda o e-mail “a MUNAY abriu” para quem entrou na lista de espera pelo
        site. Quem está aqui por ter feito inscrição em evento não recebe — não
        foi isso que a pessoa pediu.
      </p>

      <dl className="mt-4 flex flex-wrap gap-6 text-sm">
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wider text-petroleo/45">
            ainda não receberam
          </dt>
          <dd className="font-display text-2xl font-bold">{pendentes}</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wider text-petroleo/45">
            já receberam
          </dt>
          <dd className="font-display text-2xl font-bold">{avisados}</dd>
        </div>
      </dl>

      {pendentes === 0 ? (
        <p className="mt-4 rounded-xl border border-petroleo/15 p-4 text-sm text-petroleo/80">
          Não há ninguém na fila. Quem entrar na lista a partir de agora recebe
          a confirmação de cadastro, mas não este aviso — o lançamento já foi
          comunicado.
        </p>
      ) : (
        <form action={enviar} className="mt-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="confirmo"
              value="sim"
              className="mt-1 h-4 w-4 accent-petroleo"
            />
            <span>
              Confirmo que a MUNAY lançou e que este e-mail deve sair agora para{" "}
              <strong>{nesteLote}</strong>{" "}
              {nesteLote === 1 ? "pessoa" : "pessoas"}
              {pendentes > lote ? ` (de ${pendentes} na fila)` : ""}. Não tem
              como desfazer.
            </span>
          </label>
          <div className="mt-4">
            <Botao desabilitado={false} />
          </div>
          {pendentes > lote ? (
            <p className="mt-3 text-sm text-petroleo/70">
              Sai em lotes de {lote} para não bater no limite do provedor.
              Clique de novo para mandar o próximo.
            </p>
          ) : null}
        </form>
      )}

      {estado.status === "sem-confirmacao" ? (
        <p className="mt-4 rounded-xl border border-petroleo/15 p-4 text-sm">
          Nada foi enviado — marque a confirmação primeiro.
        </p>
      ) : null}

      {estado.status === "disputa" ? (
        <p className="mt-4 rounded-xl border border-petroleo/15 p-4 text-sm">
          Outra janela pegou este lote no mesmo instante e nada foi enviado
          daqui. Recarregue a página e clique de novo.
        </p>
      ) : null}

      {estado.status === "vazio" ? (
        <p className="mt-4 rounded-xl border border-petroleo/15 p-4 text-sm">
          A fila já estava vazia — ninguém recebeu nada agora.
        </p>
      ) : null}

      {estado.status === "enviado" ? (
        <div className="mt-4 rounded-xl border border-petroleo/15 p-4 text-sm">
          <p className="font-semibold">
            {estado.enviados} de {estado.tentados}{" "}
            {estado.tentados === 1 ? "e-mail saiu" : "e-mails saíram"}.
          </p>
          {estado.falharam > 0 ? (
            <p className="mt-1 text-petroleo/80">
              {estado.falharam}{" "}
              {estado.falharam === 1 ? "falhou" : "falharam"} no envio. Essas
              pessoas ficam marcadas como avisadas mesmo assim, para o lote não
              reenviar para a base toda — veja o log do servidor e trate uma a
              uma.
            </p>
          ) : null}
          <p className="mt-1 text-petroleo/80">
            {estado.restantes === 0
              ? "A fila acabou."
              : `Ainda faltam ${estado.restantes}. Clique de novo para o próximo lote.`}
          </p>
        </div>
      ) : null}
    </section>
  );
}
