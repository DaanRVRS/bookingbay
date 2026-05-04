/**
 * BookingBay embed loader.
 *
 * Add this snippet anywhere on a website:
 *   <div data-bookingbay="<your-slug>"></div>
 *   <script src="https://bookingbay.nl/embed.js" defer></script>
 *
 * The script replaces every <div data-bookingbay="..."> with an iframe
 * pointing at the tenant's /embed page, and listens for postMessage
 * height updates so the iframe auto-resizes to fit its content.
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

  function buildEmbedUrl(slug) {
    // For prod, tenants live on subdomains: <slug>.bookingbay.nl/embed
    // For dev / nip.io we keep the path-style /site/<slug>/embed.
    try {
      var u = new URL(BASE);
      var host = u.host;
      // Detect tenant routing — admin host has no leading subdomain pattern,
      // so we always embed via the slug-subdomain in prod.
      if (host.indexOf(".") !== -1) {
        // Replace first label with slug. e.g. bookingbay.nl -> slug.bookingbay.nl
        var parts = host.split(".");
        if (parts.length >= 2) {
          // For app.bookingbay.nl style: keep tail.
          if (parts[0] === "app" || parts[0] === "www") parts.shift();
          var subdomain = slug + "." + parts.join(".");
          return u.protocol + "//" + subdomain + "/embed";
        }
      }
      // Fallback: path-style
      return BASE + "/site/" + slug + "/embed";
    } catch (_) {
      return BASE + "/site/" + slug + "/embed";
    }
  }

  function mount() {
    var nodes = document.querySelectorAll("[data-bookingbay]:not([data-bookingbay-mounted])");
    Array.prototype.forEach.call(nodes, function (host) {
      var slug = host.getAttribute("data-bookingbay");
      if (!slug) return;

      host.setAttribute("data-bookingbay-mounted", "1");
      host.style.position = host.style.position || "relative";

      var iframe = document.createElement("iframe");
      iframe.src = buildEmbedUrl(slug);
      iframe.title = "BookingBay aanbod";
      iframe.loading = "lazy";
      iframe.setAttribute("scrolling", "no");
      iframe.style.width = "100%";
      iframe.style.border = "0";
      iframe.style.display = "block";
      iframe.style.minHeight = "420px";
      iframe.style.background = "transparent";
      iframe.allow = "clipboard-write";

      host.innerHTML = "";
      host.appendChild(iframe);

      iframes.push({ el: iframe, slug: slug });
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
