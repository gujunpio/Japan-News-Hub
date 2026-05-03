import * as cheerio from 'cheerio'
import type { CheerioAPI } from 'cheerio'

function randomDelay(minMs: number = 500, maxMs: number = 1200): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchHtml(url: string): Promise<string> {
  await randomDelay()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
    })

    if (!response.ok) {
      const statusText = response.statusText || 'Unknown error'
      if (response.status === 404) {
        throw new Error(`Thread not found (404). Please check the URL: ${url}`)
      }
      if (response.status === 403) {
        throw new Error(`Access denied (403). The server may be blocking the request.`)
      }
      throw new Error(`HTTP ${response.status} ${statusText}: ${url}`)
    }

    const buffer = await response.arrayBuffer()

    if (buffer.byteLength < 500) {
      throw new Error(
        'Server returned an unexpectedly short response. The thread may have been deleted or the URL is incorrect.'
      )
    }

    const decoder = new TextDecoder('shift_jis')
    const html = decoder.decode(buffer)

    if (!html.includes('<html') && !html.includes('<HTML') && !html.includes('<!DOCTYPE')) {
      throw new Error(
        'Server returned an unexpected response (not HTML). The URL may be incorrect.'
      )
    }

    return html
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after 15 seconds.`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export function parseHtml(html: string): CheerioAPI {
  return cheerio.load(html)
}
