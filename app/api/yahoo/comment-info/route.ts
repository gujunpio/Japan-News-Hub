import { NextResponse } from "next/server";
import { launchBrowser, createPage } from "@/lib/scraper/yahoo/browser";
import { validateYahooNewsUrl } from "@/lib/utils/validate-url";
import { checkRateLimit, getClientIp } from "@/lib/utils/rate-limit";
import { withRetry, withTimeout } from "@/lib/utils/retry";
import type { CommentInfoResponse, ApiError } from "@/types";

export const maxDuration = 30;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip);
  if (limit.blocked) {
    return NextResponse.json<ApiError>(
      { error: "Too many requests.", details: `Resets in ${Math.ceil(limit.resetIn / 1000)}s.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.resetIn / 1000)) } }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json<ApiError>(
      { error: "Request body must be JSON with a 'url' field." },
      { status: 400 }
    );
  }

  const validationError = validateYahooNewsUrl(body.url);
  if (validationError) {
    return NextResponse.json<ApiError>({ error: validationError }, { status: 400 });
  }

  const url = (body.url as string).trim();

  try {
    const result = await withTimeout(
      withRetry(() => detectCommentInfo(url), { maxRetries: 1, baseDelayMs: 1000 }),
      15000,
      "Timed out detecting comment info."
    );
    return NextResponse.json<CommentInfoResponse>(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json<ApiError>(
      { error: "Failed to detect comment info.", details: message },
      { status: 500 }
    );
  }
}

const COMMENTS_PER_PAGE = 10;

async function detectCommentInfo(articleUrl: string): Promise<CommentInfoResponse> {
  let browser;
  try {
    browser = await launchBrowser();
    const page = await createPage(browser);

    const commentsUrl = articleUrl.replace(/\/+$/, "") + "/comments?page=1";
    await page.goto(commentsUrl, { waitUntil: "domcontentloaded", timeout: 20000 });

    await page.waitForSelector(
      'div[class*="comment" i], div[class*="Comment"], #contentsWrap',
      { timeout: 10000 }
    ).catch(() => {});

    const info = await page.evaluate(() => {
      const text = document.body.innerText;

      const rangeMatch = text.match(/[\d,]+[〜～][\d,]+件\s*\/\s*([\d,]+)件/);
      if (rangeMatch) {
        return { totalComments: parseInt(rangeMatch[1].replace(/,/g, "")) };
      }

      const countMatch = text.match(/([\d,]+)件の?コメント/) || text.match(/コメント\s*([\d,]+)件/);
      if (countMatch) {
        return { totalComments: parseInt(countMatch[1].replace(/,/g, "")) };
      }

      const allNumbers = text.match(/(\d{2,})\s*件/g);
      if (allNumbers && allNumbers.length > 0) {
        const nums = allNumbers.map((s) => parseInt(s.replace(/[^0-9]/g, "")));
        return { totalComments: Math.max(...nums) };
      }

      return { totalComments: 0 };
    });

    const totalComments = info.totalComments;
    const totalPages = totalComments > 0 ? Math.ceil(totalComments / COMMENTS_PER_PAGE) : 0;

    return {
      totalComments,
      totalPages,
      commentsPerPage: COMMENTS_PER_PAGE,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
