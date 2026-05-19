"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Globe, Check } from "lucide-react";
import {
  WIDGET_LOCALES,
  makeT,
  dateFnsLocale,
  normalizeLocale,
  type WidgetLocale,
  type Translator,
} from "@/lib/widget/i18n";
import type { Locale as DateFnsLocale } from "date-fns";

interface Ctx {
  locale: WidgetLocale;
  setLocale: (l: WidgetLocale) => void;
  t: Translator;
  df: DateFnsLocale;
}

const WidgetI18nContext = createContext<Ctx | null>(null);

export function WidgetI18nProvider({
  defaultLocale,
  children,
}: {
  defaultLocale: string;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState<WidgetLocale>(
    normalizeLocale(defaultLocale),
  );

  const value = useMemo<Ctx>(
    () => ({
      locale,
      setLocale,
      t: makeT(locale),
      df: dateFnsLocale(locale),
    }),
    [locale],
  );

  return (
    <WidgetI18nContext.Provider value={value}>
      {children}
    </WidgetI18nContext.Provider>
  );
}

export function useWidgetI18n(): Ctx {
  const ctx = useContext(WidgetI18nContext);
  if (!ctx) {
    throw new Error("useWidgetI18n must be used within WidgetI18nProvider");
  }
  return ctx;
}

/**
 * Wereldbol rechtsboven in de widget. Standaard NL; bezoeker kan wisselen.
 */
export function LanguageSwitcher({ accent }: { accent: string }) {
  const { locale, setLocale } = useWidgetI18n();
  const [open, setOpen] = useState(false);
  const current = WIDGET_LOCALES.find((l) => l.code === locale)!;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Globe className="size-3.5" />
        <span className="tabular-nums uppercase">{current.code}</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <ul
            role="listbox"
            className="absolute right-0 z-50 mt-1.5 max-h-72 w-44 overflow-auto rounded-xl border border-border bg-card p-1 shadow-lg"
          >
            {WIDGET_LOCALES.map((l) => {
              const active = l.code === locale;
              return (
                <li key={l.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setLocale(l.code);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted/60"
                    style={active ? { color: accent } : undefined}
                  >
                    <span className="text-base leading-none">{l.flag}</span>
                    <span className="flex-1 font-medium">{l.label}</span>
                    {active && <Check className="size-3.5" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
