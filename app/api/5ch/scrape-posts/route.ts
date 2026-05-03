import { NextRequest, NextResponse } from 'next/server'
import { scrapePosts } from '@/lib/scraper/fivech/posts'
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

  // 2. Parse body & validate URL
  let url: string
  let limit: number | 'all'
  try {
    const body = await request.json()
    url = body.url
    limit = body.limit
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

  // 3. Validate limit
  if (limit !== 'all') {
    const n = Number(limit)
    if (!Number.isInteger(n) || n <= 0 || n % 50 !== 0) {
      return NextResponse.json<ApiError>(
        { error: 'Limit must be a multiple of 50 or "all"' },
        { status: 400 }
      )
    }
    limit = n
  }

  // 4. Scrape posts with timeout + retry
  try {
    const data = await withRetry(
      () => withTimeout(scrapePosts(url, limit), 30000, `Timeout scraping posts: ${url}`),
      { retries: 1 }
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
