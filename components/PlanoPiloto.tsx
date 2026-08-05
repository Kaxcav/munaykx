/**
 * Assinatura visual do site: o Plano Piloto abstraído em malha de pontos
 * (eixo rodoviário curvo + eixo monumental), com pins em lime pulsando
 * onde existem comunidades. Puro SVG — sem API de mapa, sem custo.
 */

// Perfil do eixão: arco com barriga para oeste. t ∈ [-1, 1] (norte → sul)
function arcPoint(t: number, base: number, curv: number) {
  return { x: base - curv * (1 - t * t), y: 240 + t * 195 };
}

const ROWS = [
  { base: 148, curv: 44, n: 15, o: 0.18 }, // fileira oeste
  { base: 178, curv: 48, n: 17, o: 0.34 }, // eixão
  { base: 208, curv: 44, n: 15, o: 0.22 },
  { base: 236, curv: 40, n: 13, o: 0.14 }, // fileira leste
];

const PINS = [
  { t: -0.72, base: 178, label: "corrida · 6h", dx: 12, dy: 4 },
  { t: -0.28, base: 208, label: "yoga · sáb 8h", dx: 12, dy: 4 },
  { t: 0.18, base: 148, label: "jiu-jítsu · 19h", dx: -104, dy: 4 },
  { t: 0.55, base: 208, label: "funcional · 6h30", dx: 12, dy: 4 },
  { t: 0.82, base: 178, label: "vôlei · dom", dx: 12, dy: 4 },
];

export default function PlanoPiloto() {
  return (
    <svg
      viewBox="0 0 420 480"
      role="img"
      aria-labelledby="pp-title"
      className="h-auto w-full max-w-[420px]"
    >
      <title id="pp-title">
        Mapa estilizado do Plano Piloto de Brasília com comunidades esportivas
        marcadas nas asas Norte e Sul
      </title>

      {/* Eixo Monumental */}
      <line
        x1={70}
        y1={240}
        x2={368}
        y2={240}
        stroke="#0F3B3C"
        strokeOpacity={0.28}
        strokeWidth={2}
        strokeDasharray="1 7"
        strokeLinecap="round"
      />

      {/* Malha de superquadras */}
      {ROWS.map((row, ri) =>
        Array.from({ length: row.n }, (_, i) => {
          const t = -1 + (2 * i) / (row.n - 1);
          const p = arcPoint(t, row.base, row.curv);
          return (
            <circle
              key={`${ri}-${i}`}
              cx={p.x}
              cy={p.y}
              r={3}
              fill="#0F3B3C"
              fillOpacity={row.o}
            />
          );
        }),
      )}

      {/* Pins de comunidades */}
      {PINS.map((pin, i) => {
        const p = arcPoint(pin.t, pin.base, 46);
        return (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={6}
              fill="#C6FF3D"
              stroke="#0F3B3C"
              strokeWidth={1.5}
              className="animate-pin-pulse"
              style={{ animationDelay: `${i * 0.45}s`, transformOrigin: `${p.x}px ${p.y}px` }}
            />
            <text
              x={p.x + pin.dx}
              y={p.y + pin.dy}
              fontFamily="var(--font-mono), monospace"
              fontSize={11}
              fill="#0F3B3C"
              fillOpacity={0.75}
            >
              {pin.label}
            </text>
          </g>
        );
      })}

      {/* Rótulos estruturais */}
      <text
        x={196}
        y={26}
        textAnchor="middle"
        fontFamily="var(--font-mono), monospace"
        fontSize={11}
        letterSpacing={3}
        fill="#0F3B3C"
        fillOpacity={0.5}
      >
        ASA NORTE
      </text>
      <text
        x={196}
        y={468}
        textAnchor="middle"
        fontFamily="var(--font-mono), monospace"
        fontSize={11}
        letterSpacing={3}
        fill="#0F3B3C"
        fillOpacity={0.5}
      >
        ASA SUL
      </text>
    </svg>
  );
}
