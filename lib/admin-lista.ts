/**
 * Helpers das listagens do admin: paginação, recorte por período e
 * montagem de querystring.
 *
 * Por que isso existe: as listas de leads e RSVPs nasceram com
 * `findMany` sem limite. Com 40 registros passa despercebido; com os 500
 * leads que o edital pede, a página vira um documento de vários megabytes
 * e o navegador engasga. Paginar agora é barato — depois é incidente.
 *
 * Regra do CSV: **exportação ignora a paginação de propósito**. O filtro
 * vale (tipo, origem, busca, período), a página não — quem clica em
 * "Exportar" quer o recorte inteiro, não os 50 que estão na tela.
 */

export const POR_PAGINA = 50;

/** Períodos oferecidos. `null` = desde sempre. */
export const PERIODOS = [
  { valor: "7", label: "7 dias" },
  { valor: "30", label: "30 dias" },
] as const;

export type Periodo = (typeof PERIODOS)[number]["valor"];

/** "3" → 3. Lixo, zero e negativo caem na página 1 (nunca 500). */
export function parsePagina(valor: string | undefined): number {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Só aceita os períodos da lista — querystring é entrada de usuário. */
export function parsePeriodo(valor: string | undefined): Periodo | undefined {
  return PERIODOS.find((p) => p.valor === valor)?.valor;
}

/** Termo de busca limpo, ou undefined. Corta em 80 pra não virar vetor de carga. */
export function parseBusca(valor: string | undefined): string | undefined {
  const termo = valor?.trim().slice(0, 80);
  return termo ? termo : undefined;
}

/** Período → data de corte pro `createdAt: { gte }`. */
export function desdeQuando(periodo: Periodo | undefined): Date | undefined {
  if (!periodo) return undefined;
  const dias = Number(periodo);
  return new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
}

/** `{ take, skip }` do Prisma pra uma página. */
export function fatia(pagina: number) {
  return { take: POR_PAGINA, skip: (pagina - 1) * POR_PAGINA };
}

/**
 * Descreve a página atual pro rodapé da tabela. `pagina` já vem validada,
 * mas pode apontar além do fim (alguém editou a URL) — aí `vazia` avisa.
 */
export function paginacao(total: number, pagina: number) {
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const primeiro = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const ultimo = Math.min(pagina * POR_PAGINA, total);
  return {
    paginas,
    primeiro,
    ultimo,
    temAnterior: pagina > 1,
    temProxima: pagina < paginas,
    foraDoFim: pagina > paginas,
  };
}

/**
 * Monta `?a=1&b=2` descartando o que está vazio — e **descarta `p=1`**,
 * pra URL da primeira página ficar limpa e canônica.
 */
export function query(
  params: Record<string, string | number | undefined | null>,
): string {
  const qs = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (valor === undefined || valor === null || valor === "") continue;
    if (chave === "p" && Number(valor) <= 1) continue;
    qs.set(chave, String(valor));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}
