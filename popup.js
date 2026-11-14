const on = document.getElementById("on");
const n = document.getElementById("n");
const msg = document.getElementById("msg");

function show() {
  chrome.storage.local.get({ enabled: true, blocked: 0 }, (v) => {
    on.checked = v.enabled;
    n.textContent = v.blocked;
  });
}
show();
chrome.storage.onChanged.addListener(show);

on.addEventListener("change", () => chrome.storage.local.set({ enabled: on.checked }));
document.getElementById("reset").addEventListener("click", () => chrome.storage.local.set({ blocked: 0 }));

document.getElementById("debug").addEventListener("click", async () => {
  msg.style.color = "#060";
  msg.textContent = "";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) { msg.style.color = "#a00"; msg.textContent = "Open an X tab first."; return; }
  chrome.tabs.sendMessage(tab.id, "xpb-debug", async (text) => {
    if (chrome.runtime.lastError || !text) {
      msg.style.color = "#a00";
      msg.textContent = "Open x.com in this tab (and reload it once), then try again.";
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      msg.textContent = "Copied. Paste it in the chat.";
    } catch (e) {
      msg.style.color = "#a00";
      msg.textContent = "Could not copy. Try again.";
    }
  });
});
