"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { responder, sugestoes, type Chave } from "@/lib/ai/copiloto";

/**
 * Server Action do copiloto do organizador.
 *
 * O `userId` é lido AQUI, no servidor, e vai como primeiro argumento pra
 * `responder`. Nunca vem do formulário e nunca vem do modelo — Server Action
 * é endpoint HTTP como outro qualquer, e aceitar dono do corpo deixaria
 * qualquer um consultar os números de outra organização.
 *
 * A action não recebe nem repassa nada além do TEXTO da pergunta. Não há
 * parâmetro de evento, de comunidade ou de id: a intenção escolhida e o
 * `userId` bastam, e é isso que mantém a superfície pequena.
 */

export type EstadoCopiloto =
  | { status: "vazio" }
  | { status: "nao-entendi"; sugestoes: string[] }
  | { status: "indisponivel"; sugestoes: string[] }
  | {
      status: "ok";
      pergunta: string;
      texto: string;
      intencao: Chave;
      dados: Record<string, number | string | null>;
    };

export async function perguntarAction(
  _prev: EstadoCopiloto,
  formData: FormData,
): Promise<EstadoCopiloto> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/entrar");

  const pergunta = String(formData.get("pergunta") ?? "").trim();
  if (!pergunta) return { status: "vazio" };

  // Mesmo padrão de identificação das outras features: atrás de proxy o IP
  // real vem no cabeçalho. Serve só pro teto de custo e morre aqui.
  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "painel";

  const r = await responder(sessao.user.id, pergunta, ip);

  if (!r.ok) {
    return r.motivo === "indisponivel"
      ? { status: "indisponivel", sugestoes: r.sugestoes }
      : { status: "nao-entendi", sugestoes: r.sugestoes };
  }

  return {
    status: "ok",
    pergunta,
    texto: r.resposta.texto,
    intencao: r.resposta.intencao,
    dados: r.resposta.dados,
  };
}

export async function sugestoesIniciais(): Promise<string[]> {
  return sugestoes();
}
