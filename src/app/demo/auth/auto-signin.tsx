"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";

interface Props {
  token: string;
}

/**
 * Wisselt de korte-TTL demo-token uit voor een NextAuth sessie zodra de
 * page mount. Bij succes leidt NextAuth door naar /dashboard.
 *
 * Mount-once guard: React 19 Strict Mode mount components twee keer in
 * dev — zonder ref-flag zou signIn twee keer afgevuurd worden, wat
 * crap-error in logs geeft (token-replay).
 */
export function DemoAutoSignin({ token }: Props) {
  const fired = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    signIn("demo-handoff", {
      token,
      callbackUrl: "/dashboard",
      redirect: true,
    }).catch((err) => {
      setError(err instanceof Error ? err.message : "Inloggen mislukt");
    });
  }, [token]);

  if (error) {
    return (
      <p className="mt-4 max-w-xs text-xs text-destructive">
        Demo openen mislukt: {error}. Vernieuw de pagina om het opnieuw te
        proberen.
      </p>
    );
  }
  return null;
}
