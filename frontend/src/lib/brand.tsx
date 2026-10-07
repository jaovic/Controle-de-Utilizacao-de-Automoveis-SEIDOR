/** Dados da marca usados nos metadados, no manifest e nas imagens geradas (ícone e Open Graph). */
export const SITE_NAME = "TTP Frota";
export const SITE_TITLE = "TTP Frota · Controle de utilização de automóveis";
export const SITE_DESCRIPTION =
  "Controle a frota da empresa: cadastro de automóveis e motoristas e registro de quem está usando cada carro, " +
  "com login seguro e perfis de acesso.";
export const BRAND_COLOR = "#0e7490";

/** URL pública do site: definida pela Vercel no build, ou SITE_URL, ou localhost. */
export const SITE_URL = process.env.SITE_URL
  ? process.env.SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

/** Desenho do carro (mesmo ícone da interface), para as imagens geradas com next/og. */
export function CarGlyph({ size, color = "#ffffff" }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8" />
      <path d="M7 14h.01" />
      <path d="M17 14h.01" />
      <rect width="18" height="8" x="3" y="10" rx="2" />
      <path d="M5 18v2" />
      <path d="M19 18v2" />
    </svg>
  );
}
