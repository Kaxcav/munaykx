/**
 * Selo "Acolhe iniciantes" — sinal explícito que o organizador liga (STORY
 * acolhe-iniciante). Ataca o "medo de não pertencer": quem tá começando vê,
 * antes de chegar, que ali é bem-vindo.
 *
 * Cor: lime sobre petróleo (contraste ~10.4:1 — passa WCAG AA com folga; a
 * auditoria pegou texto muted abaixo de AA, então aqui é sólido de propósito).
 * `aria-label` explícito porque o ícone 🌱 é decorativo (`aria-hidden`).
 */
export default function SeloAcolheIniciante({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-lime px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-petroleo ${className}`}
      aria-label="Esta comunidade acolhe iniciantes"
    >
      <span aria-hidden>🌱</span>
      Acolhe iniciantes
    </span>
  );
}
