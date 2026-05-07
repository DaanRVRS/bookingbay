"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
}

export function TenantMobileNav({
  items,
  contactHref,
  accent,
}: {
  items: NavItem[];
  contactHref: string;
  accent: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu openen"
        className="grid size-9 place-items-center rounded-md border border-border text-foreground"
      >
        <Menu className="size-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <span className="text-sm font-semibold">Menu</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Menu sluiten"
              className="grid size-9 place-items-center rounded-md border border-border"
            >
              <X className="size-4" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-base font-medium text-foreground hover:bg-accent"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={contactHref}
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex h-12 items-center justify-center rounded-lg px-5 text-base font-medium text-white shadow-sm"
              style={{ background: accent }}
            >
              Contact
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
