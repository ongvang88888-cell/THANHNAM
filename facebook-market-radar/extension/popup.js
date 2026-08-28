const originInput = document.getElementById("origin");
const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("save");

function setStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.className = isError ? "err" : "";
}

chrome.storage.local.get(["radarOrigin"], (stored) => {
  originInput.value = stored.radarOrigin || "http://127.0.0.1:3100";
});

originInput.addEventListener("change", () => {
  chrome.storage.local.set({ radarOrigin: originInput.value.trim() });
});

saveBtn.addEventListener("click", async () => {
  const origin = originInput.value.trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[^\s]+$/.test(origin)) {
    setStatus("Điền origin Radar (http/https).", true);
    return;
  }
  chrome.storage.local.set({ radarOrigin: origin });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? "";
  if (!url.includes("facebook.com/ads/library")) {
    setStatus("Mở Thư viện quảng cáo rồi bấm lại.", true);
    return;
  }
  const collect = `${origin}/collect?url=${encodeURIComponent(url)}`;
  await chrome.tabs.create({ url: collect });
});
