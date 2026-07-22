(function () {
  "use strict";

  var DATA_URL = "/data/entities.json";
  var GA_ID = "G-SJEL7S80GE";

  var LOCATION_ICON =
    '<svg class="experience-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />' +
    '<circle cx="12" cy="10" r="3" />' +
    "</svg>";

  var NAVBAR_HTML =
    '<nav class="ondc-navbar" aria-label="ONDC">' +
    '<div class="ondc-navbar-inner">' +
    '<a class="ondc-logo" href="https://ondc.org" target="_blank" rel="noopener noreferrer" ' +
    'aria-label="ONDC – Open Network for Digital Commerce">' +
    '<img src="/public/images/ondc-logo.svg" alt="ONDC" class="ondc-logo-img" height="34" />' +
    "</a>" +
    '<span class="ondc-navbar-product">Discover Buses</span>' +
    "</div>" +
    "</nav>";

  var FOOTER_HTML =
    '<footer class="app-footer">' +
    '<div class="app-footer-inner">' +
    '<span class="app-footer-brand">Powered by ONDC Network</span>' +
    "</div>" +
    "</footer>";

  var params = new URLSearchParams(location.search);
  var busNumber = (params.get("vid") || params.get("bus") || "").trim();

  // Kick off the data fetch as soon as this (deferred) script runs, instead
  // of waiting for a DOMContentLoaded handler to fire and start it later.
  var dataPromise = fetch(DATA_URL).then(function (res) {
    if (!res.ok) throw new Error("Failed to load " + DATA_URL);
    return res.json();
  });

  function getOS() {
    var ua = navigator.userAgent || navigator.vendor || window.opera || "";
    if (/android/i.test(ua)) return "Android";
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return "iOS";
    return "Other";
  }

  var os = getOS();

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("set", "user_properties", { platform_os: os });
  // Attach bus_number to the automatic page_view when ?vid= / ?bus= is present
  // (e.g. /odisha/osrtc/?vid=OD07AU3015). Also sent on buyer_app_click /
  // platform_detected after the entity page finishes loading.
  gtag("config", GA_ID, busNumber ? { bus_number: busNumber } : {});

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  function findBySlug(list, slug) {
    return (list || []).find(function (item) {
      return item.slug === slug;
    });
  }

  // Ensure the page URL carries ?vid= when we know a bus number (from the QR
  // or from the operator's defaultVid), without triggering a reload.
  function ensureVidInUrl(vid) {
    if (!vid) return;
    var current = new URLSearchParams(location.search);
    if ((current.get("vid") || current.get("bus") || "").trim()) return;
    current.set("vid", vid);
    var next =
      location.pathname + "?" + current.toString() + (location.hash || "");
    history.replaceState(null, "", next);
  }

  // Final link for a buyer: fill {bus_number} from the QR's vid / defaultVid.
  // Falls back to fallbackUrl only when no bus number is available at all.
  function resolveUrl(buyer) {
    if (!buyer.url) return "";
    if (buyer.url.indexOf("{bus_number}") === -1) return buyer.url;
    if (busNumber)
      return buyer.url.replace("{bus_number}", encodeURIComponent(busNumber));
    return buyer.fallbackUrl || "";
  }

  function withVid(href, vid) {
    var value = vid || busNumber;
    if (!value) return href;
    var sep = href.indexOf("?") === -1 ? "?" : "&";
    return href + sep + "vid=" + encodeURIComponent(value);
  }

  function logoLabel(label, logoUrl) {
    var icon = logoUrl
      ? '<span class="seller-logo"><img src="' + logoUrl + '" alt="" /></span>'
      : '<span class="seller-dot"></span>';
    return (
      '<span class="seller-name">' +
      icon +
      '<span class="seller-label">' +
      escapeHtml(label) +
      "</span></span>"
    );
  }

  function renderStatus(container, title, body) {
    container.innerHTML =
      '<div class="status-wrap">' +
      (title ? '<p class="status-title">' + escapeHtml(title) + "</p>" : "") +
      '<p class="status-body">' +
      escapeHtml(body) +
      "</p>" +
      "</div>";
  }

  function applyBusBadge() {
    var badgeEl = document.getElementById("bus-badge");
    if (!badgeEl) return;
    if (busNumber) {
      badgeEl.textContent = "Bus " + busNumber;
      badgeEl.hidden = false;
    } else {
      badgeEl.textContent = "";
      badgeEl.hidden = true;
    }
  }

  // Renders a plain list of links (groups, or entities within a group) —
  // shared by the group picker and the entity picker.
  // vidFor(item) optionally supplies a per-item default when the page has no vid.
  function renderLinkList(container, items, hrefFor, vidFor) {
    container.innerHTML =
      '<ul class="seller-list">' +
      items
        .map(function (item) {
          var vid =
            busNumber ||
            (typeof vidFor === "function" ? vidFor(item) : "") ||
            "";
          return (
            '<li class="seller-item"><a href="' +
            withVid(hrefFor(item), vid) +
            '">' +
            logoLabel(item.name) +
            "</a></li>"
          );
        })
        .join("") +
      "</ul>";
  }

  function renderBuyerList(container, entity, fullName) {
    var items = entity.buyers
      .map(function (buyer) {
        if (buyer.status === "live") {
          var url = resolveUrl(buyer);
          if (!url) return "";
          return (
            '<li class="seller-item"><a href="' +
            url +
            '" target="_blank" rel="noopener noreferrer" ' +
            'data-app="' +
            escapeHtml(buyer.label) +
            '">' +
            logoLabel(buyer.label, buyer.logo) +
            "</a></li>"
          );
        }
        if (buyer.status === "pending") {
          return (
            '<li class="seller-item--disabled">' +
            '<span class="seller-name"><span class="seller-dot seller-dot--soon"></span>' +
            escapeHtml(buyer.label) +
            "</span>" +
            '<span class="seller-soon-badge">Coming soon</span></li>'
          );
        }
        return ""; // status === 'na' → omit entirely
      })
      .join("");

    container.innerHTML = '<ul class="seller-list">' + items + "</ul>";

    container.querySelectorAll(".seller-item a").forEach(function (link) {
      link.addEventListener("click", function () {
        gtag("event", "buyer_app_click", {
          app_name: link.dataset.app || "unknown",
          platform_os: os,
          entity_name: fullName,
          bus_number: busNumber || "",
          destination_url: link.href,
        });
      });
    });

    gtag("event", "platform_detected", {
      platform_os: os,
      entity_name: fullName,
      bus_number: busNumber || "",
    });
  }

  function applyHeaderLogo(photoUrl, altText) {
    var logoEl = document.getElementById("header-logo");
    if (!logoEl) return;
    if (photoUrl) {
      logoEl.classList.add("has-photo");
      logoEl.innerHTML =
        '<img class="venue-photo" src="' +
        photoUrl +
        '" alt="' +
        escapeHtml(altText) +
        '" />';
    } else {
      logoEl.classList.remove("has-photo");
      logoEl.innerHTML = LOCATION_ICON;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var navSlot = document.getElementById("navbar-slot");
    if (navSlot) navSlot.outerHTML = NAVBAR_HTML;
    var footerSlot = document.getElementById("footer-slot");
    if (footerSlot) footerSlot.outerHTML = FOOTER_HTML;

    var logoEl = document.getElementById("header-logo");
    if (logoEl) logoEl.innerHTML = LOCATION_ICON;

    var body = document.body;
    var groupSlug = body.getAttribute("data-group");
    var entitySlug = body.getAttribute("data-entity");
    var container = document.getElementById("main-content");
    var titleEl = document.getElementById("page-title");

    dataPromise
      .then(function (data) {
        if (groupSlug && entitySlug) {
          var group = findBySlug(data.groups, groupSlug);
          var entity = group && findBySlug(group.entities, entitySlug);
          if (!entity)
            return renderStatus(
              container,
              "Not found",
              "This operator could not be found."
            );

          // Prefer QR vid; otherwise use the operator's default and reflect it
          // in the address bar so external buyer links share the same bus id.
          if (!busNumber && entity.defaultVid) {
            busNumber = String(entity.defaultVid).trim();
            ensureVidInUrl(busNumber);
          }

          var fullName = entity.name + ", " + group.name;
          if (titleEl) titleEl.textContent = entity.title || fullName;
          document.title = "Book Tickets — " + fullName + " | ONDC";
          applyHeaderLogo(entity.photo, fullName);
          applyBusBadge();
          renderBuyerList(container, entity, fullName);
        } else if (groupSlug) {
          var groupOnly = findBySlug(data.groups, groupSlug);
          if (!groupOnly)
            return renderStatus(
              container,
              "Not found",
              "This region could not be found."
            );

          if (titleEl) titleEl.textContent = groupOnly.name;
          document.title = "Discover Buses — " + groupOnly.name + " | ONDC";
          renderLinkList(
            container,
            groupOnly.entities,
            function (entity) {
              return "/" + groupOnly.slug + "/" + entity.slug + "/";
            },
            function (entity) {
              return entity.defaultVid || "";
            }
          );
        } else {
          renderLinkList(container, data.groups, function (group) {
            return "/" + group.slug + "/";
          });
        }
      })
      .catch(function () {
        renderStatus(
          container,
          "Something went wrong",
          "We couldn't load this page.\nPlease check your connection and try again."
        );
      });
  });
})();
