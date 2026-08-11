import type { Fornecedor, PedidoIa, ResultadoIa } from "@/lib/ai/tipos";

/**
 * FORNECEDOR ANTHROPIC — o padrão da MUNAY.
 *
 * ── Por que `fetch` cru e não o SDK oficial ──────────────────────────────
 *
 * O SDK `@anthropic-ai/sdk` é o caminho recomendado pela Anthropic e seria o
 * default numa base nova. Aqui ele NÃO entrou, e o motivo é escopo: este PR
 * refatora o que já existe sem mudar comportamento, e trocar o transporte
 * significaria dependência nova, bundle maior e um conjunto diferente de erros
 * em produção — três coisas que não dá pra afirmar que "não mudam nada".
 *
 * A chamada abaixo é byte a byte a que `lib/ia.ts` já fazia em produção.
 * **Adotar o SDK é decisão do dono** e está registrada como tal; quando for
 * feita, é este arquivo que muda — nenhuma feature encosta em HTTP.
 *
 * ── Modelo ──────────────────────────────────────────────────────────────
 *
 * `ANTHROPIC_MODEL` manda; o default continua sendo Haiku, que é o mais barato
 * e rápido, e foi escolha deliberada para uma busca pública de alto volume.
 * Trocar por um modelo mais capaz muda a conta no fim do mês — é decisão de
 * custo, não de código, e sai por env sem deploy.
 */

const MODELO_PADRAO = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 8_000;

export function criarFornecedorAnthropic(): Fornecedor {
  const modelo = process.env.ANTHROPIC_MODEL?.trim() || MODELO_PADRAO;

  return {
    nome: "anthropic",
    modelo,

    disponivel(): boolean {
      return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
    },

    async gerar(pedido: PedidoIa): Promise<ResultadoIa<string>> {
      const chave = process.env.ANTHROPIC_API_KEY?.trim();
      if (!chave) return null;

      // AbortController porque um endpoint público não pode ficar pendurado
      // esperando a API: a pessoa fica olhando spinner enquanto o filtro
      // normal já teria respondido.
      const controle = new AbortController();
      const relogio = setTimeout(
        () => controle.abort(),
        pedido.timeoutMs ?? TIMEOUT_MS,
      );

      try {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          signal: controle.signal,
          headers: {
            "content-type": "application/json",
            "x-api-key": chave,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: modelo,
            max_tokens: pedido.maxTokens,
            system: pedido.sistema,
            messages: [
              {
                role: "user",
                // Com imagem (visão), o conteúdo vira um array [imagem, texto] —
                // o formato que a Messages API espera. Sem imagem, segue string
                // pura, byte a byte o de sempre (aditivo, não muda o texto).
                content: pedido.imagem
                  ? [
                      {
                        type: "image",
                        source: {
                          type: "base64",
                          media_type: pedido.imagem.mediaType,
                          data: pedido.imagem.dados,
                        },
                      },
                      { type: "text", text: pedido.usuario },
                    ]
                  : pedido.usuario,
              },
            ],
          }),
        });

        if (!resp.ok) {
          console.error(`[ai:anthropic] API respondeu ${resp.status}`);
          return null;
        }

        const dados = (await resp.json()) as {
          content?: { type: string; text?: string }[];
        };
        const texto = dados.content?.find((c) => c.type === "text")?.text ?? "";
        return texto || null;
      } catch (erro) {
        console.error(
          "[ai:anthropic] falha na chamada:",
          erro instanceof Error ? erro.message : erro,
        );
        return null;
      } finally {
        clearTimeout(relogio);
      }
    },
  };
}
