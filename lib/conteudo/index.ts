import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { REGISTRO, ehChave, type Chave, type ValorDe } from "@/lib/conteudo/registro";

/**
 * LEITURA DO CONTEÚDO EDITÁVEL (ULTRAPLAN, Onda 1).
 *
 * CONTRATO: **nunca lança e nunca devolve undefined.** Banco fora do ar, tabela
 * vazia, valor em formato antigo, `DATABASE_URL` ausente — em todos os casos
 * cai no padrão do registro, que é o texto que já estava hardcoded. O site
 * continua idêntico ao de hoje. Mesma regra do "sem DATABASE_URL o site sobe".
 *
 * CACHE — e aqui está o motivo desta camada existir com tag:
 * a home é **estática** (prerenderizada no build). Sem invalidação, o dono
 * editaria, veria "publicado com sucesso" e o site NÃO mudaria até o próximo
 * deploy — o pior modo de falha possível, porque parece funcionar. Publicar
 * chama `revalidateTag(TAG_CONTEUDO)` (ver `lib/conteudo/admin.ts`), e a
 * próxima renderização lê do banco.
 *
 * Efeito colateral bom: a mesma invalidação conserta o bug latente de
 * "cadastrei comunidade e a home não mudou" (`components/Vitrine.tsx` lê o
 * banco numa página estática).
 */

export const TAG_CONTEUDO = "conteudo";

async function buscarDoBanco(): Promise<Record<string, unknown>> {
  if (!process.env.DATABASE_URL) return {};
  try {
    const linhas = await prisma.conteudoSite.findMany({
      select: { chave: true, valor: true },
    });
    return Object.fromEntries(linhas.map((l) => [l.chave, l.valor]));
  } catch {
    // Banco fora do ar não pode derrubar a página — o padrão cobre.
    return {};
  }
}

const buscarCacheado = unstable_cache(buscarDoBanco, ["conteudo-site"], {
  tags: [TAG_CONTEUDO],
});

/**
 * Lê o mapa inteiro de uma vez: uma query por render, não uma por chave.
 *
 * O `try` em volta do cache não é paranoia: `unstable_cache` **lança**
 * ("Invariant: incrementalCache missing") fora do runtime do Next — em script,
 * seed ou processo de teste. Este módulo promete no cabeçalho que nunca lança,
 * e sem esta rede a promessa era falsa. Fora do Next, lê direto do banco.
 */
async function lerPublicados(): Promise<Record<string, unknown>> {
  try {
    return await buscarCacheado();
  } catch {
    return buscarDoBanco();
  }
}

/**
 * Valida um valor bruto contra o registro. Fora do padrão → devolve o padrão.
 * É aqui que rollback para um formato antigo deixa de ser um erro 500.
 */
function validar<K extends Chave>(chave: K, bruto: unknown): ValorDe<K> {
  const def = REGISTRO[chave];
  const r = def.schema.safeParse(bruto);
  if (r.success) return r.data as ValorDe<K>;
  return def.padrao as ValorDe<K>;
}

/** O valor publicado de uma chave, ou o padrão. Nunca lança. */
export async function conteudo<K extends Chave>(chave: K): Promise<ValorDe<K>> {
  const mapa = await lerPublicados();
  if (!(chave in mapa)) return REGISTRO[chave].padrao as ValorDe<K>;
  return validar(chave, mapa[chave]);
}

/** Várias chaves de uma vez, sem N queries — o mapa já veio inteiro. */
export async function conteudos<K extends Chave>(
  chaves: readonly K[],
): Promise<{ [P in K]: ValorDe<P> }> {
  const mapa = await lerPublicados();
  const saida = {} as { [P in K]: ValorDe<P> };
  for (const chave of chaves) {
    saida[chave] =
      chave in mapa
        ? validar(chave, mapa[chave])
        : (REGISTRO[chave].padrao as ValorDe<K>);
  }
  return saida;
}

/**
 * Leitura SEM cache, para o /admin e para o preview: quem está editando tem
 * que ver o que acabou de salvar, não o que está cacheado.
 */
export async function conteudoFresco<K extends Chave>(chave: K): Promise<ValorDe<K>> {
  if (!process.env.DATABASE_URL) return REGISTRO[chave].padrao as ValorDe<K>;
  try {
    const linha = await prisma.conteudoSite.findUnique({
      where: { chave },
      select: { valor: true },
    });
    if (!linha) return REGISTRO[chave].padrao as ValorDe<K>;
    return validar(chave, linha.valor);
  } catch {
    return REGISTRO[chave].padrao as ValorDe<K>;
  }
}

export { REGISTRO, ehChave, type Chave, type ValorDe };
