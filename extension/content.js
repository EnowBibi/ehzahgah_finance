// LinguaFin content script: runs inside the page, translates text at runtime,
// never touches the site's source code, and keeps the original text for every change.
(() => {
  if (window.__lfLoaded) return;
  window.__lfLoaded = true;

  const SKIP = "script,style,noscript,textarea,code,pre,[contenteditable=true],[data-lf-skip],#lf-host";
  const ATTRS = ["placeholder", "title", "aria-label"];
  const ATTR_SEL = "[placeholder],[title],[aria-label],input[type=button],input[type=submit]";
  const WARN_SEL = "[role=alert],.error,.warning,.alert,[class*=warn],[class*=error]";

  let settings = { enabled: true, lang: "hau", showOriginal: false };
  let userEntries = {};
  let pack = null;
  let db = null;

  // owner (text node or element) -> Map(field -> record). field is "#text" or an attribute name.
  const recs = new Map();
  const pending = new Set();
  let timer = null;

  const read = (o, f) => (f === "#text" ? o.nodeValue : o.getAttribute(f));
  const write = (o, f, v) => (f === "#text" ? (o.nodeValue = v) : o.setAttribute(f, v));
  const elOf = o => (o.nodeType === 3 ? o.parentElement : o);

  function getRec(o, f) {
    let m = recs.get(o);
    if (!m) { m = new Map(); recs.set(o, m); }
    let r = m.get(f);
    if (!r) { r = { orig: null, out: null, shown: null, status: "" }; m.set(f, r); }
    return r;
  }

  const keepSpace = (orig, text) =>
    (orig.match(/^\s*/)[0]) + text + (orig.match(/\s*$/)[0]);

  function compute(rec) {
    const r = LF.translate(rec.orig, db);
    rec.status = r.status;
    rec.out = null;
    if (r.status === "ok") {
      const out = keepSpace(rec.orig, r.text);
      if (LF.integrityOk(rec.orig, out)) rec.out = out;
      else rec.status = "blocked"; // Integrity Guard: numbers/amounts differ -> keep the original
    }
  }

  function render(o, f, rec) {
    const wantTranslated = settings.enabled && !settings.showOriginal && rec.out !== null;
    const desired = wantTranslated ? rec.out : rec.orig;
    if (read(o, f) !== desired) write(o, f, desired);
    rec.shown = desired;

    const el = elOf(o);
    if (!el) return;
    const on = settings.enabled;
    el.classList.toggle("lf-unknown", on && rec.status === "unknown");
    el.classList.toggle("lf-blocked", on && rec.status === "blocked");
    if (on && rec.status === "ok") {
      const w = el.closest(WARN_SEL);
      if (w) w.classList.add("lf-warning");
    }
  }

  function processSlot(o, f) {
    const cur = read(o, f);
    if (cur == null || !cur.trim()) return;
    const rec = getRec(o, f);
    if (rec.shown !== null && cur === rec.shown) return; // our own write, ignore
    rec.orig = cur;
    compute(rec);
    render(o, f, rec);
  }

  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      if (root.parentElement && !root.parentElement.closest(SKIP)) processSlot(root, "#text");
      return;
    }
    if (root.nodeType !== 1 || root.closest(SKIP)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (n.parentElement && !n.parentElement.closest(SKIP)) processSlot(n, "#text");
    }
    const els = root.matches(ATTR_SEL) ? [root] : [];
    els.push(...root.querySelectorAll(ATTR_SEL));
    for (const el of els) {
      if (el.closest(SKIP)) continue;
      for (const a of ATTRS) if (el.hasAttribute(a)) processSlot(el, a);
      if (el.matches("input[type=button],input[type=submit]")) processSlot(el, "value");
    }
  }

  function retranslateAll() {
    for (const [o, m] of recs) {
      for (const [f, rec] of m) {
        if (rec.orig === null) continue;
        compute(rec);
        render(o, f, rec);
      }
    }
    updateBar();
  }

  // ---------- stats + toolbar ----------
  function stats() {
    let ok = 0, blocked = 0;
    const unknown = new Set();
    for (const m of recs.values()) {
      for (const rec of m.values()) {
        if (rec.status === "ok") ok++;
        else if (rec.status === "blocked") blocked++;
        else if (rec.status === "unknown") unknown.add(LF.norm(rec.orig));
      }
    }
    return {
      ok, blocked, unknown: [...unknown].slice(0, 50),
      lang: settings.lang, enabled: settings.enabled,
      packName: pack ? pack.name : "", validated: pack ? !!pack.validated : false
    };
  }

  // Every distinct string seen on the page (for building the translation sheet).
  function dump() {
    const seen = new Map();
    for (const m of recs.values()) {
      for (const rec of m.values()) {
        if (rec.orig === null || rec.status === "skip") continue;
        const text = LF.norm(rec.orig);
        const template = LF.templatize(text);
        if (!seen.has(template)) seen.set(template, { template, example: text, status: rec.status });
      }
    }
    return [...seen.values()];
  }

  let bar = null;
  function buildBar() {
    if (document.getElementById("lf-host")) return;
    const host = document.createElement("div");
    host.id = "lf-host";
    host.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:2147483647;";
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `
      <style>
        .bar{font:13px system-ui,sans-serif;background:#12312b;color:#fff;border-radius:10px;
             padding:8px 10px;display:flex;gap:10px;align-items:center;box-shadow:0 4px 14px rgba(0,0,0,.3)}
        .n{font-weight:600} .u{color:#fcd34d} .b{color:#fca5a5}
        button{font:inherit;border:0;border-radius:6px;padding:4px 8px;cursor:pointer;background:#e8f3ef;color:#12312b}
        button:focus-visible{outline:2px solid #fcd34d}
      </style>
      <div class="bar" role="status">
        <span class="n" id="name">LinguaFin</span>
        <span id="ok" title="Translated"></span>
        <span class="u" id="unk" title="Not translated yet"></span>
        <span class="b" id="blk" title="Blocked by Integrity Guard"></span>
        <button id="tog"></button>
      </div>`;
    root.getElementById("tog").addEventListener("click", () =>
      chrome.storage.local.set({ showOriginal: !settings.showOriginal }));
    document.documentElement.appendChild(host);
    bar = root;
    updateBar();
  }

  function updateBar() {
    if (!bar) return;
    const s = stats();
    const set = (id, t) => (bar.getElementById(id).textContent = t);
    set("name", s.enabled ? `LinguaFin: ${s.lang}${s.validated ? "" : " (unvalidated)"}` : "LinguaFin off");
    set("ok", `✓ ${s.ok}`);
    set("unk", s.unknown.length ? `? ${s.unknown.length}` : "");
    set("blk", s.blocked ? `⚠ ${s.blocked}` : "");
    set("tog", settings.showOriginal ? "Show translation" : "Show original");
  }

  // ---------- observing the page ----------
  function flush() {
    timer = null;
    const batch = [...pending];
    pending.clear();
    for (const n of batch) if (n.isConnected) scan(n);
    updateBar();
  }
  function queue(n) {
    pending.add(n);
    if (!timer) timer = setTimeout(flush, 30);
  }

  const observer = new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === "childList") m.addedNodes.forEach(queue);
      else queue(m.target);
    }
  });

  setInterval(() => {
    for (const o of [...recs.keys()]) if (!o.isConnected) recs.delete(o);
  }, 5000);

  // ---------- settings + language pack ----------
  async function loadAll() {
    const s = await chrome.storage.local.get({
      enabled: true, lang: "hau", showOriginal: false, userEntries: {}
    });
    const langChanged = s.lang !== settings.lang || !pack;
    settings = { enabled: s.enabled, lang: s.lang, showOriginal: s.showOriginal };
    userEntries = s.userEntries || {};
    if (langChanged) pack = await chrome.runtime.sendMessage({ type: "getPack", lang: s.lang });
    const entries = [...((pack && pack.entries) || []), ...(userEntries[s.lang] || [])];
    db = LF.compile(entries, pack && pack.keep, pack && pack.months);
  }

  chrome.storage.onChanged.addListener(async (_c, area) => {
    if (area !== "local") return;
    await loadAll();
    retranslateAll();
  });

  chrome.runtime.onMessage.addListener((msg, _s, send) => {
    if (msg && msg.type === "stats") send(stats());
    if (msg && msg.type === "dump") send(dump());
  });

  (async () => {
    await loadAll();
    buildBar();
    scan(document.body);
    updateBar();
    observer.observe(document.body, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: [...ATTRS, "value"]
    });
  })();
})();
