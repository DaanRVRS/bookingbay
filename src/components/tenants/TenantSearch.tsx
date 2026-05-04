"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

interface Props {
  basePath: string;
  accent: string;
  initialQuery: string;
}

export function TenantSearch({ basePath, accent, initialQuery }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(initialQuery);

  // Debounce URL updates
  useEffect(() => {
    if (value === initialQuery) return;
    const t = setTimeout(() => {
      const sp = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed) sp.set("q", trimmed);
      else sp.delete("q");
      startTransition(() => {
        router.replace(`${basePath}?${sp.toString()}`, { scroll: false });
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Zoek in het aanbod…"
        aria-label="Zoek in het aanbod"
        className="block h-11 w-full rounded-lg border border-border bg-card pr-10 pl-10 text-sm shadow-sm outline-none focus:border-[color:var(--tenant-accent)] focus:ring-3 focus:ring-[color:var(--tenant-accent)]/20"
        style={{ ["--tenant-accent" as string]: accent }}
      />
      {pending ? (
        <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Wissen"
          className="absolute top-1/2 right-3 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
