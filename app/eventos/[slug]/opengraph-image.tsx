import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { dominioPublico } from "@/lib/contato";
import { getEventBySlug, formatarDataEvento } from "@/lib/events";

export const alt = "Evento na MUNAY";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * OG por evento — o cartão que aparece quando o link do evento cai no WhatsApp
 * ou no Instagram: título, dia e comunidade/região sobre a marca. Espelha o da
 * comunidade (`../../comunidades/[slug]/opengraph-image.tsx`).
 *
 * Grounded e à prova de falha: sem banco (DATABASE_URL fora do ar) cai no
 * cartão genérico da marca — a rota nunca quebra o compartilhamento. O `local`
 * segue a mesma verdade da página: quando não há lugar exato, a região da
 * comunidade é o que se mostra; aqui priorizamos o essencial (dia + comunidade).
 */
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const evento = await getEventBySlug(slug).catch(() => null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: brand.areia,
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9999, backgroundColor: brand.lime }} />
          <div
            style={{
              fontSize: 26,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: brand.petroleoSoft,
            }}
          >
            {evento
              ? `Evento · ${evento.community.modalidade} · ${evento.community.regiao}`
              : "Brasília · DF"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: evento ? 84 : 150,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: brand.petroleo,
              maxWidth: 1040,
            }}
          >
            {evento?.titulo ?? "MUNAY"}
          </div>
          {evento && (
            <div style={{ fontSize: 40, fontWeight: 700, color: brand.petroleoSoft }}>
              {/* Um único filho de texto: o `next/og` (Satori) exige display:flex
                  em div com mais de um filho — template literal evita a armadilha. */}
              {`${formatarDataEvento(evento.startsAt)} · ${evento.community.nome}`}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: brand.petroleo,
            }}
          >
            MUNAY
            <div style={{ width: 12, height: 12, marginLeft: 8, borderRadius: 9999, backgroundColor: brand.lime }} />
          </div>
          <div
            style={{
              fontSize: 24,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: brand.petroleoSoft,
            }}
          >
            {dominioPublico()}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
