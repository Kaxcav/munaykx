import Link from "next/link";
import { EMAIL_CONTATO } from "@/lib/contato";

export default function Footer() {
  return (
    <footer className="border-t border-petroleo/10 bg-areia">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-3xl font-extrabold tracking-tight">
            MUNAY<span className="text-coral">.</span>
          </p>
          <p className="mt-2 max-w-sm text-sm text-petroleo/70">
            Comunidades, eventos e experiências esportivas e culturais de
            Brasília — em um só lugar.
          </p>
        </div>

        <div className="font-mono text-xs uppercase tracking-[0.18em] text-petroleo/50">
          <p>Brasília · DF</p>
          <p className="mt-1">
            <a href={`mailto:${EMAIL_CONTATO}`} className="hover:text-petroleo">
              {EMAIL_CONTATO}
            </a>
          </p>
          <p className="mt-1">
            <Link href="/privacidade" className="hover:text-petroleo">
              Política de privacidade
            </Link>
          </p>
          <p className="mt-1">© 2026 MUNAY</p>
        </div>
      </div>
    </footer>
  );
}
