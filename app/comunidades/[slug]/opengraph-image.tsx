import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { dominioPublico } from "@/lib/contato";
import { getCommunityBySlug } from "@/lib/communities";

export const alt = "Comunidade na MUNAY";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * OG por comunidade: nome + modalidade/região sobre a marca. Sem banco
 * (DATABASE_URL ausente ou fora do ar), cai no cartão genérico — a rota
 * nunca quebra o compartilhamento.
 */
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comunidade = await getCommunityBySlug(slug).catch(() => null);

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
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 9999,
              backgroundColor: brand.lime,
            }}
          />
          <div
            style={{
              fontSize: 26,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: brand.petroleoSoft,
            }}
          >
            {comunidade
              ? `${comunidade.modalidade} · ${comunidade.regiao}`
              : "Brasília · DF"}
          </div>
        </div>

        <div
          style={{
            fontSize: comunidade ? 92 : 150,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            color: brand.petroleo,
            maxWidth: 1040,
          }}
        >
          {comunidade?.nome ?? "MUNAY"}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
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
            <div
              style={{
                width: 12,
                height: 12,
                marginLeft: 8,
                borderRadius: 9999,
                backgroundColor: brand.lime,
              }}
            />
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
