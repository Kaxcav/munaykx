"use client";

import { useEffect, useState } from "react";
import { linkWhatsApp } from "@/lib/compartilhar";

/**
 * Botões de compartilhar de uma página pública (comunidade ou evento).
 *
 * Três caminhos, do mais nativo ao mais universal:
 * 1. **Web Share API** (`navigator.share`) — só aparece quando o navegador
 *    suporta (celular, na maioria). É o compartilhar "de verdade" do sistema.
 * 2. **WhatsApp** (`wa.me`) — o canal real de Brasília, sempre presente.
 * 3. **Copiar link** — o fallback que funciona em qualquer lugar.
 *
 * Progressive enhancement: renderiza como HTML útil mesmo sem JS (o link do
 * WhatsApp é um `<a href>` de verdade; o botão nativo e o de copiar só ganham
 * comportamento quando o JS carrega). O botão nativo nasce escondido e só
 * aparece após a checagem de suporte no cliente — senão o SSR e o cliente
 * divergiriam (erro de hidratação).
 *
 * Acessibilidade: cada controle tem rótulo textual visível + `aria-label`;
 * as cores usam tinta cheia (`text-petroleo` sobre claro, `text-areia` sobre
 * escuro), nunca as variantes esmaecidas — contraste AA conferido.
 */
export default function CompartilharBotoes({
  url,
  texto,
  titulo = "Compartilhar",
  className = "",
}: {
  url: string;
  texto: string;
  /** Título do diálogo nativo (não aparece no WhatsApp). */
  titulo?: string;
  className?: string;
}) {
  const [podeNativo, setPodeNativo] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setPodeNativo(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function compartilharNativo() {
    try {
      await navigator.share({ title: titulo, text: texto, url });
    } catch {
      // Usuário cancelou ou o navegador recusou — silêncio é o certo aqui.
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem clipboard (contexto inseguro / navegador antigo): WhatsApp e nativo
      // seguem valendo; não trava a página.
    }
  }

  const classeBotao =
    "inline-flex items-center gap-2 rounded-full border border-petroleo/25 bg-white/70 px-4 py-2 text-sm font-semibold text-petroleo transition-colors hover:border-petroleo/50 hover:bg-white";

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <span className="font-mono text-xs uppercase tracking-[0.14em] text-petroleo/70">
        Compartilhar
      </span>

      {podeNativo && (
        <button type="button" onClick={compartilharNativo} className={classeBotao} aria-label="Compartilhar por outros aplicativos">
          <IconeCompartilhar />
          Compartilhar
        </button>
      )}

      <a
        href={linkWhatsApp(texto, url)}
        target="_blank"
        rel="noopener noreferrer"
        className={classeBotao}
        aria-label="Compartilhar no WhatsApp"
      >
        <IconeWhatsApp />
        WhatsApp
      </a>

      <button type="button" onClick={copiar} className={classeBotao} aria-label="Copiar o link desta página">
        {copiado ? <IconeCheck /> : <IconeLink />}
        <span aria-live="polite">{copiado ? "Link copiado" : "Copiar link"}</span>
      </button>
    </div>
  );
}

/* — Ícones inline (traço, herdam `currentColor`, decorativos) — */

function IconeWhatsApp() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.03c-.24.68-1.42 1.31-1.95 1.35-.5.04-1.13.22-3.7-.77-3.1-1.2-5.06-4.35-5.22-4.55-.15-.2-1.24-1.65-1.24-3.14 0-1.49.78-2.22 1.06-2.53.28-.3.61-.38.81-.38.2 0 .41 0 .58.01.19.01.44-.07.68.52.24.6.83 2.07.9 2.22.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.32.39-.46.52-.15.15-.31.31-.13.6.17.3.77 1.27 1.66 2.06 1.14 1.02 2.1 1.33 2.4 1.48.3.15.47.13.65-.08.17-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.28.1 1.75.83 2.05.98.3.15.5.22.57.35.07.12.07.72-.17 1.4Z" />
    </svg>
  );
}
function IconeLink() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function IconeCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function IconeCompartilhar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}
