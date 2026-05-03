import { NextResponse } from "next/server";
import { launchBrowser, createPage, randomDelay } from "@/lib/scraper/yahoo/browser";
import { scrapeArticle } from "@/lib/scraper/yahoo/article";
import { validateYahooNewsUrl } from "@/lib/utils/validate-url";
import { checkRateLimit, getClientIp } from "@/lib/utils/rate-limit";
import { withRetry, withTimeout } from "@/lib/utils/retry";
import type { YahooScrapeResponse, ApiError } from "@/types";

export const maxDuration = 30;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip);
  if (limit.blocked) {
    return NextResponse.json<ApiError>(
      {
        error: "Too many requests. Please wait before trying again.",
        details: `Rate limit: 10 requests/minute. Resets in ${Math.ceil(limit.resetIn / 1000)}s.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.resetIn / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
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
    return NextResponse.json<ApiError>(
      { error: validationError },
      { status: 400 }
    );
  }

  const url = (body.url as string).trim();

  try {
    const result = await withTimeout(
      withRetry(() => performScrape(url), {
        maxRetries: 2,
        baseDelayMs: 1000,
        onRetry: (attempt, err) => {
          console.log(`[yahoo/scrape] Retry ${attempt} for ${url}: ${err.message}`);
        },
      }),
      28000,
      "Scraping timed out after 28 seconds."
    );

    return NextResponse.json<YahooScrapeResponse>(result, {
      headers: { "X-RateLimit-Remaining": String(limit.remaining) },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unknown error occurred.";

    if (message.toLowerCase().includes("timeout")) {
      return NextResponse.json<ApiError>(
        { error: "Page load timed out. The article may be unavailable.", details: message },
        { status: 408 }
      );
    }

    return NextResponse.json<ApiError>(
      { error: "Failed to scrape article after retries.", details: message },
      { status: 500 }
    );
  }
}

async function performScrape(url: string): Promise<YahooScrapeResponse> {
  let browser;
  try {
    browser = await launchBrowser();
    const page = await createPage(browser);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page
      .waitForSelector("article, div[data-ual-view-type], main", { timeout: 10000 })
      .catch(() => {});
    await randomDelay(500, 1500);

    const articleData = await scrapeArticle(page, url);

    return {
      title: articleData.title,
      body: articleData.body,
      publishedAt: articleData.publishedAt,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
