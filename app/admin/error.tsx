"use client";

/**
 * Estado degradado do admin (ex.: banco fora do ar ou DATABASE_URL ausente):
 * mensagem direta em vez do 500 cru — é ferramenta interna, pode ser franca.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-xl py-10">
      <p className="eyebrow mb-3">Admin</p>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">
        Não deu pra falar com o banco.
      </h1>
      <p className="mt-3 text-petroleo/70">
        Confere se o Postgres está de pé e se <code>DATABASE_URL</code> está
        definida. Detalhe técnico: {error.digest ?? error.message}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-petroleo px-6 py-3 text-sm font-semibold text-areia transition-colors hover:bg-lime hover:text-petroleo"
      >
        Tentar de novo
      </button>
    </div>
  );
}
