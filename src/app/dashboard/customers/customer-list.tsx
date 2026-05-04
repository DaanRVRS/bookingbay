"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Pencil, Search, Trash2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomerDialog } from "./customer-dialog";
import { deleteCustomerAction } from "@/lib/customers/actions";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  bookingCount: number;
}

export function CustomerList({
  customers,
  currentSearch,
}: {
  customers: Customer[];
  currentSearch?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const onSearch = (value: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (!value) sp.delete("q");
    else sp.set("q", value);
    startTransition(() => router.replace(`/dashboard/customers?${sp.toString()}`));
  };

  return (
    <>
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Zoek op naam, e-mail of telefoon"
          defaultValue={currentSearch ?? ""}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className={`mt-5 overflow-hidden rounded-xl border border-border bg-card ${pending ? "opacity-60" : ""}`}>
        {customers.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            Geen klanten gevonden.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {customers.map((c) => (
              <CustomerRow key={c.id} customer={c} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function CustomerRow({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const initials = customer.name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const onConfirmDelete = () => {
    startTransition(async () => {
      const res = await deleteCustomerAction(customer.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Klant verwijderd");
      setDeleteOpen(false);
      router.refresh();
    });
  };

  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{customer.name}</p>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {customer.email && (
            <span className="flex items-center gap-1">
              <Mail className="size-3" />
              {customer.email}
            </span>
          )}
          {customer.phone && (
            <span className="flex items-center gap-1">
              <Phone className="size-3" />
              {customer.phone}
            </span>
          )}
          {!customer.email && !customer.phone && <span>Geen contact-info</span>}
        </div>
      </div>
      <span className="hidden text-xs text-muted-foreground sm:inline">
        {customer.bookingCount} {customer.bookingCount === 1 ? "boeking" : "boekingen"}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent">
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Bewerken
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-destructive">
            <Trash2 className="size-4" />
            Verwijderen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CustomerDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        existing={{
          id: customer.id,
          name: customer.name,
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          notes: customer.notes ?? "",
        }}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Klant verwijderen?</DialogTitle>
            <DialogDescription>
              "{customer.name}" wordt definitief verwijderd. Niet mogelijk als er nog boekingen aan
              gekoppeld zijn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={onConfirmDelete} disabled={pending}>
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
