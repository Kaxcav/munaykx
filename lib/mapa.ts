import { REGIOES_DF } from "@/lib/regioes";
import { recortesComDado } from "@/lib/descoberta";
import { CIDADE_PADRAO } from "@/lib/communities";

/**
 * O mapa do movimento no DF.
 *
 * É um ESQUEMA, não um mapa cartográfico — e a página diz isso em voz alta.
 * As posições são relativas e aproximadas, do jeito que um brasiliense
 * desenharia no guardanapo: Plano Piloto no meio, lago à direita, Ceilândia
 * e Taguatinga a oeste, Gama e Santa Maria ao sul, Planaltina e Sobradinho
 * ao norte. Ninguém deve usar isto pra navegar até lugar nenhum.
 *
 * POR QUE NÃO UM MAPA DE VERDADE: mapa com tile (Google, Mapbox) é serviço
 * pago com chave, cota e cobrança por visualização — e a regra do projeto
 * é explícita sobre não trocar a assinatura visual procedural por mapa
 * pago. Além disso o banco não guarda coordenada de comunidade: guarda RA.
 * Um mapa preciso mostraria pontos que o dado não tem. Este mostra
 * exatamente o que o dado tem: presença por região.
 *
 * E o mais importante do produto: o mapa mostra também **onde ainda não
 * tem nada**. Uma plataforma que só mostra onde já chegou parece completa;
 * mostrar os vazios é o argumento de existir (Blueprint §8: alcançar além
 * do Plano Piloto).
 */

/**
 * Posição de cada RA num plano 0–100 (x: oeste→leste, y: norte→sul).
 *
 * TODA RA de `REGIOES_DF` precisa estar aqui — há teste que reprova se
 * faltar uma ou sobrar uma que não existe. Sem isso, criar uma RA nova em
 * `lib/regioes.ts` a faria sumir do mapa em silêncio.
 */
export const COORDENADAS: Record<string, { x: number; y: number }> = {
  // Norte
  Fercal: { x: 46, y: 12 },
  Planaltina: { x: 66, y: 16 },
  Arapoanga: { x: 64, y: 22 },
  "Sobradinho II": { x: 47, y: 22 },
  Sobradinho: { x: 52, y: 27 },
  Brazlândia: { x: 14, y: 26 },
  // Beira do lago e centro
  Varjão: { x: 56, y: 34 },
  "Lago Norte": { x: 58, y: 38 },
  Itapoã: { x: 64, y: 33 },
  Paranoá: { x: 70, y: 41 },
  "Plano Piloto": { x: 49, y: 44 },
  Cruzeiro: { x: 44, y: 45 },
  "Sudoeste/Octogonal": { x: 45, y: 48 },
  "Lago Sul": { x: 59, y: 51 },
  "Jardim Botânico": { x: 65, y: 52 },
  "São Sebastião": { x: 68, y: 58 },
  // Oeste
  "SCIA/Estrutural": { x: 39, y: 45 },
  SIA: { x: 41, y: 50 },
  Guará: { x: 43, y: 53 },
  "Vicente Pires": { x: 34, y: 47 },
  Taguatinga: { x: 28, y: 47 },
  Ceilândia: { x: 20, y: 44 },
  "Sol Nascente/Pôr do Sol": { x: 14, y: 45 },
  "Águas Claras": { x: 32, y: 53 },
  Arniqueira: { x: 34, y: 57 },
  Samambaia: { x: 23, y: 55 },
  // Sul
  "Núcleo Bandeirante": { x: 41, y: 57 },
  Candangolândia: { x: 44, y: 57 },
  "Park Way": { x: 43, y: 63 },
  "Riacho Fundo": { x: 36, y: 60 },
  "Riacho Fundo II": { x: 32, y: 64 },
  "Recanto das Emas": { x: 26, y: 64 },
  "Água Quente": { x: 23, y: 68 },
  "Santa Maria": { x: 42, y: 74 },
  Gama: { x: 32, y: 78 },
};

/**
 * Contorno esquemático do Lago Paranoá, só pra orientação visual.
 *
 * Sem ele o desenho vira nuvem de pontos e ninguém reconhece a cidade; com
 * ele o olho acha o Plano Piloto na hora. É decorativo — `aria-hidden` na
 * renderização.
 */
export const LAGO =
  "M 54 30 C 58 33 57 38 61 41 C 65 44 66 49 63 54 C 60 58 56 57 58 51 C 60 46 55 43 53 38 C 52 34 52 31 54 30 Z";

/**
 * RAs que ganham rótulo mesmo sem comunidade nenhuma, só pra orientar o
 * olho. São cinco e bem espalhadas de propósito — norte, sul, leste, oeste
 * e centro.
 *
 * Rotular as 35 seria ilegível: os nomes são longos e as RAs centrais se
 * amontoam num punhado de unidades do desenho. Rotular nenhuma deixaria o
 * mapa uma nuvem de pontos anônima que não parece Brasília. Cinco âncoras
 * resolvem as duas coisas.
 */
export const ANCORAS: ReadonlySet<string> = new Set([
  "Plano Piloto",
  "Ceilândia",
  "Planaltina",
  "Gama",
  "São Sebastião",
]);

/** Estado de uma RA no mapa. A ordem importa: é do "tem" pro "não tem". */
export type EstadoRegiao = "real" | "exemplo" | "vazio";

export type RegiaoNoMapa = {
  regiao: string;
  x: number;
  y: number;
  /** Comunidades ativas na RA, contando as ilustrativas. */
  total: number;
  /** Quantas NÃO são demo. É isto que separa "real" de "exemplo". */
  reais: number;
  estado: EstadoRegiao;
  /** Slug do recorte de descoberta. `null` quando não há dado nenhum. */
  slug: string | null;
};

/**
 * As 35 RAs com o que existe em cada uma.
 *
 * Reaproveita `recortesComDado()` de propósito, em vez de fazer a própria
 * consulta: assim o mapa e as páginas `/descobrir` contam a MESMA coisa.
 * Duas fontes de verdade divergiriam no primeiro cadastro e o mapa
 * apontaria pra 404 — o link do mapa só existe porque o recorte existe.
 */
export async function regioesNoMapa(
  city: string = CIDADE_PADRAO,
): Promise<RegiaoNoMapa[]> {
  // Sem banco de pé o site continua subindo (regra do projeto) — o mapa só
  // fica todo vazio, que é literalmente o que sabemos nesse momento. Um
  // mapa que explode derrubaria a home junto pelo link do menu.
  const recortes = process.env.DATABASE_URL
    ? await recortesComDado(city).catch(() => [])
    : [];

  // Só os recortes de região pura ("em-ceilandia"), não os de modalidade
  // nem os combinados.
  const porRegiao = new Map(
    recortes
      .filter((r) => r.regiao && !r.modalidade)
      .map((r) => [r.regiao as string, r]),
  );

  return REGIOES_DF.map((regiao) => {
    const recorte = porRegiao.get(regiao);
    const total = recorte?.total ?? 0;
    const reais = recorte?.reais ?? 0;
    const estado: EstadoRegiao =
      reais > 0 ? "real" : total > 0 ? "exemplo" : "vazio";
    return {
      regiao,
      ...COORDENADAS[regiao],
      total,
      reais,
      estado,
      slug: recorte?.slug ?? null,
    };
  });
}

/**
 * A página inteira sai `noindex` enquanto não houver comunidade real —
 * mesma regra das páginas de recorte (regra 3 do projeto). Um mapa de
 * exemplos indexado no Google afirmaria publicamente uma cobertura que a
 * MUNAY ainda não tem.
 */
export function mapaIndexavel(regioes: RegiaoNoMapa[]): boolean {
  return regioes.some((r) => r.estado === "real");
}

/** Raio do círculo da RA. Cresce devagar de propósito: com raiz, uma RA com
 * 20 comunidades não engole as vizinhas de 1. */
export function raio(r: RegiaoNoMapa): number {
  if (r.total === 0) return 0.9;
  return Math.min(1.6 + Math.sqrt(r.total) * 1.2, 5.5);
}
