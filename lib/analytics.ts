/**
 * Eventos custom do Umami — nomes fechados aqui pra ninguém inventar
 * variação em componente. Analytics nunca quebra o fluxo do usuário:
 * sem script carregado (env ausente, adblock), a chamada é um no-op.
 */
export type EventoAnalytics =
  | "lead_participante"
  | "lead_organizador"
  | "rsvp_confirmado"
  | "rsvp_lista_espera";

declare global {
  interface Window {
    umami?: { track: (evento: string) => void };
  }
}

export function track(evento: EventoAnalytics): void {
  if (typeof window === "undefined") return;
  try {
    window.umami?.track(evento);
  } catch {
    // métrica perdida < fluxo quebrado
  }
}
