import { ANCORAS, LAGO, raio, type RegiaoNoMapa } from "@/lib/mapa";

/**
 * Mapa esquemático do DF. Server component puro: SVG procedural, zero
 * JavaScript, zero dependência externa, zero serviço pago (regra do
 * projeto — a assinatura visual é desenhada, não licenciada).
 *
 * Três estados, e cada um diz uma coisa diferente e verdadeira:
 *
 * - **real**: tem comunidade cadastrada de verdade. Círculo cheio, e é link.
 * - **exemplo**: só tem conteúdo ilustrativo (`demo: true`). Contorno
 *   tracejado, continua sendo link, mas o desenho não deixa confundir com
 *   parceria firmada — a regra 3 do projeto proíbe afirmar parceiro que
 *   não assinou.
 * - **vazio**: ponto pequeno, SEM link. Mandar alguém pra um recorte que
 *   não existe seria 404 — e um mapa que só mostra onde já chegamos
 *   esconderia justamente o argumento da MUNAY existir.
 *
 * Cor: só classes de token (regra 4). O lime aparece uma vez só, no hover
 * — acento raro, nunca fundo de texto (regra 7).
 */
export function MapaDF({ regioes }: { regioes: RegiaoNoMapa[] }) {
  return (
    <svg
      viewBox="4 4 80 84"
      className="h-auto w-full max-w-3xl"
      aria-labelledby="mapa-titulo mapa-descricao"
    >
      <title id="mapa-titulo">Esquema das 35 regiões administrativas do DF</title>
      <desc id="mapa-descricao">
        Cada região aparece como um círculo, do tamanho de quantas
        comunidades tem. A lista logo abaixo do mapa traz a mesma informação
        em texto, com os mesmos links.
      </desc>

      {/* Lago Paranoá — só orientação visual, não carrega informação. */}
      <path
        d={LAGO}
        aria-hidden="true"
        className="fill-petroleo/[0.06] stroke-petroleo/15"
        strokeWidth={0.3}
      />

      {regioes.map((r) => (
        <PinDaRegiao key={r.regiao} r={r} />
      ))}
    </svg>
  );
}

/** Texto do tooltip/leitor de tela. É a mesma frase pros dois. */
function descrever(r: RegiaoNoMapa): string {
  if (r.estado === "vazio") return `${r.regiao}: nenhuma comunidade ainda`;
  const n = r.estado === "real" ? r.reais : r.total;
  const plural = n === 1 ? "comunidade" : "comunidades";
  const ressalva = r.estado === "exemplo" ? " (conteúdo ilustrativo)" : "";
  return `${r.regiao}: ${n} ${plural}${ressalva}`;
}

function PinDaRegiao({ r }: { r: RegiaoNoMapa }) {
  const legenda = descrever(r);

  const circulo =
    r.estado === "real" ? (
      <circle
        cx={r.x}
        cy={r.y}
        r={raio(r)}
        className="fill-petroleo transition-colors group-hover:fill-lime"
      />
    ) : r.estado === "exemplo" ? (
      <circle
        cx={r.x}
        cy={r.y}
        r={raio(r)}
        strokeWidth={0.5}
        strokeDasharray="1.2 1"
        className="fill-areia stroke-petroleo/50 transition-colors group-hover:stroke-petroleo"
      />
    ) : (
      <circle cx={r.x} cy={r.y} r={raio(r)} className="fill-petroleo/20" />
    );

  // RA sem dado não vira link: não existe recorte, e o link daria 404.
  if (!r.slug) {
    return (
      <g>
        <title>{legenda}</title>
        {circulo}
        {ANCORAS.has(r.regiao) && (
          <text
            x={r.x}
            y={r.y + raio(r) + 2.8}
            fontSize={2.1}
            textAnchor="middle"
            className="fill-petroleo/35 font-sans"
          >
            {r.regiao}
          </text>
        )}
      </g>
    );
  }

  return (
    <a href={`/descobrir/${r.slug}`} className="group">
      <title>{legenda}</title>
      {circulo}
      <text
        x={r.x + raio(r) + 1.2}
        y={r.y + 0.8}
        fontSize={2.3}
        className="fill-petroleo/80 font-sans font-semibold"
      >
        {r.regiao}
      </text>
    </a>
  );
}
