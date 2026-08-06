import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const alt = "MUNAY — comunidades esportivas e culturais de Brasília";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * OG image da marca — gerada em runtime com next/og (sem asset estático,
 * sem rede no build). Cores exclusivamente de lib/brand.ts.
 */
export default function OpengraphImage() {
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
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
            Brasília · DF
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 170,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: brand.petroleo,
              display: "flex",
              alignItems: "baseline",
            }}
          >
            MUNAY
            <div
              style={{
                width: 28,
                height: 28,
                marginLeft: 14,
                borderRadius: 9999,
                backgroundColor: brand.lime,
              }}
            />
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 44,
              color: brand.petroleoSoft,
              maxWidth: 900,
            }}
          >
            Comunidades, eventos e experiências esportivas e culturais — em um
            só lugar.
          </div>
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
              height: 10,
              width: 240,
              borderRadius: 9999,
              backgroundColor: brand.lime,
            }}
          />
          <div
            style={{
              fontSize: 24,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: brand.petroleoSoft,
            }}
          >
            munay.app.br
          </div>
        </div>
      </div>
    ),
    size,
  );
}
