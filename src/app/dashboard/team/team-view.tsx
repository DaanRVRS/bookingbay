"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, MoreHorizontal, Trash2, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { ROLE_LABELS, can } from "@/lib/auth/permissions";
import {
  cancelInviteAction,
  removeMemberAction,
  updateRoleAction,
} from "@/lib/team/actions";
import { ROLES } from "@/lib/team/schemas";
import type { Role } from "@prisma/client";

interface Member {
  membershipId: string;
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  emailVerified: boolean;
  joinedAt: string;
}

interface Invite {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  invitedBy: string;
}

interface Props {
  currentUserId: string;
  currentRole: Role;
  members: Member[];
  invites: Invite[];
}

export function TeamView({ currentUserId, currentRole, members, invites }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">
            Leden{" "}
            <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {members.length}
            </span>
          </h2>
        </div>
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <MemberRow
              key={m.membershipId}
              member={m}
              currentUserId={currentUserId}
              currentRole={currentRole}
            />
          ))}
        </ul>
      </section>

      {invites.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">
              Open uitnodigingen{" "}
              <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {invites.length}
              </span>
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {invites.map((inv) => (
              <InviteRow key={inv.id} invite={inv} canCancel={can(currentRole, "members:invite")} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function MemberRow({
  member,
  currentUserId,
  currentRole,
}: {
  member: Member;
  currentUserId: string;
  currentRole: Role;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removeOpen, setRemoveOpen] = useState(false);

  const isSelf = member.userId === currentUserId;
  const canManage = can(currentRole, "members:manage");
  const canManageThis = canManage && (member.role !== "OWNER" || currentRole === "OWNER");

  const initials = (member.name ?? member.email)
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const onChangeRole = (role: Role) => {
    if (role === member.role) return;
    startTransition(async () => {
      const res = await updateRoleAction({ membershipId: member.membershipId, role });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Rol bijgewerkt");
      router.refresh();
    });
  };

  const onRemove = () => {
    startTransition(async () => {
      const res = await removeMemberAction({ membershipId: member.membershipId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Lid verwijderd");
      setRemoveOpen(false);
      router.refresh();
    });
  };

  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">
            {member.name ?? member.email.split("@")[0]}
            {isSelf && <span className="ml-1.5 text-[11px] text-muted-foreground">(jij)</span>}
          </p>
          {!member.emailVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.85_0.13_85)]/20 px-2 py-0.5 text-[10px] font-medium text-[oklch(0.45_0.13_70)]">
              E-mail niet geverifieerd
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
      </div>

      <span className="hidden text-xs text-muted-foreground sm:block">
        {ROLE_LABELS[member.role]}
      </span>

      {canManageThis ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={pending}
            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <p className="px-2 pt-1 pb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Rol wijzigen
            </p>
            {ROLES.map((r) => {
              if (r === "OWNER" && currentRole !== "OWNER") return null;
              return (
                <DropdownMenuItem
                  key={r}
                  onClick={() => onChangeRole(r)}
                  className={r === member.role ? "bg-accent" : ""}
                >
                  {ROLE_LABELS[r]}
                  {r === member.role && <span className="ml-auto text-[10px]">huidig</span>}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setRemoveOpen(true)}
              className="text-destructive"
            >
              <Trash2 className="size-4" />
              Verwijderen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground sm:hidden">
          {ROLE_LABELS[member.role]}
        </span>
      )}

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lid verwijderen?</DialogTitle>
            <DialogDescription>
              {member.name ?? member.email} verliest direct toegang tot deze werkruimte.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={onRemove} disabled={pending}>
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

function InviteRow({ invite, canCancel }: { invite: Invite; canCancel: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onCancel = () => {
    startTransition(async () => {
      const res = await cancelInviteAction(invite.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Uitnodiging ingetrokken");
      router.refresh();
    });
  };

  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
        <Clock className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{invite.email}</p>
        <p className="truncate text-xs text-muted-foreground">
          Uitgenodigd door {invite.invitedBy} · vervalt{" "}
          {format(parseISO(invite.expiresAt), "d MMM", { locale: nl })}
        </p>
      </div>
      <span className="hidden text-xs text-muted-foreground sm:block">
        {ROLE_LABELS[invite.role]}
      </span>
      {canCancel && (
        <button
          onClick={onCancel}
          disabled={pending}
          className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-50"
          title="Uitnodiging intrekken"
        >
          <X className="size-4" />
        </button>
      )}
    </li>
  );
}
