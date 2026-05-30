"use client";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  }

  return (
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
      <Globe className="w-4 h-4 text-slate-400 ml-1" />
      {(["en", "fr"] as const).map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
            locale === l
              ? "bg-white dark:bg-slate-600 shadow-sm text-brand-600 dark:text-brand-400"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
