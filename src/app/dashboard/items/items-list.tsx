"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Package, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { unitLabel } from "@/lib/bookings/price";

interface Item {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: string;
  pricePerUnit: string | null;
  bookingIntervalMinutes: number;
  quantity: number;
  isActive: boolean;
  isAddon: boolean;
  addonPrice: string | null;
}

export function ItemsList({
  items,
  categories,
  currentCategory,
  currentSearch,
  currentStatus,
}: {
  items: Item[];
  categories: { id: string; name: string }[];
  currentCategory?: string;
  currentSearch?: string;
  currentStatus?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (key: string, value: string | null | undefined) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (!value || value === "__all__") sp.delete(key);
    else sp.set(key, value);
    startTransition(() => {
      router.replace(`/dashboard/items?${sp.toString()}`);
    });
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Zoek op naam of beschrijving"
            defaultValue={currentSearch ?? ""}
            onChange={(e) => update("q", e.target.value || undefined)}
            className="pl-9"
          />
        </div>
        <Select
          items={[
            { value: "__all__", label: "Alle categorieën" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
          value={currentCategory ?? "__all__"}
          onValueChange={(v) => update("cat", v)}
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Alle categorieën" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alle categorieën</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: "__all__", label: "Alle" },
            { value: "active", label: "Actief" },
            { value: "inactive", label: "Inactief" },
          ]}
          value={currentStatus ?? "__all__"}
          onValueChange={(v) => update("status", v)}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alle</SelectItem>
            <SelectItem value="active">Actief</SelectItem>
            <SelectItem value="inactive">Inactief</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Geen items gevonden met deze filters.
        </p>
      ) : (
        <div className={`mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${pending ? "opacity-60" : ""}`}>
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/items/${item.id}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-sm"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="size-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground">
                    <ImageIcon className="size-8 opacity-40" />
                  </div>
                )}
                {/* Status + type — in één oogopslag zichtbaar op de foto */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  {item.isAddon && (
                    <span className="inline-flex items-center rounded-full bg-[oklch(0.55_0.13_255)]/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur">
                      Add-on
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm backdrop-blur ${
                      item.isActive
                        ? "bg-[oklch(0.78_0.13_145)]/90 text-[oklch(0.25_0.1_150)]"
                        : "bg-muted/95 text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        item.isActive
                          ? "bg-[oklch(0.42_0.13_150)]"
                          : "bg-muted-foreground/60"
                      }`}
                    />
                    {item.isActive ? "Actief" : "Inactief"}
                  </span>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold">{item.name}</h3>
                  {item.quantity > 1 && (
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {item.quantity}×
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  <Package className="mr-1 inline size-3" />
                  {item.category}
                </p>
                <div className="mt-auto flex items-baseline gap-3 text-xs">
                  {item.isAddon && item.addonPrice && (
                    <span>
                      <span className="font-semibold text-foreground tabular-nums">
                        € {Number(item.addonPrice).toFixed(2)}
                      </span>{" "}
                      <span className="text-muted-foreground">/ stuk</span>
                    </span>
                  )}
                  {!item.isAddon && item.pricePerUnit && (
                    <span>
                      <span className="font-semibold text-foreground tabular-nums">
                        € {Number(item.pricePerUnit).toFixed(2)}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        / {unitLabel(item.bookingIntervalMinutes)}
                      </span>
                    </span>
                  )}
                  {((item.isAddon && !item.addonPrice) ||
                    (!item.isAddon && !item.pricePerUnit)) && (
                    <span className="text-muted-foreground">Geen prijs ingesteld</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
