"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setActiveOrgAction } from "@/lib/orgs/actions";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { Role } from "@prisma/client";
import { toast } from "sonner";

interface Membership {
  id: string;
  role: Role;
  organization: { id: string; name: string; slug: string };
}

interface Props {
  active: { id: string; name: string; slug: string };
  activeRole: Role;
  memberships: Membership[];
}

export function OrgSwitcher({ active, activeRole, memberships }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onSwitch = (orgId: string) => {
    if (orgId === active.id) return;
    startTransition(async () => {
      const res = await setActiveOrgAction(orgId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="group flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary text-[12px] font-semibold uppercase">
          {active.name.slice(0, 2)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium leading-tight">{active.name}</span>
          <span className="block truncate text-[11px] leading-tight text-muted-foreground">
            {ROLE_LABELS[activeRole]}
          </span>
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <p className="px-2 pt-1 pb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Werkruimtes
        </p>
        {memberships.map((m) => {
          const isActive = m.organization.id === active.id;
          return (
            <DropdownMenuItem
              key={m.id}
              onClick={() => onSwitch(m.organization.id)}
              className="flex items-center gap-2"
            >
              <span className="grid size-6 place-items-center rounded-md bg-primary/10 text-primary text-[10px] font-semibold uppercase">
                {m.organization.name.slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm leading-tight">{m.organization.name}</span>
                <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                  {ROLE_LABELS[m.role]}
                </span>
              </span>
              {isActive && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
