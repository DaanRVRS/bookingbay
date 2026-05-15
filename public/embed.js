/**
 * BookingBay embed loader.
 *
 * Plak dit op je eigen website (één regel — alle styling beheer je in je
 * BookingBay-dashboard onder "Widget"):
 *
 *   <div data-bookingbay-book="pk_xxx"></div>
 *   <script src="https://bookingbay.nl/embed.js" defer></script>
 *
 * De widget haalt z'n design (accentkleur, breedte, hoekradius, schaduw)
 * server-side op via /api/embed/lookup en past het automatisch toe — dus
 * jouw wijzigingen in het dashboard zijn meteen overal live, zonder dat
 * iemand de embed-code hoeft aan te passen.
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

  function buildBookUrl(slug, accent) {
    var url = tenantBase(slug) + "/embed/book";
    if (accent) {
      var hex = String(accent).replace(/^#/, "");
      url += "?accent=" + encodeURIComponent(hex);
    }
    return url;
  }

  function applyHostStyles(host, design) {
    var w = String(design.width || "600").trim();
    host.style.maxWidth = /^\d+$/.test(w) ? w + "px" : w;
    if (!host.style.marginLeft) host.style.marginLeft = "auto";
    if (!host.style.marginRight) host.style.marginRight = "auto";

    var radius = Number(design.radius);
    if (!Number.isNaN(radius) && radius > 0) {
      host.style.borderRadius = radius + "px";
      host.style.overflow = "hidden";
    }
    if (design.shadow) {
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

  // Cache van resolved keys → { slug, design }, zodat herhaalde mounts in
  // dezelfde pageview niet opnieuw fetchen.
  var keyCache = {};

  function resolveKey(key) {
    if (keyCache[key]) return Promise.resolve(keyCache[key]);
    return fetch(BASE + "/api/embed/lookup?key=" + encodeURIComponent(key), {
      credentials: "omit",
    })
      .then(function (res) {
        if (!res.ok) throw new Error("lookup-" + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.slug) throw new Error("missing-slug");
        keyCache[key] = data;
        return data;
      });
  }

  function showError(host) {
    host.setAttribute("data-bookingbay-mounted", "1");
    host.innerHTML =
      '<div style="padding:16px;border:1px dashed #d4d4d4;border-radius:12px;font:13px system-ui;color:#737373;text-align:center">Boek-widget kon niet laden &mdash; controleer de embed-key.</div>';
  }

  function mount() {
    var nodes = document.querySelectorAll(
      "[data-bookingbay-book]:not([data-bookingbay-mounted])",
    );
    Array.prototype.forEach.call(nodes, function (host) {
      var value = host.getAttribute("data-bookingbay-book");
      if (!value) return;

      // Mark vroeg zodat de MutationObserver niet opnieuw triggert tijdens
      // de pending fetch.
      host.setAttribute("data-bookingbay-mounted", "1");

      resolveKey(value)
        .then(function (config) {
          host.style.position = host.style.position || "relative";
          applyHostStyles(host, {
            width: config.width,
            radius: config.radius,
            shadow: config.shadow,
          });
          var iframe = makeIframe(
            buildBookUrl(config.slug, config.accent),
            "BookingBay - boeken",
          );
          host.innerHTML = "";
          host.appendChild(iframe);
          iframes.push({ el: iframe });
        })
        .catch(function (err) {
          console.error("[BookingBay] key-lookup faalde:", err);
          showError(host);
        });
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
