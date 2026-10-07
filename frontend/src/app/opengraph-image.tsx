import { ImageResponse } from "next/og";
import { BRAND_COLOR, CarGlyph, SITE_NAME } from "@/lib/brand";

export const alt = "TTP Frota: controle de utilização de automóveis";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem exibida ao compartilhar o link (WhatsApp, LinkedIn, Slack etc.). */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #164e63 100%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <div style={{ width: 120, height: 120, borderRadius: 28, background: BRAND_COLOR, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CarGlyph size={76} />
          </div>
          <div style={{ fontSize: 64, fontWeight: 700 }}>{SITE_NAME}</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 44, fontWeight: 600, lineHeight: 1.2 }}>Controle de utilização dos automóveis da empresa</div>
        <div style={{ marginTop: 24, fontSize: 28, color: "#a5f3fc" }}>Automóveis · Motoristas · Utilizações · Login com verificação por SMS</div>
      </div>
    ),
    size,
  );
}
