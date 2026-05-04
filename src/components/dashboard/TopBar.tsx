"use client";

import { useState } from "react";
import { Menu, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Logo } from "@/components/marketing/Logo";

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
        <button
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="grid size-9 shrink-0 place-items-center rounded-md border border-border md:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>

        <div className="hidden md:block">
          <Logo />
        </div>

        <div className="md:hidden">
          <Logo showWordmark={false} />
        </div>

        <div className="ml-2 hidden flex-1 md:block">{children}</div>

        <div className="ml-auto flex items-center gap-2">
          <button
            aria-label="Zoeken"
            className="hidden size-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent sm:flex"
          >
            <Search className="size-4" />
          </button>
          {rightSlot}
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            <div
              className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-background shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <Logo />
                <button
                  aria-label="Sluit menu"
                  onClick={() => setOpen(false)}
                  className="grid size-9 place-items-center rounded-md border border-border"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="border-b border-border px-3 py-3">{orgSwitcherSlot}</div>
              <div className="flex-1 overflow-y-auto" onClick={() => setOpen(false)}>
                {sidebarContent}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
