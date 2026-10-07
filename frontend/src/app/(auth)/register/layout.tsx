import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie sua conta para controlar a utilização dos automóveis da empresa.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
