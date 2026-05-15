// Debug script 2: test the second URL and understand totalPosts detection issue
import * as cheerio from 'cheerio';

const url = 'https://asahi.5ch.io/test/read.cgi/newsplus/1778740684/';

async function test() {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'ja-JP,ja;q=0.9',
    },
  });
  const buffer = await response.arrayBuffer();
  const html = new TextDecoder('shift_jis').decode(buffer);
  const $ = cheerio.load(html);

  console.log('=== URL:', url, '===\n');
  console.log('div.post count:', $('div.post').length);
  console.log('div[class*="post"] count:', $('div[class*="post"]').length);
  console.log('Combined selector count:', $('div.post, div[class*="post"]').length);

  // Simulate EXACT code from posts.ts
  const allPosts = [];
  $('div.post, div[class*="post"]').each((_, el) => {
    const numText = $(el)
      .find('.number, .postnum, [class*="number"], .postid')
      .first()
      .text();
    const num = parseInt(numText.match(/(\d+)/)?.[1] ?? '0', 10);
    if (num < 2) return;
    const content = $(el).find('.message, [class*="message"], p, dd, .post-content').text().trim();
    if (content.length > 0) allPosts.push({ number: num });
  });

  console.log('\nBefore dedup:', allPosts.length, 'posts');

  const seen = new Set();
  const deduped = allPosts.filter(p => {
    if (seen.has(p.number)) return false;
    seen.add(p.number);
    return true;
  });
  deduped.sort((a, b) => a.number - b.number);

  console.log('After dedup:', deduped.length, 'posts');
  if (deduped.length > 0) {
    console.log('First 5:', deduped.slice(0, 5).map(p => '#' + p.number).join(', '));
    console.log('Last 5:', deduped.slice(-5).map(p => '#' + p.number).join(', '));
  }

  // Check totalPosts from thread.ts logic
  const bodyText = $('body').text();
  const postCountPatterns = [
    { pat: /全\s*(\d+)\s*レス/, name: '全Nレス' },
    { pat: /(\d+)\s*件のレス/, name: 'N件のレス' },
    { pat: /(\d+)\s*レス/, name: 'Nレス' },
    { pat: /レス数[：:]\s*(\d+)/, name: 'レス数:N' },
  ];

  console.log('\n--- totalPosts pattern matching ---');
  let totalPosts = 0;
  for (const { pat, name } of postCountPatterns) {
    const m = bodyText.match(pat);
    if (m) {
      console.log(`Pattern "${name}" matched: ${m[1]} (full match: "${m[0]}")`);
      if (totalPosts === 0) totalPosts = parseInt(m[1], 10);
    } else {
      console.log(`Pattern "${name}": no match`);
    }
  }

  console.log('\ntotalPosts (from pattern):', totalPosts);
  console.log('Actual div.post count:', $('div.post').length);

  // Show what getLimitOptions would produce
  const totalAvailable = totalPosts - 1; // from FiveChScraper.tsx: getLimitOptions(threadData.totalPosts - 1)
  const fixed = [];
  for (let n = 50; n < totalAvailable && n <= 500; n += 50) {
    fixed.push(n);
  }
  fixed.push('all');
  console.log('\ngetLimitOptions(' + totalAvailable + '):', JSON.stringify(fixed));
  console.log('\n==> PROBLEM: totalPosts=' + totalPosts + ' means user sees limit options:', JSON.stringify(fixed));
  console.log('==> Even selecting "all" would only get', totalAvailable, 'posts');
  console.log('==> But actual posts available:', $('div.post').length - 1, '(minus OP)');

  // Find ALL "Nレス" matches to understand false positive
  console.log('\n--- All "Nレス" matches in body text ---');
  const allMatches = bodyText.match(/\d+\s*レス/g);
  if (allMatches) {
    console.log('Found matches:', allMatches.slice(0, 10).join(' | '));
  }

  // Check the fallback: counting elements directly
  console.log('\n--- Fallback totalPosts (element count) ---');
  const fallback = $('div.post, .res, dt').length ||
    $('[id^="res"], [id^="post"]').length ||
    $('article').length;
  console.log('$("div.post, .res, dt").length:', $('div.post, .res, dt').length);
  console.log('fallback totalPosts:', fallback);
}

test().catch(console.error);
