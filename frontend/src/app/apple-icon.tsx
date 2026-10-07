import { ImageResponse } from "next/og";
import { BRAND_COLOR, CarGlyph } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícone da tela inicial do iOS (o iOS aplica os cantos arredondados). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND_COLOR }}>
        <CarGlyph size={112} />
      </div>
    ),
    size,
  );
}
