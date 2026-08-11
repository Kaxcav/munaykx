"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-auth";
import { enviarLoteDeLancamento } from "@/lib/lancamento";

/**
 * Server Action do aviso de lançamento.
 *
 * `assertAdmin()` na primeira linha, como todas as actions do `/admin`: o
 * middleware responde antes, mas ele não pode ser ponto único de falha. Em
 * 09/08 mediu-se que, com o middleware desligado, os endpoints de export
 * devolviam 200 com o CSV inteiro — route handler e action não passam pelo
 * layout. Defesa em profundidade não é redundância aqui, é a barreira que
 * sobrou naquele dia.
 *
 * A action **não escolhe destinatário e não escolhe texto**. Recebe do
 * formulário exatamente uma coisa: a confirmação de que é para mandar. Quem é
 * a base e o que vai escrito mora em `lib/lancamento.ts` e
 * `lib/emails-lancamento.ts` — uma action que aceitasse filtro do formulário
 * seria, com um campo a mais, uma action que manda para qualquer um.
 */

export type EstadoLancamento =
  | { status: "parado" }
  | { status: "sem-confirmacao" }
  | { status: "vazio" }
  | { status: "disputa" }
  | {
      status: "enviado";
      tentados: number;
      enviados: number;
      falharam: number;
      restantes: number;
    };

export async function enviarAvisoLancamentoAction(
  _prev: EstadoLancamento,
  formData: FormData,
): Promise<EstadoLancamento> {
  await assertAdmin();

  // O gesto tem que ser deliberado. Sem o checkbox marcado, nada sai — é a
  // diferença entre um clique errado e uma base inteira avisada por engano.
  if (formData.get("confirmo") !== "sim") return { status: "sem-confirmacao" };

  const r = await enviarLoteDeLancamento();

  if (r.tentados === 0) {
    // Fila vazia e disputa com outra aba são estados diferentes na tela: um
    // diz "acabou", o outro diz "tenta de novo".
    return r.restantes === 0 ? { status: "vazio" } : { status: "disputa" };
  }

  revalidatePath("/admin/leads");
  return {
    status: "enviado",
    tentados: r.tentados,
    enviados: r.enviados,
    falharam: r.falharam,
    restantes: r.restantes,
  };
}
