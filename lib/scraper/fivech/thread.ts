import { fetchHtml, parseHtml } from './fetcher'
import type { ThreadData } from '@/types'

export async function scrapeThread(url: string): Promise<ThreadData> {
  const html = await fetchHtml(url)
  const $ = parseHtml(html)

  let title = ''
  const titleCandidates = [
    $('meta[property="og:title"]').attr('content')?.trim(),
    $('meta[name="twitter:title"]').attr('content')?.trim(),
    $('title').text().trim(),
    $('h1').first().text().trim(),
    $('h2').first().text().trim(),
    $('.title, .thread-title, #title, [class*="thread-title"]').first().text().trim(),
  ]

  for (const candidate of titleCandidates) {
    if (candidate && candidate.length > 0) {
      title = candidate
      break
    }
  }

  title = title
    .replace(/\s*[-–]\s*[^-–]+\s*[-–]\s*5ちゃんねる\s*$/u, '')
    .replace(/\s*[-–]\s*5ちゃんねる\s*$/u, '')
    .replace(/\s*[|｜]\s*(5ch\.io|5ちゃんねる|5ch\.net)\s*$/u, '')
    .trim()

  if (!title) {
    try {
      const u = new URL(url)
      const parts = u.pathname.split('/').filter(Boolean)
      const board = parts[2] || ''
      const threadId = parts[3] || ''
      title = board ? `[${board}] Thread ${threadId}` : `Thread ${threadId}`
    } catch {
      title = 'Unknown Thread'
    }
  }

  let totalPosts = 0
  const bodyText = $('body').text()
  const postCountPatterns = [
    /全\s*(\d+)\s*レス/,
    /(\d+)\s*件のレス/,
    /(\d+)\s*レス/,
    /レス数[：:]\s*(\d+)/,
  ]

  for (const pattern of postCountPatterns) {
    const m = bodyText.match(pattern)
    if (m) {
      totalPosts = parseInt(m[1], 10)
      break
    }
  }

  if (totalPosts === 0) {
    totalPosts =
      $('div.post, .res, dt').length ||
      $('[id^="res"], [id^="post"]').length ||
      $('article').length
  }

  let opContent = ''
  let opElement: ReturnType<typeof $> | null = null

  const opSelectors = [
    'div.post[id="1"] .message',
    'div.post[id="1"] .post-content',
    'div.post[id="1"] p',
    '[data-number="1"] .message',
    '[data-number="1"] .post-content',
    '#res1 .message, #res1 .post-content, #res1 dd',
    '#post1 .message, #post1 .post-content, #post1 dd',
    '.post:first-child .message',
    '.post:first-child .post-content',
    'li:first-child .message',
    'li:first-child .post-content',
  ]

  for (const selector of opSelectors) {
    try {
      const el = $(selector).first()
      const text = el.text().trim()
      if (text && text.length > 0) {
        opContent = text
        opElement = el
        break
      }
    } catch {
      // ignore
    }
  }

  if (!opContent) {
    const firstDt = $('dt').first()
    const dd = firstDt.next('dd')
    const text = dd.text().trim()
    if (text) { opContent = text; opElement = dd }
  }

  if (!opContent) {
    $('p').each((_, el) => {
      const text = $(el).text().trim()
      if (text.length > 20) {
        opContent = text
        opElement = $(el)
        return false
      }
    })
  }

  if (!opContent) opContent = '(Could not extract OP content)'

  let links: string[] = []
  if (opElement) {
    opElement.find('a').each((_, a) => {
      let href = $(a).attr('href')?.trim()
      if (href && !href.startsWith('#') && !href.includes('mailto:')) {
        if (href.startsWith('https://jump.5ch.net/?') || href.startsWith('http://jump.5ch.net/?')) {
          href = href.replace(/^https?:\/\/jump\.5ch\.net\/\?/, '')
        }
        links.push(href)
      }
    })
    links = Array.from(new Set(links))
  }

  let boardName = ''
  try {
    const segments = new URL(url).pathname.split('/')
    boardName = segments[3] || ''
  } catch {
    boardName = ''
  }

  return { title, opContent, links, totalPosts, boardName, url }
}
