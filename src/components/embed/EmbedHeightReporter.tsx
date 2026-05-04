"use client";

import { useEffect } from "react";

/**
 * Reports the document's scroll height to the parent window via postMessage,
 * so the host-side embed.js script can resize the iframe to fit the content
 * (no scrollbars, no fixed-height awkwardness).
 *
 * Handshake:
 *   { type: "bookingbay:height", height: <px>, id?: <embed-id> }
 *   { type: "bookingbay:nav",    href: <pathname> }
 */
export function EmbedHeightReporter() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.parent === window) return; // not in iframe

    const send = () => {
      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body?.scrollHeight ?? 0,
      );
      window.parent.postMessage({ type: "bookingbay:height", height }, "*");
    };

    send();

    const ro = new ResizeObserver(() => send());
    ro.observe(document.documentElement);

    // Defensive: also re-send shortly after first paint in case fonts/images shift layout
    const t1 = setTimeout(send, 200);
    const t2 = setTimeout(send, 800);

    return () => {
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return null;
}
