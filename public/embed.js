/**
 * BookingBay embed loader.
 *
 * Plak dit op je eigen website:
 *   <div data-bookingbay-book="<slug>"></div>
 *   <script src="https://bookingbay.nl/embed.js" defer></script>
 *
 * Optionele customization-attributen op het host-element:
 *   data-bookingbay-accent="#ff6b3d"   -> overschrijf accentkleur
 *   data-bookingbay-width="600"        -> max breedte in px (of "100%")
 *   data-bookingbay-radius="16"        -> hoekradius in px
 *   data-bookingbay-shadow="1"         -> 1 of "true" voor schaduw, anders geen
 *
 * De iframe groeit automatisch mee via postMessage("bookingbay:height").
 */
(function () {
  if (typeof window === "undefined") return;

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

  var iframes = []; // { el }

  function tenantBase(slug) {
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

  function isTruthy(v) {
    return v === "1" || v === "true" || v === "yes";
  }

  function buildBookUrl(slug, accent) {
    var url = tenantBase(slug) + "/embed/book";
    if (accent) {
      var hex = accent.replace(/^#/, "");
      url += "?accent=" + encodeURIComponent(hex);
    }
    return url;
  }

  function applyHostStyles(host, opts) {
    if (opts.width) {
      var w = String(opts.width).trim();
      host.style.maxWidth = /^\d+$/.test(w) ? w + "px" : w;
      if (!host.style.marginLeft) host.style.marginLeft = "auto";
      if (!host.style.marginRight) host.style.marginRight = "auto";
    }
    var radius = opts.radius != null ? Number(opts.radius) : null;
    if (radius != null && !Number.isNaN(radius)) {
      host.style.borderRadius = radius + "px";
      host.style.overflow = "hidden";
    }
    if (opts.shadow) {
      host.style.boxShadow =
        "0 4px 20px -4px rgba(0,0,0,0.10), 0 2px 6px -2px rgba(0,0,0,0.06)";
    }
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

  function mount() {
    var nodes = document.querySelectorAll(
      "[data-bookingbay-book]:not([data-bookingbay-mounted])",
    );
    Array.prototype.forEach.call(nodes, function (host) {
      var slug = host.getAttribute("data-bookingbay-book");
      if (!slug) return;

      var accent = host.getAttribute("data-bookingbay-accent");
      var width = host.getAttribute("data-bookingbay-width");
      var radius = host.getAttribute("data-bookingbay-radius");
      var shadow = isTruthy(host.getAttribute("data-bookingbay-shadow"));

      host.setAttribute("data-bookingbay-mounted", "1");
      host.style.position = host.style.position || "relative";
      applyHostStyles(host, { width: width, radius: radius, shadow: shadow });

      var iframe = makeIframe(buildBookUrl(slug, accent), "BookingBay - boeken");
      host.innerHTML = "";
      host.appendChild(iframe);
      iframes.push({ el: iframe });
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

  if (typeof MutationObserver !== "undefined") {
    var observer = new MutationObserver(function () {
      mount();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
