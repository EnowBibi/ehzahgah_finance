const $ = id => document.getElementById(id);
let state = { enabled: true, lang: "hau", showOriginal: false, userEntries: {} };

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function refresh() {
  const tab = await activeTab();
  let s = null;
  try { s = await chrome.tabs.sendMessage(tab.id, { type: "stats" }); } catch (e) {}
  const box = $("stats"), list = $("unknown");
  list.innerHTML = "";
  if (!s) { box.textContent = "EHZAHGAH FINANCE isn't active on this tab. Reload the page (it can't run on chrome:// pages)."; return; }
  box.textContent = `✓ ${s.ok} translated · ? ${s.unknown.length} unknown · ⚠ ${s.blocked} blocked by Integrity Guard`;

  for (const text of s.unknown) {
    const tpl = LF.templatize(text);
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<div class="src"></div><input type="text" aria-label="Translation"><div class="err"></div><button>Teach</button>`;
    div.querySelector(".src").textContent = tpl;
    const input = div.querySelector("input");
    const err = div.querySelector(".err");
    const slots = tpl.match(/\{\d+\}/g) || [];
    input.placeholder = slots.length ? `Translation (keep ${slots.join(" ")})` : "Translation";
    div.querySelector("button").addEventListener("click", async () => {
      const tgt = input.value.trim();
      if (!tgt) { err.textContent = "Type a translation first."; return; }
      const missing = slots.filter(sl => !tgt.includes(sl));
      if (missing.length) { err.textContent = `Keep ${missing.join(" ")} in your translation so amounts stay exact.`; return; }
      const ue = state.userEntries;
      (ue[state.lang] = ue[state.lang] || []).push({ src: [tpl], tgt });
      await chrome.storage.local.set({ userEntries: ue });
      state.userEntries = ue;
      setTimeout(refresh, 250);
    });
    list.appendChild(div);
  }
  const b = $("badge");
  b.textContent = s.validated ? "Validated language pack" : "Not yet validated by a native-speaker linguist";
  b.className = "badge" + (s.validated ? " ok" : "");
}

async function main() {
  const langs = await (await fetch("langs/index.json")).json();
  state = await chrome.storage.local.get(state);
  $("lang").innerHTML = langs.map(l => `<option value="${l.code}">${l.name}</option>`).join("");
  $("lang").value = state.lang;
  $("enabled").checked = state.enabled;
  $("orig").checked = state.showOriginal;

  $("lang").addEventListener("change", async e => { state.lang = e.target.value; await chrome.storage.local.set({ lang: state.lang }); setTimeout(refresh, 300); });
  $("enabled").addEventListener("change", async e => { await chrome.storage.local.set({ enabled: e.target.checked }); setTimeout(refresh, 200); });
  $("orig").addEventListener("change", e => chrome.storage.local.set({ showOriginal: e.target.checked }));
  $("export").addEventListener("click", async () => {
    await navigator.clipboard.writeText(JSON.stringify(state.userEntries[state.lang] || [], null, 2));
    $("export").textContent = "Copied";
    setTimeout(() => ($("export").textContent = "Copy my taught entries (JSON)"), 1200);
  });
  $("dump").addEventListener("click", async () => {
    const tab = await activeTab();
    let rows = null;
    try { rows = await chrome.tabs.sendMessage(tab.id, { type: "dump" }); } catch (e) {}
    if (!rows || !rows.length) { $("dump").textContent = "Nothing found: reload the page"; return; }
    const q = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = "\ufefftemplate,example,status\n" + rows.map(r => [r.template, r.example, r.status].map(q).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "page-strings.csv";
    a.click();
    $("dump").textContent = `Exported ${rows.length} strings`;
  });
  refresh();
}
main();
