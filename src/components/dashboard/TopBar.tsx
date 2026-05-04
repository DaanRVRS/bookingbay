"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Logo } from "@/components/marketing/Logo";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function TopBar({
  children,
  sidebarContent,
  rightSlot,
  orgSwitcherSlot,
}: {
  children?: React.ReactNode;
  sidebarContent: React.ReactNode;
  rightSlot: React.ReactNode;
  orgSwitcherSlot: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Menu openen"
            className="grid size-9 shrink-0 place-items-center rounded-md border border-border md:hidden"
          >
            <Menu className="size-4" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 sm:max-w-xs">
            <div className="flex h-14 items-center border-b border-border px-4">
              <Logo />
              <SheetTitle className="sr-only">Navigatie</SheetTitle>
            </div>
            <div className="border-b border-border px-3 py-3">{orgSwitcherSlot}</div>
            <div
              className="flex-1 overflow-y-auto"
              onClick={() => setOpen(false)}
            >
              {sidebarContent}
            </div>
          </SheetContent>
        </Sheet>

        <div className="hidden md:block">
          <Logo />
        </div>

        <div className="md:hidden">
          <Logo showWordmark={false} />
        </div>

        <div className="ml-2 hidden flex-1 md:block">{children}</div>

        <div className="ml-auto flex items-center gap-2">{rightSlot}</div>
      </div>
    </header>
  );
}
