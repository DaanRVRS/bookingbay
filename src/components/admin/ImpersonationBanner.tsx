import { db } from "@/lib/db";
import { getImpersonation } from "@/lib/admin/impersonate";
import { StopImpersonationButton } from "./StopImpersonationButton";

/**
 * Renders a sticky orange banner at the very top of any layout that loads
 * it whenever an admin is impersonating another user. Returns null when no
 * impersonation is active, so it's safe to drop into shared layouts.
 */
export async function ImpersonationBanner() {
  const state = await getImpersonation();
  if (!state) return null;

  const [target, real] = await Promise.all([
    db.user.findUnique({
      where: { id: state.targetUserId },
      select: { name: true, email: true },
    }),
    db.user.findUnique({
      where: { id: state.realUserId },
      select: { name: true, email: true },
    }),
  ]);
  if (!target || !real) return null;

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center gap-x-3 gap-y-1 bg-amber-500 px-4 py-1.5 text-[12px] font-medium text-amber-950 shadow-sm">
      <span className="font-semibold">Inloggen als:</span>
      <span className="rounded bg-white/40 px-1.5 py-0.5 font-mono">
        {target.name ?? target.email}
      </span>
      <span className="text-amber-950/70">
        (jij bent nog steeds {real.name ?? real.email})
      </span>
      <span className="ml-auto">
        <StopImpersonationButton />
      </span>
    </div>
  );
}
