"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

/**
 * Zoekbare single-select combobox. Typen filtert de lijst client-side —
 * geschikt voor lange lijsten (honderden klanten) waar een platte
 * <Select> onwerkbaar wordt. Sluit qua stijl aan op components/ui/select.
 *
 * Base UI gebruikt {value,label}-objecten: label voor weergave, value voor
 * de form-waarde. We controllen op `value` (de id) en mappen heen-en-weer.
 */
export function Combobox({
  items,
  value,
  onValueChange,
  placeholder = "Selecteer…",
  emptyText = "Geen resultaten",
  id,
  invalid,
  disabled,
  className,
}: {
  items: ComboboxOption[];
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  emptyText?: string;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const selected = React.useMemo(
    () => items.find((i) => i.value === value) ?? null,
    [items, value],
  );

  return (
    <ComboboxPrimitive.Root
      items={items}
      value={selected}
      onValueChange={(v: ComboboxOption | null) =>
        onValueChange(v ? v.value : null)
      }
      disabled={disabled}
    >
      <div className={cn("relative", className)}>
        <ComboboxPrimitive.Input
          id={id}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          className={cn(
            "flex h-9 w-full items-center rounded-lg border border-input bg-transparent py-2 pr-9 pl-3 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30",
          )}
        />
        <ComboboxPrimitive.Trigger
          aria-label="Toon opties"
          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground outline-none disabled:opacity-50"
        >
          <ComboboxPrimitive.Icon
            render={<ChevronDownIcon className="size-4" />}
          />
        </ComboboxPrimitive.Trigger>
      </div>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          sideOffset={4}
          align="start"
          className="isolate z-50"
        >
          <ComboboxPrimitive.Popup
            className={cn(
              "max-h-[min(var(--available-height),18rem)] w-(--anchor-width) origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <ComboboxPrimitive.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List>
              {(item: ComboboxOption) => (
                <ComboboxPrimitive.Item
                  key={item.value}
                  value={item}
                  className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <span className="flex-1 truncate">{item.label}</span>
                  <ComboboxPrimitive.ItemIndicator className="absolute right-2 flex items-center">
                    <CheckIcon className="size-4" />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
