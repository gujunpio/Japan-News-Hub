import { NextRequest, NextResponse } from 'next/server'
import { scrapeThread } from '@/lib/scraper/fivech/thread'
import { validateFivechUrl } from '@/lib/utils/validate-url'
import { checkRateLimit, getClientIp } from '@/lib/utils/rate-limit'
import { withTimeout, withRetry } from '@/lib/utils/retry'
import type { ApiError } from '@/types'

export async function POST(request: NextRequest) {
  // 1. Rate limit
  const ip = getClientIp(request)
  const { blocked, resetIn } = checkRateLimit(ip)
  if (blocked) {
    return NextResponse.json<ApiError>(
      { error: `Rate limit exceeded. Please try again in ${resetIn} seconds.` },
      { status: 429 }
    )
  }

  // 2. Parse & validate URL
  let url: string
  try {
    const body = await request.json()
    url = body.url
  } catch {
    return NextResponse.json<ApiError>(
      { error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  const validationError = validateFivechUrl(url)
  if (validationError) {
    return NextResponse.json<ApiError>(
      { error: validationError },
      { status: 400 }
    )
  }

  // 3. Scrape with timeout + retry
  try {
    const data = await withRetry(
      () => withTimeout(scrapeThread(url), 20000, `Timeout scraping: ${url}`),
      { retries: 2 }
    )
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json<ApiError>(
      { error: message },
      { status: 500 }
    )
  }
}
