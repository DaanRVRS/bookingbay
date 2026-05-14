/**
 * BookingBay embed loader.
 *
 * Three widget variants — each replaces the host element with an iframe.
 *
 * 1) Catalog (full aanbod):
 *    <div data-bookingbay="<slug>"></div>
 *
 * 2) Booking — algemeen (item-picker + datum-formulier):
 *    <div data-bookingbay-book="<slug>"></div>
 *
 * 3) Booking — per item (alleen het datum-formulier voor één item):
 *    <div data-bookingbay-item="<item-id>" data-bookingbay-slug="<slug>"></div>
 *
 * One script tag covers all three:
 *   <script src="https://bookingbay.nl/embed.js" defer></script>
 *
 * The iframe auto-resizes via postMessage("bookingbay:height") from the
 * embedded page.
 */
(function () {
  if (typeof window === "undefined") return;

  // Resolve the BookingBay base URL from the script's own src so embeds work
  // identically on app.bookingbay.nl, nip.io domains, and custom hosts.
  function resolveBase() {
    var current =
      document.currentScript && document.currentScript.src
        ? document.currentScript.src
        : null;
    if (!current) {
      var scripts = document.getElementsByTagName("script");
      for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src && scripts[i].src.indexOf("/embed.js") !== -1) {
          current = scripts[i].src;
          break;
        }
      }
    }
    if (!current) return null;
    try {
      var u = new URL(current);
      return u.protocol + "//" + u.host;
    } catch (_) {
      return null;
    }
  }

  var BASE = resolveBase();
  if (!BASE) {
    console.error("[BookingBay] could not determine base URL");
    return;
  }

  var iframes = []; // { el, slug }

  function tenantBase(slug) {
    // Subdomain in prod (slug.bookingbay.nl); path-style fallback for dev.
    try {
      var u = new URL(BASE);
      var host = u.host;
      if (host.indexOf(".") !== -1) {
        var parts = host.split(".");
        if (parts.length >= 2) {
          if (parts[0] === "app" || parts[0] === "www") parts.shift();
          var subdomain = slug + "." + parts.join(".");
          return u.protocol + "//" + subdomain;
        }
      }
      return BASE + "/site/" + slug;
    } catch (_) {
      return BASE + "/site/" + slug;
    }
  }

  function buildCatalogUrl(slug) {
    return tenantBase(slug) + "/embed";
  }
  function buildBookGeneralUrl(slug) {
    return tenantBase(slug) + "/embed/book";
  }
  function buildBookItemUrl(slug, itemId) {
    return tenantBase(slug) + "/embed/book/" + encodeURIComponent(itemId);
  }

  function makeIframe(src, title) {
    var iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = title;
    iframe.loading = "lazy";
    iframe.setAttribute("scrolling", "no");
    iframe.style.width = "100%";
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.style.minHeight = "420px";
    iframe.style.background = "transparent";
    iframe.allow = "clipboard-write";
    return iframe;
  }

  function mountInto(host, src, title) {
    host.setAttribute("data-bookingbay-mounted", "1");
    host.style.position = host.style.position || "relative";
    var iframe = makeIframe(src, title);
    host.innerHTML = "";
    host.appendChild(iframe);
    iframes.push({ el: iframe });
  }

  function mount() {
    // 1) Catalog widget — data-bookingbay="slug"
    var catalogNodes = document.querySelectorAll(
      "[data-bookingbay]:not([data-bookingbay-mounted])",
    );
    Array.prototype.forEach.call(catalogNodes, function (host) {
      var slug = host.getAttribute("data-bookingbay");
      if (!slug) return;
      mountInto(host, buildCatalogUrl(slug), "BookingBay aanbod");
    });

    // 2) Algemene boek-widget — data-bookingbay-book="slug"
    var bookNodes = document.querySelectorAll(
      "[data-bookingbay-book]:not([data-bookingbay-mounted])",
    );
    Array.prototype.forEach.call(bookNodes, function (host) {
      var slug = host.getAttribute("data-bookingbay-book");
      if (!slug) return;
      mountInto(host, buildBookGeneralUrl(slug), "BookingBay - boeken");
    });

    // 3) Per-item boek-widget — data-bookingbay-item + data-bookingbay-slug
    var itemNodes = document.querySelectorAll(
      "[data-bookingbay-item]:not([data-bookingbay-mounted])",
    );
    Array.prototype.forEach.call(itemNodes, function (host) {
      var itemId = host.getAttribute("data-bookingbay-item");
      var slug = host.getAttribute("data-bookingbay-slug");
      if (!itemId || !slug) return;
      mountInto(host, buildBookItemUrl(slug, itemId), "BookingBay - boeken");
    });
  }

  window.addEventListener("message", function (e) {
    if (!e.data || typeof e.data !== "object") return;
    if (e.data.type !== "bookingbay:height") return;
    var h = parseInt(e.data.height, 10);
    if (!h || h < 200 || h > 20000) return;
    iframes.forEach(function (entry) {
      if (entry.el.contentWindow !== e.source) return;
      entry.el.style.height = h + "px";
    });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  // Re-mount when the host page injects new BookingBay containers later
  // (SPAs, htmx swaps, etc.)
  if (typeof MutationObserver !== "undefined") {
    var observer = new MutationObserver(function () {
      mount();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
