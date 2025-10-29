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
      const tabGroupsData = message.data;

      const allWindows = await chrome.windows.getAll({
        windowTypes: ["normal"],
      });
      const normalWindowIds = allWindows.map((w) => w.id);

      const allTabs = await chrome.tabs.query({ windowType: "normal" });

      let groupedCount = 0;

      for (const group of tabGroupsData) {
        const matchingTabs = allTabs.filter(
          (tab) =>
            normalWindowIds.includes(tab.windowId) &&
            !tab.url.startsWith("chrome://") &&
            !tab.url.startsWith("edge://") &&
            !tab.pinned &&
            group.tabs.some((t) =>
              tab.title?.toLowerCase().includes(t.title.toLowerCase())
            )
        );

        if (matchingTabs.length === 0) continue;

        const groupedByWindow = {};
        for (const tab of matchingTabs) {
          if (!groupedByWindow[tab.windowId])
            groupedByWindow[tab.windowId] = [];
          groupedByWindow[tab.windowId].push(tab.id);
        }

        for (const [windowId, tabIds] of Object.entries(groupedByWindow)) {
          const groupId = await chrome.tabs.group({ tabIds });
          await chrome.tabGroups.update(groupId, {
            title: group.group || "AI Group",
            color: randomColor(),
          });
          groupedCount += tabIds.length;
        }
      }

      sendResponse({
        success: true,
        message: `Grouped ${groupedCount} tabs successfully!`,
      });
    } catch (err) {
      console.error("Error grouping tabs:", err);
      sendResponse({ success: false, message: err.message });
    }

    return true;
  }
});

function randomColor() {
  const colors = [
    "grey",
    "blue",
    "red",
    "yellow",
    "green",
    "pink",
    "purple",
    "cyan",
    "orange",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
