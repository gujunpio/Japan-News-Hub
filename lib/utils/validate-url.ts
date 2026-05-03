/**
 * Validate that a given string is a valid Yahoo Japan News article URL.
 * Returns `null` when valid, or an error message string when invalid.
 */
export function validateYahooNewsUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") {
    return "URL is required and must be a string.";
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return "URL must not be empty.";
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "Invalid URL format.";
  }

  if (parsed.hostname !== "news.yahoo.co.jp") {
    return `URL must be from news.yahoo.co.jp. Received: ${parsed.hostname}`;
  }

  if (!parsed.pathname.startsWith("/articles/")) {
    return "URL must point to a Yahoo Japan News article (/articles/...).";
  }

  return null; // valid
}

/**
 * Extract the article ID from a Yahoo Japan News URL.
 */
export function extractArticleId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/articles\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Validate a 5ch.io thread URL.
 * @returns null if valid, or an error message string if invalid.
 */
export function validateFivechUrl(rawUrl: string): string | null {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    return "Invalid URL format.";
  }

  if (!parsed.hostname.endsWith(".5ch.io") || parsed.hostname === "5ch.io") {
    return "URL must be from a 5ch.io subdomain (e.g., news.5ch.io).";
  }

  if (!parsed.pathname.includes("/test/read.cgi/")) {
    return "URL must contain /test/read.cgi/ path.";
  }

  const threadPattern = /\/test\/read\.cgi\/[^/]+\/\d+/;
  if (!threadPattern.test(parsed.pathname)) {
    return "URL must contain a numeric thread ID.";
  }

  return null;
}

/**
 * Extract board name and thread ID from a valid 5ch.io URL.
 */
export function extractThreadInfo(url: string): { board: string; threadId: string } {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/\/test\/read\.cgi\/([^/]+)\/(\d+)/);

  if (!match) {
    throw new Error(`Cannot extract thread info from URL: ${url}`);
  }

  return {
    board: match[1],
    threadId: match[2],
  };
}
