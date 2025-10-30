function getArticleText() {
  try {
    // Try article tag first
    const article = document.querySelector("article");
    if (article && article.innerText.trim().length > 100) {
      return article.innerText.trim();
    }

    // Try main content areas
    const mainContent = document.querySelector("main, .content, .article, .post-content, .entry-content, [role='main']");
    if (mainContent && mainContent.innerText.trim().length > 100) {
      return mainContent.innerText.trim();
    }

    // Fallback to paragraphs
    const paragraphs = Array.from(document.querySelectorAll("p"));
    const text = paragraphs.map((p) => p.innerText).join("\n").trim();
    
    if (text.length > 50) {
      return text;
    }

    // Last resort: body text
    return document.body.innerText.trim();
  } catch (error) {
    console.error("Error extracting article text:", error);
    return "";
  }
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "GET_ARTICLE_TEXT") {
    const text = getArticleText();
    console.log("Sending text, length:", text.length);
    sendResponse({ text });
    return true; // ← THIS IS CRITICAL - Indicates async response
  }
});
