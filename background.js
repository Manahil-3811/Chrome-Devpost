// Add this file to your extension
chrome.runtime.onInstalled.addListener(() => {
  // This will prompt the user to enter their API key on first install
  chrome.storage.sync.get(["geminiApiKey"], (result) => {
    if (!result.geminiApiKey) {
      chrome.tabs.create({
        url: "options.html",
      });
        
    }
  });
});
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "GROUP_TABS_AI") {
    try {
      const allWindows = await chrome.windows.getAll({ windowTypes: ["normal"] });
      const normalWindowIds = allWindows.map(w => w.id);

      const allTabs = await chrome.tabs.query({ windowType: "normal" });

      const matchingTabs = allTabs.filter(
        tab =>
          normalWindowIds.includes(tab.windowId) &&
          (tab.url.includes("chatgpt") || tab.url.includes("deepseek"))
      );

      if (matchingTabs.length === 0) {
        sendResponse({ success: false, message: "No eligible tabs found." });
        return true;
      }

      const groupedByWindow = {};
      for (const tab of matchingTabs) {
        if (!groupedByWindow[tab.windowId]) groupedByWindow[tab.windowId] = [];
        groupedByWindow[tab.windowId].push(tab.id);
      }

      for (const [windowId, tabIds] of Object.entries(groupedByWindow)) {
        const groupId = await chrome.tabs.group({ tabIds });
        await chrome.tabGroups.update(groupId, {
          title: "AI Tools",
          color: ["blue", "green", "yellow", "purple"][Math.floor(Math.random() * 4)]
        });
      }

      sendResponse({ success: true, message: "Tabs grouped successfully!" }); 
    } catch (err) {
      console.error("Error grouping tabs:", err); 
      sendResponse({ success: false, message: err.message });
    }

    return true; 
  }
});