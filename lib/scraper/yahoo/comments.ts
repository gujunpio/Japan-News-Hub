import type { Page } from "playwright-core";
import type { Comment } from "@/types";
import { randomDelay } from "./browser";

export async function scrapeComments(
  page: Page,
  articleUrl: string,
  pages: number[]
): Promise<{ comments: Comment[]; totalFetched: number; pagesFetched: number[] }> {
  const commentsBaseUrl = articleUrl.replace(/\/+$/, "").replace(/\/comments.*$/, "") + "/comments";
  const allComments: Comment[] = [];
  const pagesFetched: number[] = [];

  for (const pageNum of pages) {
    const pageUrl = `${commentsBaseUrl}?page=${pageNum}&order=recommended`;

    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    await page.waitForSelector(
      'article, div[class*="comment" i], div[class*="Comment"]',
      { timeout: 10000 }
    ).catch(() => {});

    await autoScroll(page);
    await randomDelay(200, 500);

    const pageComments = await extractComments(page);
    allComments.push(...pageComments);
    pagesFetched.push(pageNum);
  }

  const seen = new Set<string>();
  const deduped = allComments.filter((c) => {
    const key = c.content.slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((a, b) => b.likeCount - a.likeCount);

  return {
    comments: deduped,
    totalFetched: deduped.length,
    pagesFetched,
  };
}

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight || totalHeight > 5000) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

async function extractComments(page: Page): Promise<Comment[]> {
  return page.evaluate(() => {
    const results: Array<{
      content: string;
      likeCount: number;
      replyCount: number;
      postedAt: string;
    }> = [];

    const commentSelectors = [
      'article[class*="Comment"]',
      'div[class*="commentItem" i]',
      'li[class*="comment" i]',
      'div[class*="Comment_"]',
      'div[data-comment-id]',
      'ul[class*="comment" i] > li',
    ];

    let commentEls: Element[] = [];
    for (const sel of commentSelectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) {
        commentEls = Array.from(found);
        break;
      }
    }

    if (commentEls.length === 0) {
      const allEls = document.querySelectorAll("article, div, li");
      commentEls = Array.from(allEls).filter((el) => {
        const text = el.textContent || "";
        const hasLikes = text.includes("共感した") || text.includes("共感");
        const hasContent = el.querySelector("p, span");
        const isNotTooDeep = el.querySelectorAll("article, div[class*='comment' i]").length === 0;
        return hasLikes && hasContent && isNotTooDeep && el.children.length > 1;
      });
    }

    for (const el of commentEls) {
      const textSelectors = [
        'p[class*="comment" i]',
        'p[class*="body" i]',
        'p[class*="text" i]',
        'div[class*="body" i]',
        'div[class*="text" i]',
        "p",
      ];
      let content = "";
      for (const sel of textSelectors) {
        const textEl = el.querySelector(sel);
        if (textEl) {
          const text = textEl.textContent?.trim() ?? "";
          if (text.length > 5) {
            content = text;
            break;
          }
        }
      }
      if (!content || content.length < 5) continue;
      if (content.includes("AI要約") || content.includes("AIがピックアップ")) continue;

      let likeCount = 0;
      const likeSelectors = [
        'span[class*="like" i]',
        'span[class*="empathy" i]',
        'span[class*="agree" i]',
        'button[class*="like" i] span',
        'button[class*="empathy" i] span',
      ];
      for (const sel of likeSelectors) {
        const likeEl = el.querySelector(sel);
        if (likeEl) {
          const num = parseInt(likeEl.textContent?.replace(/[^0-9]/g, "") ?? "0");
          if (!isNaN(num) && num > 0) {
            likeCount = num;
            break;
          }
        }
      }
      if (likeCount === 0) {
        const allSpans = el.querySelectorAll("span, button");
        for (const span of allSpans) {
          const t = span.textContent ?? "";
          if (t.includes("共感した") || t.includes("共感")) {
            const num = parseInt(t.replace(/[^0-9]/g, "") || "0");
            if (num > 0) { likeCount = num; break; }
          }
        }
      }

      let replyCount = 0;
      const replySelectors = [
        'span[class*="reply" i]',
        'a[class*="reply" i]',
        'button[class*="reply" i] span',
      ];
      for (const sel of replySelectors) {
        const replyEl = el.querySelector(sel);
        if (replyEl) {
          const num = parseInt(replyEl.textContent?.replace(/[^0-9]/g, "") ?? "0");
          if (!isNaN(num) && num > 0) { replyCount = num; break; }
        }
      }

      let postedAt = "";
      const timeEl = el.querySelector("time");
      if (timeEl) {
        postedAt = timeEl.getAttribute("datetime") ?? timeEl.textContent?.trim() ?? "";
      }

      results.push({ content, likeCount, replyCount, postedAt });
    }

    return results;
  });
}
