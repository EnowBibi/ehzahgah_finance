# Ehzahgah_finance: setup

## 1. Load the extension (Chrome / Edge / Brave)

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and pick the `extension/` folder
4. Pin the Ehzahgah_finance icon from the puzzle-piece menu

After any code change: click the refresh icon on the extension card, then reload the page you're testing.

## 2. Run the mock bank

The extension only runs on http/https pages, so serve the mock page locally:

    cd mock-bank
    python3 -m http.server 8000

Open http://localhost:8000

## 3. Try it

- Go through Transfer money -> Continue -> summary. Amounts and the name stay exact.
- "Switch to French" proves it works on both source languages.
- "Inject new message" adds text that isn't in the pack: it appears dotted-underlined.
  Open the popup, type a translation (keep the {1}) and press Teach. It updates live.
- Open the popup > "Copy my taught entries" to move them into your language pack JSON.

## 4. Add your real language

Copy `extension/langs/template.json` to `extension/langs/<code>.json`, fill the entries,
and add the language to `extension/langs/index.json`. Set `"validated": true` only after
a native speaker has reviewed every string.

## 5. Test on the SAFINUM sandbox (Hausa)

1. Reload the extension at chrome://extensions (refresh icon on the Ehzahgah_finance card).
2. Open https://safinum.cm/hackathon-test and refresh. Hausa is the default language.
3. The toolbar (bottom right) shows ✓ translated, ? not translated, ⚠ blocked by the Integrity Guard.
4. Go through all 5 steps, in French and in English (the site's EN/FR button).
5. Anything dotted-underlined is untranslated: use the popup to "Export all page strings (CSV)" and send it back.
