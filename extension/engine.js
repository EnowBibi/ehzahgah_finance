// EHZAHGAH FINANCE translation engine. No browser APIs here, so the popup can reuse it.
// Pipeline: exact glossary match -> template match (with {1},{2}... slots) -> "unknown".
// Slots are copied verbatim into the output, so amounts / names are never re-written.
var LF = (() => {
  const TOKEN_SRC = String.raw`(?:XAF|FCFA|F\s?CFA)\s?\d[\d\s.,]*\d|(?:XAF|FCFA|F\s?CFA)\s?\d|\d[\d\s.,]*\d(?:\s?(?:XAF|FCFA|F\s?CFA|CFA))?|\d(?:\s?(?:XAF|FCFA|F\s?CFA|CFA))?|[\w.+-]+@[\w-]+\.[\w.]+`;
  const tokenRe = () => new RegExp(TOKEN_SRC, "gi");

  const norm = s => s.replace(/[\u00a0\u202f]/g, " ").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
  const DATE_RE = /^(?:\d{1,2}\s+([^\s\d,]+)\s+\d{4}|([^\s\d,]+)\s+\d{1,2},\s+\d{4})$/u;
  const esc = s => s.replace(/[.*+?^${}()[\]\\|]/g, "\\$&");

  // Amounts, currencies, phone/account numbers, emails found in a string (normalised for comparison).
  function tokens(s) {
    return (s.match(tokenRe()) || []).map(t => t.replace(/[\s\u00a0\u202f]/g, "").toUpperCase());
  }

  // Integrity Guard: the translation must contain exactly the same financial tokens as the source.
  function integrityOk(orig, out) {
    return tokens(orig).sort().join("|") === tokens(out).sort().join("|");
  }

  // "Your session expires in 5 minutes" -> "Your session expires in {1} minutes"
  function templatize(text) {
    let i = 0;
    return norm(text).replace(tokenRe(), () => `{${++i}}`);
  }

  // keep: strings that must never be translated (brand, fixture names, codes).
  // Plain strings match exactly (case-insensitive); strings starting with "re:" are regular expressions.
  function compile(entries, keep, months) {
    const exact = new Map(), tpl = [], keepExact = new Set(), keepRe = [], monthMap = new Map();
    for (const m of months || []) for (const s of m.src || []) if (m.tgt) monthMap.set(s.toLowerCase(), m.tgt);
    for (const k of ["re:^(XAF|FCFA|F CFA|CFA)$", ...(keep || [])]) {
      if (k.startsWith("re:")) keepRe.push(new RegExp(k.slice(3), "u"));
      else keepExact.add(norm(k).toLowerCase());
    }
    for (const e of entries) {
      if (!e || !e.tgt || !e.tgt.trim()) continue;
      for (const src of e.src || []) {
        const n = norm(src);
        if (/\{\d+\}/.test(n)) {
          const order = [];
          const body = n.split(/(\{\d+\})/).map(p => {
            const m = p.match(/^\{(\d+)\}$/);
            if (m) { order.push(m[1]); return "(.+?)"; }
            return esc(p).replace(/ /g, "\\s+");
          }).join("");
          tpl.push({ re: new RegExp("^" + body + "$", "i"), order, tgt: e.tgt });
        } else {
          exact.set(n.toLowerCase(), e.tgt);
        }
      }
    }
    return { exact, tpl, keepExact, keepRe, monthMap };
  }

  function translate(text, db) {
    const n = norm(text);
    // Nothing to translate if no letters remain once amounts/numbers are removed.
    if (!/\p{L}/u.test(n.replace(tokenRe(), ""))) return { status: "skip" };
    if (!db) return { status: "none" };
    const hit = db.exact.get(n.toLowerCase());
    if (hit) return { status: "ok", text: hit };
    for (const t of db.tpl) {
      const m = n.match(t.re);
      if (m) {
        const out = t.tgt.replace(/\{(\d+)\}/g, (whole, id) => {
          const i = t.order.indexOf(id);
          return i >= 0 ? m[i + 1] : whole;
        });
        return { status: "ok", text: out };
      }
    }
    // Dates like "05 nov. 2026" or "Nov 5, 2026": only the month word is translated.
    if (db.monthMap.size) {
      const d = n.match(DATE_RE);
      if (d) {
        const w = d[1] || d[2];
        const t = db.monthMap.get(w.toLowerCase());
        if (t) return { status: "ok", text: n.replace(w, t) };
      }
    }
    if (db.keepExact.has(n.toLowerCase()) || db.keepRe.some(r => r.test(n))) return { status: "skip" };
    return { status: "unknown" };
  }

  return { norm, tokens, integrityOk, templatize, compile, translate };
})();
