"use client";

import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { CarFront, LogOut, Menu, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useMe } from "@/hooks/useMe";
import { api } from "@/lib/api";
import { Badge, Spinner } from "./ui";

const NAV_ITEMS = [
  { href: "/usages", label: "Utilizações" },
  { href: "/cars", label: "Automóveis" },
  { href: "/drivers", label: "Motoristas" },
  { href: "/admin/users", label: "Usuários", adminOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAdmin, isLoading } = useMe();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    queryClient.clear();
    router.replace("/login");
    router.refresh();
  }

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const navLink = (item: (typeof NAV_ITEMS)[number]) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setMenuOpen(false)}
      className={clsx(
        "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        pathname.startsWith(item.href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      {item.label}
    </Link>
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Link href="/usages" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <CarFront className="size-5" aria-hidden />
            </span>
            TTP Frota
          </Link>

          <nav className="hidden gap-1 md:flex">{items.map(navLink)}</nav>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            {user && (
              <Link href="/profile" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
                <UserRound className="size-4" aria-hidden />
                {user.name}
                {isAdmin && <Badge tone="brand">Admin</Badge>}
              </Link>
            )}
            <button onClick={logout} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
              <LogOut className="size-4" aria-hidden />
              Sair
            </button>
          </div>

          <button className="ml-auto rounded-lg p-2 text-slate-600 md:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label="Menu">
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 md:hidden">
            {items.map(navLink)}
            {navLink({ href: "/profile", label: "Meu perfil" })}
            <button onClick={logout} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100">
              Sair
            </button>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{isLoading ? <Spinner /> : children}</main>
    </div>
  );
}
