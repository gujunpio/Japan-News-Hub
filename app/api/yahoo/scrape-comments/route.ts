import { NextResponse } from "next/server";
import { launchBrowser, createPage } from "@/lib/scraper/yahoo/browser";
import { scrapeComments } from "@/lib/scraper/yahoo/comments";
import { validateYahooNewsUrl } from "@/lib/utils/validate-url";
import { checkRateLimit, getClientIp } from "@/lib/utils/rate-limit";
import { withRetry, withTimeout } from "@/lib/utils/retry";
import type { ScrapeCommentsRequest, ScrapeCommentsResponse, ApiError } from "@/types";

export const maxDuration = 60; // Extracted comments might take longer

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip);
  if (limit.blocked) {
    return NextResponse.json<ApiError>(
      {
        error: "Too many requests. Please wait before trying again.",
        details: `Rate limit: 10 requests/minute. Resets in ${Math.ceil(limit.resetIn / 1000)}s.`,
      },
      { status: 429 }
    );
  }

  let body: ScrapeCommentsRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (!body.url || !Array.isArray(body.pages) || body.pages.length === 0) {
    return NextResponse.json<ApiError>(
      { error: "Invalid request. 'url' and a non-empty 'pages' array are required." },
      { status: 400 }
    );
  }

  if (body.pages.length > 5) {
    return NextResponse.json<ApiError>(
      { error: "Too many pages requested. Max 5 pages per request." },
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

  try {
    const result = await withTimeout(
      performScrapeComments(body.url, body.pages),
      55000,
      "Scraping timed out after 55 seconds."
    );

    return NextResponse.json<ScrapeCommentsResponse>(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unknown error occurred.";
    const status = message.toLowerCase().includes("timeout") ? 408 : 500;
    
    return NextResponse.json<ApiError>(
      { error: "Failed to scrape comments.", details: message },
      { status }
    );
  }
}

async function performScrapeComments(
  url: string,
  pages: number[]
): Promise<ScrapeCommentsResponse> {
  let browser;
  try {
    browser = await launchBrowser();
    const page = await createPage(browser);
    return await scrapeComments(page, url, pages);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
