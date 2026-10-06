import { CarFront } from "lucide-react";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <CarFront className="size-6" aria-hidden />
          </div>
          <p className="text-lg font-semibold text-slate-900">TTP Frota</p>
        </div>
        {/* As páginas leem a query string (useSearchParams), o que exige um Suspense boundary. */}
        <Suspense fallback={<Spinner />}>{children}</Suspense>
      </div>
    </main>
  );
}
