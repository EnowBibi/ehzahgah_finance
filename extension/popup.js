const $ = id => document.getElementById(id);
let state = { enabled: true, lang: "etu", theme: "light", userEntries: {} };
let languages = [];

function renderTheme(theme) {
  state.theme = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = state.theme;
  $("theme-light").setAttribute("aria-pressed", String(state.theme === "light"));
  $("theme-dark").setAttribute("aria-pressed", String(state.theme === "dark"));
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function refresh() {
  const tab = await activeTab();
  let s = null;
  try { s = await chrome.tabs.sendMessage(tab.id, { type: "stats" }); } catch (e) {}
  const box = $("stats"), list = $("unknown"), unknownSection = $("unknown-section");
  list.innerHTML = "";
  if (!s) {
    box.textContent = "EHZAHGAH FINANCE isn't active on this tab. Reload the page (it can't run on chrome:// pages).";
    $("pack-dot").hidden = true;
    $("pack-status").textContent = "";
    unknownSection.hidden = true;
    return;
  }
  box.replaceChildren();
  const icons = [
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3.2 3.2L13 4.5"></path></svg>',
    '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6"></circle><path d="M6.5 6.2a1.6 1.6 0 1 1 2.7 1.1c-.8.6-1.2.9-1.2 1.9M8 11.6h.01"></path></svg>',
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8 13 4v3.5c0 3-2.1 5.2-5 6.7-2.9-1.5-5-3.7-5-6.7V4l5-2.2Z"></path><path d="M8 5v3m0 2.2h.01"></path></svg>'
  ];
  [[s.ok, "translated"], [s.unknown.length, "unknown"], [s.blocked, "blocked"]].forEach(([count, label], index) => {
    const metric = document.createElement("span");
    metric.className = "stat";
    metric.innerHTML = icons[index];
    const value = document.createElement("span");
    value.textContent = `${count} ${label}`;
    metric.appendChild(value);
    box.appendChild(metric);
  });
  const language = languages.find(item => item.code === state.lang);
  $("pack-dot").hidden = !s.validated;
  $("pack-status").textContent = s.validated && language ? `${language.name} translation pack validated` : "";
  unknownSection.hidden = s.unknown.length === 0;

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
}

async function main() {
  languages = await (await fetch("langs/index.json")).json();
  state = await chrome.storage.local.get(state);
  $("lang").innerHTML = languages.map(l => `<option value="${l.code}">${l.name}</option>`).join("");
  $("lang").value = state.lang;
  $("enabled").checked = state.enabled;
  renderTheme(state.theme);

  $("lang").addEventListener("change", async e => { state.lang = e.target.value; await chrome.storage.local.set({ lang: state.lang }); setTimeout(refresh, 300); });
  $("enabled").addEventListener("change", async e => {
    state.enabled = e.target.checked;
    await chrome.storage.local.set({ enabled: state.enabled });
    setTimeout(refresh, 200);
  });
  $("theme-light").addEventListener("click", async () => {
    renderTheme("light");
    await chrome.storage.local.set({ theme: "light" });
  });
  $("theme-dark").addEventListener("click", async () => {
    renderTheme("dark");
    await chrome.storage.local.set({ theme: "dark" });
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.enabled) {
      state.enabled = changes.enabled.newValue;
      $("enabled").checked = state.enabled;
    }
    if (changes.theme) renderTheme(changes.theme.newValue);
    if (changes.userEntries) state.userEntries = changes.userEntries.newValue || {};
    if (changes.lang) {
      state.lang = changes.lang.newValue;
      $("lang").value = state.lang;
      setTimeout(refresh, 200);
    }
  });
  $("export").addEventListener("click", async () => {
    await navigator.clipboard.writeText(JSON.stringify(state.userEntries[state.lang] || [], null, 2));
    $("export").textContent = "Copied";
    setTimeout(() => ($("export").textContent = "Copy JSON"), 1200);
  });
  $("dump").addEventListener("click", async () => {
    const tab = await activeTab();
    let rows = null;
    try { rows = await chrome.tabs.sendMessage(tab.id, { type: "dump" }); } catch (e) {}
    if (!rows || !rows.length) { $("dump").textContent = "Reload page to export"; return; }
    const q = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv = "\ufefftemplate,example,status\n" + rows.map(r => [r.template, r.example, r.status].map(q).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "page-strings.csv";
    a.click();
    $("dump").textContent = `Exported ${rows.length}`;
  });
  refresh();
}
main();
