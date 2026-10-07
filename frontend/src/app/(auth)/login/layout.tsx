import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse o controle de utilização dos automóveis da empresa.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
