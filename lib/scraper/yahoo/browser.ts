import {
  chromium as playwrightChromium,
  type Browser,
  type Page,
} from "playwright-core";

const IS_VERCEL =
  !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const IS_DOCKER = !!process.env.DOCKER || !!process.env.CONTAINER;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export async function launchBrowser(): Promise<Browser> {
  const customPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (customPath) {
    return playwrightChromium.launch({
      executablePath: customPath,
      headless: true,
    });
  }

  if (IS_VERCEL) {
    return launchVercelBrowser();
  }

  if (IS_DOCKER) {
    return playwrightChromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }

  return playwrightChromium.launch({
    headless: true,
    channel: "chromium",
  });
}

async function launchVercelBrowser(): Promise<Browser> {
  try {
    const chromium = (await import("@sparticuz/chromium")).default;
    return await playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  } catch {
    // fall through
  }

  const remoteUrl = process.env.CHROMIUM_REMOTE_URL;
  if (!remoteUrl) {
    throw new Error(
      "Neither @sparticuz/chromium nor CHROMIUM_REMOTE_URL is available."
    );
  }

  const chromiumMin = (await import("@sparticuz/chromium-min")).default;
  return playwrightChromium.launch({
    args: chromiumMin.args,
    executablePath: await chromiumMin.executablePath(remoteUrl),
    headless: true,
  });
}

export async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    userAgent: USER_AGENT,
    locale: "ja-JP",
  });

  await page.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (["image", "font", "media", "stylesheet"].includes(type)) {
      return route.abort();
    }
    const url = route.request().url();
    if (
      url.includes("google-analytics") ||
      url.includes("doubleclick") ||
      url.includes("facebook.net") ||
      url.includes("twitter.com/i/") ||
      url.includes("amazon-adsystem")
    ) {
      return route.abort();
    }
    return route.continue();
  });

  return page;
}

export function randomDelay(min = 1000, max = 3000): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
