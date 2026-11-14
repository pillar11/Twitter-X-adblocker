// X Promoted Blocker: hides promoted posts on x.com and twitter.com.
// How it finds them (the same ideas the well-known filter lists use, made more tolerant):
//   1. the small label X puts on an ad ("Ad", "Promoted", "Boosted", "Ad from site.com", ...),
//   2. links that X tags as promoted trends (src=promoted_trend_click).
// Posts that merely contain those words in their own text are never touched.
(() => {
  // Labels X shows on promoted items, in several languages (lowercase).
  const LABELS = new Set([
    "ad", "promoted", "sponsored", "boosted",
    "annonce", "publicité", "sponsorisé", "promu", "boosté",   // French
    "anzeige", "gesponsert", "werbung",                          // German
    "anuncio", "promocionado", "patrocinado", "publicidad",      // Spanish / Portuguese
    "sponsorizzato", "promosso", "pubblicità",                   // Italian
    "إعلان", "ممول", "مُروَّج", "مروج", "ترويجي",                 // Arabic
    "reklam", "reklama", "advertentie", "sponsrad", "tanıtım",   // Turkish, Slavic, Dutch, Swedish
  ]);
  // "Promoted by BrandX", "Boosted by ...", etc.
  const PREFIX = /^(promoted|sponsored|boosted|promu|sponsorisé|promocionado|patrocinado|gesponsert|promosso|sponsorizzato)\s+(by|par|por|von|da|door)\b/i;
  // "Ad from vast.ai", "Annonce de ...", "إعلان من ..." : the label on link-card ads.
  const AD_FROM = /^(ad|ads|annonce|anuncio|anzeige|publicité|publicidad|pubblicità|reklam|إعلان)\s+(from|de|von|da|från|من)\s+\S+/i;

  // Every post is an <article>; the other selectors cover older layouts, trends and "who to follow".
  const ITEMS = 'article, [data-testid="cellInnerDiv"], [data-testid="trend"], [data-testid="UserCell"]';
  // The list row to hide around a post (a <li> in the current layout, a cellInnerDiv in the older one).
  const ROW = '[data-testid="cellInnerDiv"], li';
  // Text written by users: a bare "Ad" here is not a label.
  const FREE_TEXT = '[data-testid="tweetText"], [data-testid="UserDescription"]';
  // The profile name/handle links: a person can be called "Ad".
  const NAME_AREA = '[data-testid="User-Name"], [data-testid="UserName"]';
  // Links X tags as promoted trends.
  const PROMO_LINKS = 'a[href*="promoted_trend_click"]';

  let enabled = true;
  let blocked = 0;
  let pending = false;
  let saveTimer = null;

  chrome.storage.local.get({ enabled: true, blocked: 0 }, (v) => {
    enabled = v.enabled;
    blocked = v.blocked;
    schedule();
  });
  chrome.storage.onChanged.addListener((ch) => {
    if (ch.enabled) {
      enabled = ch.enabled.newValue !== false;
      if (!enabled) document.querySelectorAll("[data-xpb-hidden]").forEach((e) => e.removeAttribute("data-xpb-hidden"));
      else schedule();
    }
  });

  // Remove invisible characters and extra spaces that could hide a label from a plain comparison.
  function clean(text) {
    return text.replace(/[​-‏‪-‮⁠﻿]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function isLabel(text) {
    if (!text || text.length > 60) return false;
    const t = clean(text);
    return t.length > 0 && t.length <= 40 && (LABELS.has(t) || PREFIX.test(t) || AD_FROM.test(t));
  }

  function userWritten(el) {
    if (el.closest(FREE_TEXT)) return true;
    if (el.closest(NAME_AREA)) {
      // The name area itself, anything inside a profile link, and wrappers around a profile link are a person's name.
      return el.matches(NAME_AREA) || !!el.closest("a[href]") || !!el.querySelector("a[href]");
    }
    return false;
  }

  function isPromoted(item) {
    if (item.querySelector(PROMO_LINKS)) return true;
    // Pass 1: any piece of text that is exactly a label (works even if the label shares an element with its icon).
    const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (isLabel(n.nodeValue) && n.parentElement && !userWritten(n.parentElement)) return true;
    }
    // Pass 2: a small element whose combined text is a label (label split across several tags).
    for (const el of item.querySelectorAll("span, div, a")) {
      if (el.childElementCount > 0 && el.childElementCount <= 4 && isLabel(el.textContent) && !userWritten(el)) return true;
    }
    return false;
  }

  function scan() {
    pending = false;
    if (!enabled) return;
    let found = 0;
    for (const item of document.querySelectorAll(ITEMS)) {
      if (item.hasAttribute("data-xpb-hidden") || item.closest("[data-xpb-hidden]")) continue;
      if (!isPromoted(item)) continue;
      // Hide the whole timeline row, not just the inner post.
      const target = item.closest(ROW) || item;
      target.setAttribute("data-xpb-hidden", "");
      target.querySelectorAll("video").forEach((v) => { try { v.muted = true; v.pause(); } catch (e) { /* ignore */ } });
      found++;
    }
    if (found) {
      blocked += found;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => chrome.storage.local.set({ blocked }), 500);
    }
  }

  function schedule() {
    if (pending) return;
    pending = true;
    setTimeout(scan, 150); // handle a burst of page updates once
  }

  new MutationObserver(schedule).observe(document, { childList: true, subtree: true, characterData: true });
  setInterval(schedule, 2000); // safety net in case a page update slips past the observer

  // ----- debug report: lets you copy what the page looks like around ad-like words -----
  function describe(el) {
    const chain = [];
    for (let e = el, i = 0; e && e !== document.body && i < 7; e = e.parentElement, i++) {
      const bits = [e.tagName.toLowerCase()];
      for (const a of ["data-testid", "role", "aria-label", "href", "dir"]) {
        const v = e.getAttribute && e.getAttribute(a);
        if (v) bits.push(`${a}="${v.slice(0, 50)}"`);
      }
      chain.push(bits.join(" "));
    }
    return chain;
  }

  function layoutInfo(el) {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      el: el.tagName.toLowerCase() + (el.getAttribute("role") ? ` role=${el.getAttribute("role")}` : ""),
      position: cs.position, display: cs.display, height: Math.round(el.getBoundingClientRect().height),
      transform: cs.transform === "none" ? "none" : "set",
      inlineStyle: (el.getAttribute("style") || "").slice(0, 140),
    };
  }

  function report() {
    const matches = [];
    const words = /boost|promot|sponsor|\bad\b|\bads\b|ad from|إعلان/i;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n && matches.length < 12; n = walker.nextNode()) {
      const t = (n.nodeValue || "").trim();
      if (!t || t.length > 60 || !words.test(t)) continue;
      const el = n.parentElement;
      if (!el || el.closest(FREE_TEXT)) continue;
      matches.push({
        text: t,
        hidden: !!el.closest("[data-xpb-hidden]"),
        wouldMatch: isLabel(t),
        ancestors: describe(el),
      });
    }
    return JSON.stringify({
      url: location.hostname, enabled, blockedTotal: blocked,
      articles: document.querySelectorAll("article").length,
      cellInnerDivs: document.querySelectorAll('[data-testid="cellInnerDiv"]').length,
      listItems: document.querySelectorAll("li").length,
      hiddenRows: document.querySelectorAll("[data-xpb-hidden]").length,
      layout: [...document.querySelectorAll("[data-xpb-hidden]")].slice(0, 2).map((r) => ({
        row: layoutInfo(r), parent: layoutInfo(r.parentElement), next: layoutInfo(r.nextElementSibling),
      })),
      matches,
    }, null, 1);
  }

  chrome.runtime.onMessage.addListener((msg, sender, send) => {
    if (msg === "xpb-debug") send(report());
  });
})();
