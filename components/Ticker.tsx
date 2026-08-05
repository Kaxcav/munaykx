const MODALIDADES = [
  "corrida",
  "jiu-jítsu",
  "yoga",
  "funcional",
  "vôlei",
  "beach tennis",
  "trilha",
  "ciclismo",
  "muay thai",
  "dança",
  "skate",
  "pilates",
];

function Faixa({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div
      aria-hidden={ariaHidden}
      className="flex shrink-0 items-center gap-6 pr-6"
    >
      {MODALIDADES.map((m) => (
        <span key={m} className="flex items-center gap-6 whitespace-nowrap">
          <span className="font-display text-lg font-bold uppercase tracking-wide text-areia">
            {m}
          </span>
          <span aria-hidden className="text-lime">
            ●
          </span>
        </span>
      ))}
    </div>
  );
}

export default function Ticker() {
  return (
    <div className="overflow-hidden bg-petroleo py-4" role="presentation">
      <div className="flex w-max animate-ticker">
        <Faixa />
        <Faixa ariaHidden />
      </div>
    </div>
  );
}
