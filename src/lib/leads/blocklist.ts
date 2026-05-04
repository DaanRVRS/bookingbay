import "server-only";
import { db } from "@/lib/db";

/**
 * Returns true if the email matches a blocklist entry for the org.
 * A pattern is either a full lowercased address ("noreply@example.com")
 * or a domain prefix ("@example.com").
 */
export async function isEmailBlocked(
  organizationId: string,
  email: string,
): Promise<boolean> {
  const lower = email.toLowerCase().trim();
  if (!lower) return true;
  const at = lower.lastIndexOf("@");
  if (at < 0) return true;
  const domainPattern = lower.slice(at); // includes the @

  const hit = await db.leadBlock.findFirst({
    where: {
      organizationId,
      OR: [{ pattern: lower }, { pattern: domainPattern }],
    },
    select: { id: true },
  });
  return !!hit;
}
