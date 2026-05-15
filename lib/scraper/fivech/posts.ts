import { fetchHtml, parseHtml } from './fetcher'
import type { PostItem, PostsData } from '@/types'

function cleanContent(text: string): string {
  return text
    .replace(/>?>?\d+/g, '')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function scrapePosts(
  url: string,
  limit: number | 'all'
): Promise<PostsData> {
  const html = await fetchHtml(url)
  const $ = parseHtml(html)

  const allPosts: PostItem[] = []

  $('div.post').each((_, el) => {
    const numText = $(el)
      .find('.number, .postnum, [class*="number"], .postid')
      .first()
      .text()
    const num = parseInt(numText.match(/(\d+)/)?.[1] ?? '0', 10)
    if (num < 2) return
    const content = cleanContent(
      $(el).find('.message, [class*="message"], p, dd, .post-content').text()
    )
    if (content.length > 0) allPosts.push({ number: num, content })
  })

  if (allPosts.length === 0) {
    $('dt').each((_, el) => {
      const num = parseInt($(el).text().match(/^(\d+)/)?.[1] ?? '0', 10)
      if (num < 2) return
      const content = cleanContent($(el).next('dd').text())
      if (content.length > 0) allPosts.push({ number: num, content })
    })
  }

  if (allPosts.length === 0) {
    $('li[id], article[id]').each((_, el) => {
      const num = parseInt($(el).attr('id') ?? '0', 10)
      if (num < 2) return
      const content = cleanContent($(el).find('p, .message, .text').text())
      if (content.length > 0) allPosts.push({ number: num, content })
    })
  }

  const seen = new Set<number>()
  const deduped = allPosts.filter((post) => {
    if (seen.has(post.number)) return false
    seen.add(post.number)
    return true
  })

  deduped.sort((a, b) => a.number - b.number)

  if (deduped.length === 0) {
    throw new Error('コメントが見つかりませんでした。URLが正しいか確認してください。')
  }

  const totalAvailable = deduped.length
  const sliced = limit === 'all' ? deduped : deduped.slice(0, limit)

  return {
    posts: sliced,
    totalFetched: sliced.length,
    totalAvailable,
    limit,
  }
}
