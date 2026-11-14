# EHZAHGAH FINANCE

## SAFINUM Innovate Challenge — Project Report

### 1. Project summary

**EHZAHGAH FINANCE** is a browser-extension prototype designed to make digital financial interfaces easier to understand in Cameroonian languages. It adds a translation layer to existing web pages, so users can read supported interface text in another language without changing the financial service’s source code or building a replacement service.

The prototype is intended for use with a simulated financial-service interface. It does not carry out real transactions.

### 2. Problem addressed

Many digital banking and payment interfaces are mainly presented in French or English. People who are more comfortable in other languages may have difficulty understanding balances, fees, transfer instructions, confirmation screens, and security warnings.

EHZAHGAH FINANCE addresses this language barrier by translating matching interface text while preserving financial values and other important information.

### 3. Proposed solution and technical approach

EHZAHGAH FINANCE is built as a **Chrome-compatible Manifest V3 browser extension**. Its content script reads visible text and selected interface attributes, such as placeholders and accessibility labels, and applies translations from local language packs. It observes page updates so that newly added page content can also be processed.

The translation engine uses a glossary and message templates. Templates allow variable information—such as a name or number—to be retained in the translated message. Where text has no matching translation, it is identified as untranslated rather than automatically translated.

The extension provides a toolbar and popup for selecting a language, enabling or disabling translation, viewing translation status, and adding translations for unknown text. User-added translations are saved in the browser’s local extension storage.

### 4. Main prototype capabilities

The current codebase includes:

- Translation of matching page text and selected interface attributes.
- Language selection and a control to show the original text again.
- Indicators for translated, untranslated, and integrity-blocked text.
- A popup where users can add a translation for an untranslated message.
- Processing of dynamically added page content.
- A safeguard that compares detected financial tokens—such as amounts, currencies, numbers, and email addresses—between the original and translated text. If they differ, the extension keeps the original text and marks the translation as blocked.
- Rules to leave selected brand names, currencies, account identifiers, and transaction references unchanged.

The extension runs as a separate browser component and does not require edits to the target service’s source code. The repository’s README describes testing it on the SAFINUM sandbox through a simulated financial journey.

### 5. Supported languages

The project currently contains language packs for:

- Ejagham
- Hausa
- Cameroonian Pidgin English
- Bafut
- Mbonge (Oroko)
- Kenyang

Language-pack availability should not be presented as proof of expert validation. The repository marks several packs as validated, but their notes also describe draft translations or say that further native-speaker review is needed.

### 6. Translation sourcing and validation

The translation work used a combination of community assistance, reference material, and AI assistance:

- **Ejagham and Kenyang:** Manyu Dictionary was used as a reference, and friends helped translate terms and phrases. This is informal language support, not a substitute for review by a qualified language expert.
- **Hausa:** Google AI was used to help produce translations. These translations should be reviewed by a fluent Hausa speaker, especially for financial instructions and warnings.
- **Other included languages:** The repository contains Bafut, Mbonge (Oroko), and Cameroonian Pidgin packs.

### 7. Simulated demonstration journey

A demonstration can use the SAFINUM test environment and show the extension alongside a simulated transaction journey:

1. Select a supported language and translate the page.
2. Review a simulated account balance and transaction fees.
3. Proceed through the transfer-preparation screens and review the beneficiary and transaction summary.
4. Show that financial values remain unchanged and that a risky or mismatched translation is blocked.
5. Introduce a new message, show that it is identified as untranslated, and add a translation through the extension popup.

All steps should remain within the simulated environment. No real account information or money transfer is required.

### 8. Security, privacy, and integrity

The prototype is designed for simulated testing and does not need real banking credentials or actual transfers. Its translation packs and user-added entries are handled by the browser extension; the current code does not show a server-side translation service.

The integrity safeguard is intended to prevent detected financial tokens from changing during translation. It is not a complete verification of every financial meaning or legal condition, so important transaction details and warnings still need human review. Demonstrations should use fictional data and should not attempt to bypass the target interface’s security controls.

### 9. Architecture and dependencies

The main components are:

- `manifest.json`: declares the browser extension and its permissions.
- `content.js`: reads and updates page text, tracks status, and observes page changes.
- `engine.js`: performs glossary/template matching and financial-token checks.
- `background.js`: loads local language packs when requested.
- `popup.html` and `popup.js`: provide language controls, status information, and manual translation entry.
- `langs/`: contains the language packs.

The implementation uses browser extension APIs and local JSON translation files. No separate backend or external translation API is shown in the current extension code.

### 10. Known limitations and next steps

The prototype relies primarily on its existing glossary and templates. New or unmatched messages need a translation to be added; they are not automatically translated by the extension. Language-pack completeness varies, and linguistic review is still needed before the packs can be described as professionally validated.

The financial-token safeguard does not replace full review of transaction meaning, beneficiary details, fees, terms, or security warnings. The README also mentions exporting untranslated page strings to CSV, but that export feature does not appear in the current popup implementation; it should not be claimed as available unless it is implemented and tested.

### 11. Conclusion

EHZAHGAH FINANCE presents a reusable browser-extension approach to improving access to digital financial interfaces in Cameroonian languages. Its separation from the target service, local translation packs, handling of dynamic text, and safeguards for detected financial values provide a foundation for a functional demonstration. Its next important steps are to verify the complete demo journey, improve language coverage, and obtain expert review of translations—especially any text that affects financial decisions or security.

# EHZAHGAH FINANCE: setup

## 1. Load the extension (Chrome / Edge / Brave)

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and pick the `extension/` folder
4. Pin the EHZAHGAH FINANCE icon from the puzzle-piece menu

After any code change: click the refresh icon on the extension card, then reload the page you're testing.

## 2. Test on the SAFINUM sandbox (Ejagham)

1. Open https://safinum.cm/hackathon-test and refresh. Ejagham is the default language.
2. The toolbar (bottom right) shows ✓ translated, ? not translated, ⚠ blocked by the Integrity Guard.
3. Go through all 5 steps, in French and in English (the site's EN/FR button).
4. Anything dotted-underlined is untranslated: use the popup to "Export all page strings (CSV)" and send it back.
