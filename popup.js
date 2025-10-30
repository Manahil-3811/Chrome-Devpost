// Tab Switching Logic
document.addEventListener("DOMContentLoaded", () => {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");

      // Remove active class from all buttons and contents
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));

      // Add active class to clicked button and corresponding content
      btn.classList.add("active");
      document.getElementById(`${targetTab}-tab`).classList.add("active");

      // Load tabs when switching to tabs section
      if (targetTab === "tabs") {
        loadAndDisplayTabs();
      }
    });
  });

  // Load tabs initially if on tabs page
  loadAndDisplayTabs();
});

// Function to load and display all tabs organized by groups
async function loadAndDisplayTabs() {
  const tabsResultDiv = document.getElementById("tabs-result");

  try {
    // Get all tabs
    const tabs = await chrome.tabs.query({ currentWindow: true });

    if (tabs.length === 0) {
      tabsResultDiv.innerHTML =
        '<p class="no-tabs">No tabs found in this window.</p>';
      return;
    }

    // Get all unique group IDs (excluding -1 which means ungrouped)
    const groupIds = [
      ...new Set(tabs.map((t) => t.groupId).filter((id) => id !== -1)),
    ];

    console.log("Group IDs found:", groupIds);

    // Get group details
    let groups = [];
    if (groupIds.length > 0 && chrome.tabGroups) {
      try {
        groups = await Promise.all(
          groupIds.map(async (id) => {
            try {
              const group = await chrome.tabGroups.get(id);
              return {
                id: group.id,
                title: group.title || "Untitled Group",
                color: group.color,
                collapsed: group.collapsed,
              };
            } catch (e) {
              console.error("Error getting group:", id, e);
              return null;
            }
          })
        );
        groups = groups.filter((g) => g !== null);
      } catch (e) {
        console.error("Error accessing tabGroups API:", e);
      }
    }

    console.log("Groups found:", groups);

    // Organize tabs by groups
    const groupedTabs = {};
    const ungroupedTabs = [];

    tabs.forEach((tab) => {
      if (
        tab.groupId === -1 &&
        !tab.url.startsWith("chrome://") &&
        !tab.url.startsWith("edge://")
        // && !tab.pinned
      ) {
        ungroupedTabs.push(tab);
      } else {
        if (!groupedTabs[tab.groupId]) {
          groupedTabs[tab.groupId] = [];
        }
        groupedTabs[tab.groupId].push(tab);
      }
    });

    console.log("Grouped tabs:", groupedTabs);
    console.log("Ungrouped tabs count:", ungroupedTabs.length);

    // Build HTML
    let tabsHTML = `<div class="tabs-list-header">
                      ${tabs.length} tabs${
      groups.length > 0 ? ` - ${groups.length} groups` : ""
    }
                    </div>
                    `;

    // Display grouped tabs first
    if (groups.length > 0) {
      groups.forEach((group) => {
        const groupTabs = groupedTabs[group.id] || [];
        tabsHTML += `
        <div class="tabs-list">
          <div class="group-container" data-group-id="${group.id}">
            <div class="group-header drop-zone" data-group-id="${group.id}" style="border-left: 4px solid var(--group-${group.color});">
              <span class="group-title">${group.title}</span>
              <div class="group-header-actions">
                <span class="group-count">${groupTabs.length}</span>
                <button class="rename-group-btn" data-group-id="${group.id}" title="Rename group">Rename</button>
              </div>
            </div>
            <div class="group-tabs">`;

        groupTabs.forEach((tab) => {
          const favicon = tab?.favIconUrl?.startsWith(
            "https://web.whatsapp.com"
          )
            ? "https://web.whatsapp.com/img/favicon/1x/favicon.png"
            : tab?.favIconUrl || "./web.png";
          // 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%235165ea" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
          const title = tab.title || "Untitled";
          const isActive = tab.active ? "active-tab" : "";

          tabsHTML += `
            <div class="tab-item compact ${isActive}" data-tab-id="${tab.id}" draggable="true">
              <img class="tab-favicon" src="${favicon}" alt="">
              <span class="tab-title">${title}</span>
              <span class="drag-handle">Drag</span>
            </div>`;
        });

        tabsHTML += `</div></div>`;
      });
    }

    // Display ungrouped tabs
    if (ungroupedTabs.length > 0) {
      tabsHTML += `
        <div class="group-container" data-group-id="-1">
          <div class="group-header ungrouped-header drop-zone" data-group-id="-1">
            <span class="group-title">Ungrouped</span>
            <span class="group-count">${ungroupedTabs.length}</span>
          </div>
          <div class="group-tabs">`;
      ungroupedTabs.forEach((tab) => {
        const favicon = tab?.favIconUrl?.startsWith("https://web.whatsapp.com")
          ? "https://web.whatsapp.com/img/favicon/1x/favicon.png"
          : tab?.favIconUrl || "./web.png";
        const title = tab.title || "Untitled";
        const isActive = tab.active ? "active-tab" : "";

        tabsHTML += `
          <div class="tab-item compact ${isActive}" data-tab-id="${tab.id}" draggable="true">
            <img class="tab-favicon" src="${favicon}" alt="">
            <span class="tab-title">${title}</span>
            <span class="drag-handle">  &#8942;&#8942;</span>
          </div>`;
      });

      tabsHTML += `</div></div>`;
    }

    tabsHTML += "</div>";
    tabsResultDiv.innerHTML = tabsHTML;

    // Add click handlers for tab items
    document.querySelectorAll(".tab-item").forEach((item) => {
      item.addEventListener("click", async (e) => {
        // Don't navigate if clicking drag handle
        if (e.target.classList.contains("drag-handle")) return;

        const tabId = parseInt(item.getAttribute("data-tab-id"));
        await chrome.tabs.update(tabId, { active: true });
        window.close();
      });
    });

    // Add click handlers for rename buttons
    document.querySelectorAll(".rename-group-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const groupId = parseInt(btn.getAttribute("data-group-id"));
        const newName = prompt("Enter new group name:");
        if (newName !== null && newName.trim() !== "") {
          await chrome.tabGroups.update(groupId, { title: newName.trim() });
          loadAndDisplayTabs();
        }
      });
    });

    // Setup drag and drop
    setupDragAndDrop();
  } catch (error) {
    console.error("Error loading tabs:", error);
    tabsResultDiv.innerHTML = `<p class="error-msg">Error loading tabs: ${error.message}</p>`;
  }
}

// Drag and Drop Setup with Sidebar
function setupDragAndDrop() {
  const tabItems = document.querySelectorAll('.tab-item[draggable="true"]');

  let draggedTabId = null;

  // Tab drag start
  tabItems.forEach((item) => {
    item.addEventListener("dragstart", async (e) => {
      draggedTabId = parseInt(item.getAttribute("data-tab-id"));
      item.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/html", item.innerHTML);

      // Show drag sidebar
      await showDragSidebar();
    });

    item.addEventListener("dragend", (e) => {
      item.classList.remove("dragging");
      draggedTabId = null;

      // Hide drag sidebar
      hideDragSidebar();
    });
  });

  // Store draggedTabId globally for sidebar access
  window.draggedTabId = null;

  tabItems.forEach((item) => {
    item.addEventListener("dragstart", (e) => {
      window.draggedTabId = parseInt(item.getAttribute("data-tab-id"));
    });

    item.addEventListener("dragend", (e) => {
      window.draggedTabId = null;
    });
  });
}

// Show drag sidebar with all groups
async function showDragSidebar() {
  // Get all tabs and groups
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const groupIds = [
    ...new Set(tabs.map((t) => t.groupId).filter((id) => id !== -1)),
  ];

  // Get group details
  let groups = [];
  if (groupIds.length > 0 && chrome.tabGroups) {
    try {
      groups = await Promise.all(
        groupIds.map(async (id) => {
          try {
            const group = await chrome.tabGroups.get(id);
            return {
              id: group.id,
              title: group.title || "Untitled Group",
              color: group.color,
              collapsed: group.collapsed,
            };
          } catch (e) {
            return null;
          }
        })
      );
      groups = groups.filter((g) => g !== null);
    } catch (e) {
      console.error("Error getting groups:", e);
    }
  }

  // Create sidebar HTML
  let sidebarHTML = `
    <div class="drag-sidebar-header">
      Drop tab to move
    </div>
    <div class="drag-sidebar-groups">`;

  // Add groups
  if (groups.length > 0) {
    groups.forEach((group) => {
      sidebarHTML += `
        <div class="sidebar-drop-zone" data-group-id="${group.id}">
          <div class="sidebar-group-indicator" style="background: var(--group-${group.color});"></div>
          <span class="sidebar-group-name">${group.title}</span>
        </div>`;
    });
  }

  // Add ungroup option
  sidebarHTML += `
    <div class="sidebar-drop-zone ungroup-zone" data-group-id="-1">
      <div class="sidebar-group-indicator" style="background: #9e9e9e;"></div>
      <span class="sidebar-group-name">Ungroup</span>
    </div>`;

  sidebarHTML += `</div>`;

  // Create or update sidebar
  let sidebar = document.getElementById("drag-sidebar");
  if (!sidebar) {
    sidebar = document.createElement("div");
    sidebar.id = "drag-sidebar";
    sidebar.className = "drag-sidebar";
    document.body.appendChild(sidebar);
  }

  sidebar.innerHTML = sidebarHTML;
  sidebar.classList.add("visible");

  // Setup drop zones in sidebar
  setupSidebarDropZones();
}

// Hide drag sidebar
function hideDragSidebar() {
  const sidebar = document.getElementById("drag-sidebar");
  if (sidebar) {
    sidebar.classList.remove("visible");
    setTimeout(() => {
      if (sidebar && !sidebar.classList.contains("visible")) {
        sidebar.remove();
      }
    }, 300);
  }
}

// Setup sidebar drop zones
function setupSidebarDropZones() {
  const dropZones = document.querySelectorAll(".sidebar-drop-zone");

  dropZones.forEach((zone) => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      zone.classList.add("sidebar-hover");
    });

    zone.addEventListener("dragleave", (e) => {
      zone.classList.remove("sidebar-hover");
    });

    zone.addEventListener("drop", async (e) => {
      e.preventDefault();
      zone.classList.remove("sidebar-hover");

      const draggedTabId = window.draggedTabId;
      if (!draggedTabId) return;

      const targetGroupId = parseInt(zone.getAttribute("data-group-id"));

      console.log(`Moving tab ${draggedTabId} to group ${targetGroupId}`);

      try {
        if (targetGroupId === -1) {
          // Ungroup the tab
          await chrome.tabs.ungroup(draggedTabId);
        } else {
          // Add tab to group
          await chrome.tabs.group({
            tabIds: [draggedTabId],
            groupId: targetGroupId,
          });
        }

        // Hide sidebar
        hideDragSidebar();

        // Refresh the display
        setTimeout(() => {
          loadAndDisplayTabs();
        }, 200);
      } catch (error) {
        console.error("Error moving tab:", error);
        alert("Error moving tab: " + error.message);
      }
    });
  });
}

// Create new group button
document.getElementById("create-group")?.addEventListener("click", () => {
  const form = document.getElementById("new-group-form");
  form.style.display = form.style.display === "none" ? "block" : "none";
  if (form.style.display === "block") {
    document.getElementById("group-name").focus();
  }
});

// Cancel group creation
document.getElementById("cancel-group")?.addEventListener("click", () => {
  document.getElementById("new-group-form").style.display = "none";
  document.getElementById("group-name").value = "";
});

// Save new group
document.getElementById("save-group")?.addEventListener("click", async () => {
  const groupName = document.getElementById("group-name").value.trim();
  const groupColor = document.getElementById("group-color").value;

  if (!groupName) {
    alert("Please enter a group name");
    return;
  }

  try {
    // Check Chrome version and API availability
    console.log("Chrome object:", chrome);
    console.log("chrome.tabGroups:", chrome.tabGroups);
    console.log("chrome.tabs:", chrome.tabs);

    if (typeof chrome === "undefined") {
      alert("Chrome API is not available");
      return;
    }

    if (typeof chrome.tabs === "undefined") {
      alert("Chrome Tabs API is not available");
      return;
    }

    if (typeof chrome.tabGroups === "undefined") {
      alert(
        "Chrome Tab Groups API is not available. This requires Chrome 89+ and the 'tabGroups' permission in manifest.json"
      );
      return;
    }

    // Get current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    if (!currentTab) {
      alert("No active tab found");
      return;
    }

    console.log("Creating group with tab:", currentTab.id);

    // Create a new group with the current tab
    const groupId = await chrome.tabs.group({ tabIds: [currentTab.id] });

    console.log("Group created with ID:", groupId);

    // Update group properties
    await chrome.tabGroups.update(groupId, {
      title: groupName,
      color: groupColor,
    });

    console.log("Group updated successfully");

    // Reset form
    document.getElementById("new-group-form").style.display = "none";
    document.getElementById("group-name").value = "";

    // Refresh the list
    setTimeout(() => {
      loadAndDisplayTabs();
    }, 300);
  } catch (error) {
    console.error("Full error details:", error);
    alert("Error creating group: " + error.message);
  }
});

// Refresh tabs button
document.getElementById("refresh-tabs")?.addEventListener("click", () => {
  loadAndDisplayTabs();
});

document.getElementById("summarize").addEventListener("click", async () => {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = '<div class="loading"><div class="loader"></div></div>';

  const summaryType = document.getElementById("summary-type").value;

  // Get API key from storage
  chrome.storage.sync.get(["geminiApiKey"], async (result) => {
    if (!result.geminiApiKey) {
      resultDiv.innerHTML =
        "API key not found. Please set your API key in the extension options. or Click Settings to go and add API Key";
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      console.log("Current tab:", tab);

      // Try using scripting API instead of content script
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          try {
            // Try article tag first
            const article = document.querySelector("article");
            if (article && article.innerText.trim().length > 100) {
              return article.innerText.trim();
            }

            // Try main content areas
            const mainContent = document.querySelector(
              "main, .content, .article, .post-content, .entry-content, [role='main']"
            );
            if (mainContent && mainContent.innerText.trim().length > 100) {
              return mainContent.innerText.trim();
            }

            // Fallback to paragraphs
            const paragraphs = Array.from(document.querySelectorAll("p"));
            const text = paragraphs
              .map((p) => p.innerText)
              .join("\n")
              .trim();

            if (text.length > 50) {
              return text;
            }

            // Last resort: body text
            return document.body.innerText.trim();
          } catch (error) {
            console.error("Error extracting text:", error);
            return "";
          }
        },
      });

      const text = injectionResults[0]?.result || "";
      console.log("Extracted text length:", text.length);

      if (!text || text.trim().length === 0) {
        resultDiv.innerText = "Could not extract article text from this page.";
        return;
      }

      try {
        const summary = await getGeminiSummary(
          text,
          summaryType,
          result.geminiApiKey
        );
        resultDiv.innerText = summary;
      } catch (error) {
        console.error("Summary error:", error);
        resultDiv.innerText = `Error: ${
          error.message || "Failed to generate summary."
        }`;
      }
    } catch (error) {
      console.error("Full error:", error);
      resultDiv.innerText = `Error: ${error.message}. Make sure you're on a valid webpage (not chrome:// or extension pages).`;
    }
  });
});

document.getElementById("copy-btn").addEventListener("click", () => {
  const summaryText = document.getElementById("result").innerText;

  if (summaryText && summaryText.trim() !== "") {
    navigator.clipboard
      .writeText(summaryText)
      .then(() => {
        const copyBtn = document.getElementById("copy-btn");
        const originalText = copyBtn.innerText;

        copyBtn.innerText = "Copied!";
        setTimeout(() => {
          copyBtn.innerText = originalText;
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  }
});

async function getGeminiSummary(text, summaryType, apiKey) {
  // Truncate very long texts to avoid API limits (typically around 30K tokens)
  const maxLength = 20000;
  const truncatedText =
    text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

  let prompt;
  switch (summaryType) {
    case "brief":
      prompt = `Provide a brief summary of the following article in 2-3 sentences:\n\n${truncatedText}`;
      break;
    case "detailed":
      prompt = `Provide a detailed summary of the following article, covering all main points and key details:\n\n${truncatedText}`;
      break;
    case "bullets":
      prompt = `Summarize the following article in 5-7 key points. Format each point as a line starting with "- " (dash followed by a space). Do not use asterisks or other bullet symbols, only use the dash. Keep each point concise and focused on a single key insight from the article:\n\n${truncatedText}`;
      break;
    default:
      prompt = `Summarize the following article:\n\n${truncatedText}`;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || "API request failed");
    }

    const data = await res.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No summary available."
    );
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate summary. Please try again later.");
  }
}

document.getElementById("ai-group").addEventListener("click", async () => {
  const resultDiv = document.getElementById("tabs-result");
  resultDiv.innerHTML = '<div class="loading"><div class="loader"></div></div>';

  chrome.storage.sync.get(["geminiApiKey"], async (result) => {
    if (!result.geminiApiKey) {
      resultDiv.innerHTML =
        "API key not found. Please set your API key in the extension options.";
      return;
    }

    try {
      // get all tabs in the current window
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const tabData = tabs.map((t) => ({
        id: t.id,
        title: t.title,
        url: t.url,
      }));

      const prompt = `
        You are an AI assistant that organizes Chrome tabs into topic-based groups.
        Analyze the following tabs (title + URL) and group them logically.
        Output STRICTLY in JSON format as shown below, nothing else:
        [
          { "group": "Group Name", "tabs": [{"title":"title1", "url":"url1"}, {"title":"title2", "url":"url2"}] }
        ]

        Here are the tabs:
        ${tabData.map((t) => `- ${t.title} (${t.url})`).join("\n")}
        `;

      const groups = await getGeminiGroups(prompt, result.geminiApiKey);

      // AI groups to real tabs and group them
      chrome.runtime.sendMessage(
        { type: "GROUP_TABS_AI", data: groups },
        (response) => {
          console.log("Background responded:", response);
        }
      );

      // Refresh the tab list after grouping
      setTimeout(() => {
        loadAndDisplayTabs();
      }, 1000);
    } catch (error) {
      console.error(error);
      resultDiv.innerText = `Error: ${error.message}`;
    }
  });
});

async function getGeminiGroups(prompt, apiKey) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 },
      }),
    }
  );

  if (!res.ok) throw new Error("Failed to call Gemini API");
  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text
      .replace(/```json\s*/i, "") // remove starting ```json
      .replace(/```/g, "") // remove ending ```
      .trim() || "[]";
  // .replace(/^``````$/g, "")
  // .trim() || "[]";

  try {
    // console.log(text);
    return JSON.parse(text);
  } catch {
    console.warn("AI did not return valid JSON:", text);
    return [];
  }
}
