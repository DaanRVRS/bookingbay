"use client";

import { usePathname } from "next/navigation";

/**
 * "Direct naar inhoud"-link voor toetsenbord- en screenreadergebruikers
 * (WCAG 2.4.1). Visueel verborgen tot 'ie focus krijgt. Springt naar het
 * eerste <main>-element op de pagina — elke layout heeft er precies één —
 * zodat we niet in tientallen pagina's een id hoeven te zetten.
 *
 * In de embed-iframes (widget op externe sites) laten we 'm weg: daar is
 * de hostpagina verantwoordelijk voor de paginastructuur.
 */
export function SkipLink() {
  const pathname = usePathname();
  if (pathname.includes("/embed")) return null;

  return (
    <a
      href="#main"
      onClick={(e) => {
        const main = document.querySelector("main");
        if (!main) return;
        e.preventDefault();
        if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
        main.focus();
        main.scrollIntoView({ block: "start" });
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Direct naar inhoud
    </a>
  );
}
