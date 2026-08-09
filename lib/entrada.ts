/**
 * Higiene de texto que vem de URL antes de virar query.
 *
 * POR QUE ISTO EXISTE (achado no QA de 09/08/2026): `/comunidades?modalidade=%00`
 * respondia **500**. O Postgres recusa o byte NUL dentro de texto, o Prisma
 * lança `PrismaClientUnknownRequestError`, e o erro sobe até virar página de
 * erro — numa rota pública, indexável, que qualquer um alcança sem login.
 *
 * O NUL não é o problema em si; o problema é confiar que texto de URL é texto
 * válido pro banco. Como a entrada chega de vários lugares (filtro de
 * descoberta, busca do /admin, parâmetro de rota), o guard mora aqui, num
 * arquivo só, em vez de repetido — repetido, ele diverge em silêncio.
 *
 * Não é sanitização de segurança: o Prisma já parametriza, então nunca houve
 * risco de injeção de SQL. É robustez — a diferença entre "não encontrei" e
 * "o site quebrou".
 */

/**
 * O padrão é montado com `String.fromCharCode(0)` em vez de escrito como
 * literal, e isso é deliberado: a primeira versão deste arquivo trazia o NUL
 * dentro do regex e o git passou a tratar o `.ts` como **binário** — arquivo
 * de código que não aparece em diff é pior que o bug que ele conserta. Assim
 * o fonte continua ASCII puro e legível em qualquer ferramenta.
 */
const NUL = new RegExp(String.fromCharCode(0), "g");

/**
 * Tira o NUL de um texto opcional. Devolve `undefined` quando não sobra nada,
 * pra cair no mesmo caminho de "filtro ausente" que o código já trata.
 */
export function semNul(valor: string | undefined | null): string | undefined {
  if (valor == null) return undefined;
  const limpo = valor.replace(NUL, "");
  return limpo.length > 0 ? limpo : undefined;
}

/** Versão pra parâmetro de rota, onde "vazio" e "só NUL" viram string vazia. */
export function semNulObrigatorio(valor: string): string {
  return valor.replace(NUL, "");
}
