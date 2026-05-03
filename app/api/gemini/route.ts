import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/utils/rate-limit'
import type { ApiError } from '@/types'

// Simple proxy route if needed (though Gemini SDK generally works client-side)
// We keep it empty for now or use the client side directly
export async function GET(request: Request) {
  return NextResponse.json({ message: "Gemini proxy not implemented yet" })
}
