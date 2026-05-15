// Debug script to analyze 5ch HTML structure and post count
import * as cheerio from 'cheerio';

const url = 'https://asahi.5ch.io/test/read.cgi/newsplus/1778766265';

async function debugFetch() {
  console.log(`\n=== Fetching: ${url} ===\n`);

  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  console.log('Status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));
  console.log('Final URL:', response.url);

  const buffer = await response.arrayBuffer();
  console.log('Response size (bytes):', buffer.byteLength);

  // Decode as Shift_JIS
  const decoder = new TextDecoder('shift_jis');
  const html = decoder.decode(buffer);

  const $ = cheerio.load(html);

  // Count elements using the same selectors as posts.ts
  console.log('\n--- Element counts (same selectors as posts.ts) ---');
  console.log('div.post:', $('div.post').length);
  console.log('div[class*="post"]:', $('div[class*="post"]').length);
  console.log('div.post, div[class*="post"]:', $('div.post, div[class*="post"]').length);
  console.log('dt:', $('dt').length);
  console.log('dd:', $('dd').length);
  console.log('li[id]:', $('li[id]').length);
  console.log('article[id]:', $('article[id]').length);
  console.log('.res:', $('.res').length);
  console.log('[id^="res"]:', $('[id^="res"]').length);
  console.log('[id^="post"]:', $('[id^="post"]').length);
  console.log('article:', $('article').length);
  console.log('.message:', $('.message').length);
  console.log('.post-content:', $('.post-content').length);

  // Check for body text patterns used for totalPosts detection
  const bodyText = $('body').text();
  const patterns = [
    /全\s*(\d+)\s*レス/,
    /(\d+)\s*件のレス/,
    /(\d+)\s*レス/,
    /レス数[：:]\s*(\d+)/,
  ];
  console.log('\n--- Post count patterns in body text ---');
  for (const pattern of patterns) {
    const m = bodyText.match(pattern);
    if (m) {
      console.log(`Pattern "${pattern.source}" matched: ${m[1]}`);
    } else {
      console.log(`Pattern "${pattern.source}": no match`);
    }
  }

  // Print the first few div.post elements to see structure
  console.log('\n--- First 3 "div.post, div[class*=post]" elements (outer HTML snippet) ---');
  $('div.post, div[class*="post"]').slice(0, 3).each((i, el) => {
    const outerHtml = $.html(el);
    console.log(`[${i}] class="${$(el).attr('class')}" id="${$(el).attr('id')}"`)
    console.log(outerHtml.substring(0, 400));
    console.log('---');
  });

  // Now simulate what posts.ts actually does
  console.log('\n--- Simulating posts.ts scraping logic ---');
  const allPosts = [];

  // Strategy 1: div.post, div[class*="post"]
  $('div.post, div[class*="post"]').each((_, el) => {
    const numText = $(el)
      .find('.number, .postnum, [class*="number"], .postid')
      .first()
      .text();
    const num = parseInt(numText.match(/(\d+)/)?.[1] ?? '0', 10);
    if (num < 2) return;
    const content = $(el).find('.message, [class*="message"], p, dd, .post-content').text().trim();
    if (content.length > 0) allPosts.push({ number: num, content: content.substring(0, 50) });
  });

  console.log(`Strategy 1 (div.post): found ${allPosts.length} posts`);
  if (allPosts.length > 0) {
    console.log('First 3:', allPosts.slice(0, 3).map(p => `#${p.number}`).join(', '));
    console.log('Last 3:', allPosts.slice(-3).map(p => `#${p.number}`).join(', '));
  }

  // Strategy 2: dt/dd
  if (allPosts.length === 0) {
    $('dt').each((_, el) => {
      const num = parseInt($(el).text().match(/^(\d+)/)?.[1] ?? '0', 10);
      if (num < 2) return;
      const content = $(el).next('dd').text().trim();
      if (content.length > 0) allPosts.push({ number: num, content: content.substring(0, 50) });
    });
    console.log(`Strategy 2 (dt/dd): found ${allPosts.length} posts`);
  }

  // Strategy 3: li[id], article[id]
  if (allPosts.length === 0) {
    $('li[id], article[id]').each((_, el) => {
      const num = parseInt($(el).attr('id') ?? '0', 10);
      if (num < 2) return;
      const content = $(el).find('p, .message, .text').text().trim();
      if (content.length > 0) allPosts.push({ number: num, content: content.substring(0, 50) });
    });
    console.log(`Strategy 3 (li/article): found ${allPosts.length} posts`);
  }

  // Print full HTML structure overview
  console.log('\n--- HTML top-level body children tags ---');
  const childTags = [];
  $('body').children().each((_, el) => {
    const tag = el.type === 'tag' ? el.tagName : el.type;
    const cls = $(el).attr('class') || '';
    const id = $(el).attr('id') || '';
    childTags.push(`<${tag} class="${cls}" id="${id}">`);
  });
  console.log(childTags.slice(0, 20).join('\n'));

  // Check if there are pagination / "next" links
  console.log('\n--- Searching for pagination/navigation links ---');
  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if (href.includes('read.cgi') && (text.includes('次') || text.includes('全部') || text.includes('レス') || /\d+-\d+/.test(href) || href.includes('/l50'))) {
      console.log(`Link: text="${text}" href="${href}"`);
    }
  });

  // Check raw HTML for range indicators
  console.log('\n--- Checking for range indicators in raw HTML ---');
  const rangeMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (rangeMatch) console.log('Title:', rangeMatch[1]);

  // Search for navigation divs
  const navHtml = html.match(/(全部|最新50|次100|前100|1-|書込|レス一覧)[^<]{0,200}/g);
  if (navHtml) {
    console.log('\nNavigation text found:');
    navHtml.slice(0, 10).forEach(n => console.log(' ', n.substring(0, 120)));
  }
}

debugFetch().catch(console.error);
