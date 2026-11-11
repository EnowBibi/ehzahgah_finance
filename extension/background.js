// Service worker: loads language packs on request (content scripts ask us for them).
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "getPack" && /^[a-z0-9_-]+$/i.test(msg.lang || "")) {
    fetch(chrome.runtime.getURL(`langs/${msg.lang}.json`))
      .then(r => r.json())
      .then(sendResponse)
      .catch(() => sendResponse(null));
    return true; // keep the channel open for the async response
  }
});
