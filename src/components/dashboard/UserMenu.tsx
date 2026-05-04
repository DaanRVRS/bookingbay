"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/lib/auth/actions";

interface Props {
  user: {
    name: string | null;
    email: string;
    image: string | null;
  };
}

export function UserMenu({ user }: Props) {
  const router = useRouter();
  const initials = (user.name ?? user.email)
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary text-sm font-semibold transition-colors hover:bg-primary/20">
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-medium">{user.name ?? "Gebruiker"}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/dashboard/settings/profile")}>
          <User className="size-4" />
          Profiel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
          <Settings className="size-4" />
          Instellingen
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <button
            type="submit"
            className="hover:bg-accent focus-visible:bg-accent relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none"
          >
            <LogOut className="size-4" />
            Uitloggen
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
