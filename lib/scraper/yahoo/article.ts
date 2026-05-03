import type { Page } from "playwright-core";
import type { ArticleData } from "@/types";

export async function scrapeArticle(
  page: Page,
  url: string
): Promise<ArticleData> {
  const title = await scrapeTitle(page);
  const body = await scrapeBody(page);
  const publishedAt = await scrapePublishedAt(page);
  const source = await scrapeSource(page);

  return { title, body, publishedAt, source, url };
}

async function scrapeTitle(page: Page): Promise<string> {
  // og:title is the most reliable source for Yahoo News article titles.
  // The site's <h1> tag contains "Yahoo!ニュース" (site brand), not the article title.
  const ogTitle = await page.$('meta[property="og:title"]');
  if (ogTitle) {
    const content = await ogTitle.getAttribute("content");
    if (content) {
      const cleaned = content
        .replace(/\s*[（(][^）)]*[）)]\s*-\s*Yahoo!ニュース\s*$/, "")
        .replace(/\s*-\s*Yahoo!ニュース\s*$/, "")
        .trim();
      if (cleaned.length > 5) return cleaned;
    }
  }

  // Fallback: try h1 inside <article> (not the site brand h1)
  const articleH1 = await page.$("article h1, main h1");
  if (articleH1) {
    const text = (await articleH1.textContent())?.trim();
    if (text && text.length > 5 && text !== "Yahoo!ニュース") return text;
  }

  // Last resort: page title with same cleanup
  const pageTitle = await page.title();
  return pageTitle
    .replace(/\s*[（(][^）)]*[）)]\s*-\s*Yahoo!ニュース\s*$/, "")
    .replace(/\s*-\s*Yahoo!ニュース\s*$/, "")
    .trim() || "Untitled";
}

async function scrapeBody(page: Page): Promise<string> {
  let paragraphs = await page.$$eval("article p", (els) =>
    els.map((el) => el.textContent?.trim() ?? "").filter(Boolean)
  );

  if (!paragraphs.length) {
    paragraphs = await page.$$eval("div[data-ual-view-type] p", (els) =>
      els.map((el) => el.textContent?.trim() ?? "").filter(Boolean)
    );
  }

  if (!paragraphs.length) {
    paragraphs = await page.$$eval("main p, #uamods p", (els) =>
      els.map((el) => el.textContent?.trim() ?? "").filter(Boolean)
    );
  }

  return paragraphs.join("\n\n");
}

async function scrapePublishedAt(page: Page): Promise<string> {
  // Prefer human-readable text from <time> element (e.g. "5/3(日) 8:45 配信")
  const time = await page.$("time");
  if (time) {
    const text = (await time.textContent())?.trim();
    if (text && text.length > 3) return text;
    // Fall back to datetime attribute if text is empty
    const dt = await time.getAttribute("datetime");
    if (dt) return dt;
  }

  // Fallback: article:published_time meta tag
  const meta = await page.$('meta[property="article:published_time"]');
  if (meta) {
    const content = await meta.getAttribute("content");
    if (content) {
      // Format ISO string to human-readable
      try {
        const d = new Date(content);
        return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
      } catch {
        return content;
      }
    }
  }

  return "";
}

async function scrapeSource(page: Page): Promise<string> {
  const metaAuthor = await page.$('meta[property="article:author"]');
  if (metaAuthor) {
    const content = await metaAuthor.getAttribute("content");
    if (content) return content.trim();
  }

  const footer = await page.$("article footer");
  if (footer) {
    const text = (await footer.textContent())?.trim();
    if (text) return text;
  }

  return "";
}
