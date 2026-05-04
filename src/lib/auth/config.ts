import type { NextAuthConfig } from "next-auth";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding"];
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

export const authConfig = {
  pages: {
    signIn: "/login",
    verifyRequest: "/check-email",
    error: "/login",
  },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
      const isAuthPage = AUTH_PAGES.includes(path);

      if (isProtected && !isLoggedIn) {
        const url = new URL("/login", request.url);
        if (path !== "/dashboard") url.searchParams.set("next", path);
        return Response.redirect(url);
      }
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", request.url));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
