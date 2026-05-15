// test-fix.mjs
import { scrapeThread } from './lib/scraper/fivech/thread.ts';
import { scrapePosts } from './lib/scraper/fivech/posts.ts';

async function test() {
  const url = 'https://asahi.5ch.io/test/read.cgi/newsplus/1778740684/';
  console.log('Testing scrapeThread...');
  const threadData = await scrapeThread(url);
  console.log('totalPosts:', threadData.totalPosts);
  console.log('boardName:', threadData.boardName);

  console.log('\nTesting scrapePosts...');
  const postsData = await scrapePosts(url, 'all');
  console.log('totalFetched:', postsData.totalFetched);
  console.log('totalAvailable:', postsData.totalAvailable);
}

test().catch(console.error);
