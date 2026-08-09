/**
 * Composição gráfica que ocupa o lugar da foto enquanto a foto real não
 * existe (ver a nota longa em `lib/midia.ts` sobre por que ela não existe).
 *
 * REGRAS DE DESENHO — não são estéticas, são de honestidade:
 *
 * 1. **Não finge ser foto.** Nada de silhueta humana, nada de textura
 *    fotográfica, nada de "gradiente de pôr do sol". É gráfico assumido, no
 *    mesmo idioma do `PlanoPiloto` — quem olha entende na hora que é
 *    ilustração, e ninguém lê como prova social que não temos.
 * 2. **Determinística.** O motivo vem do hash do `id`, não de sorteio: a
 *    mesma pauta desenha igual em todo build. Sorteio deixaria o site
 *    diferente entre servidor e cliente, e o React reclamaria de hidratação.
 * 3. **Zero hex.** Tudo em `currentColor` — a cor vem da classe de acento no
 *    elemento pai (regra 4: hex só em `lib/brand.ts`).
 * 4. **Zero JavaScript.** O movimento é CSS, e some inteiro em
 *    `prefers-reduced-motion` (tratado no globals.css).
 */

/** Hash pequeno e estável: mesmo `id`, mesmo motivo, sempre. */
function motivoDe(id: string): 0 | 1 | 2 {
  let soma = 0;
  for (let i = 0; i < id.length; i++) soma = (soma * 31 + id.charCodeAt(i)) % 9973;
  return (soma % 3) as 0 | 1 | 2;
}

/** Rastro de movimento — arcos paralelos varrendo o quadro. */
function Rastros() {
  return (
    <g fill="none" stroke="currentColor" strokeLinecap="round">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path
          key={i}
          d={`M ${-40 + i * 12} ${260 - i * 26} Q 200 ${190 - i * 30} ${440} ${
            250 - i * 34
          }`}
          strokeWidth={i % 2 === 0 ? 10 : 4}
          opacity={0.1 + i * 0.075}
        />
      ))}
    </g>
  );
}

/** Roda — anéis concêntricos, a geometria de um grupo em círculo. */
function Roda() {
  return (
    <g>
      {[26, 58, 92, 128, 166].map((r, i) => (
        <circle
          key={r}
          cx={200}
          cy={200}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={i === 1 ? 12 : 3}
          opacity={0.5 - i * 0.075}
        />
      ))}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <circle
            key={i}
            cx={200 + Math.cos(a) * 128}
            cy={200 + Math.sin(a) * 128}
            r={9}
            fill="currentColor"
            opacity={0.65}
          />
        );
      })}
    </g>
  );
}

/** Malha — campo de pontos com uma diagonal cortando, tipo quadra vista de cima. */
function Malha() {
  const pontos: { x: number; y: number; r: number }[] = [];
  for (let l = 0; l < 9; l++) {
    for (let c = 0; c < 9; c++) {
      const x = 40 + c * 40;
      const y = 40 + l * 40;
      // Pontos crescem em direção à diagonal: dá profundidade sem sombra.
      const perto = 1 - Math.abs(l - c) / 8;
      pontos.push({ x, y, r: 2 + perto * 7 });
    }
  }
  return (
    <g fill="currentColor">
      {pontos.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} opacity={0.12 + (p.r / 9) * 0.5} />
      ))}
      <path
        d="M 20 380 L 380 20"
        stroke="currentColor"
        strokeWidth={14}
        strokeLinecap="round"
        opacity={0.55}
        fill="none"
      />
    </g>
  );
}

const MOTIVOS = [Rastros, Roda, Malha] as const;

export default function MidiaPlaceholder({ id }: { id: string }) {
  const Motivo = MOTIVOS[motivoDe(id)];
  return (
    <svg
      viewBox="0 0 400 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className="absolute inset-0 h-full w-full"
    >
      <Motivo />
    </svg>
  );
}
