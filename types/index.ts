// ── Yahoo News types ─────────────────────────────────────────────────

export interface YahooScrapeRequest {
  url: string;
}

export interface YahooScrapeResponse {
  title: string;
  body: string;
  publishedAt: string;
}

export interface CommentInfoResponse {
  totalComments: number;
  totalPages: number;
  commentsPerPage: number;
}

export interface ScrapeCommentsRequest {
  url: string;
  pages: number[];
}

export interface ScrapeCommentsResponse {
  comments: Comment[];
  totalFetched: number;
  pagesFetched: number[];
}

export interface ArticleData {
  title: string;
  body: string;
  publishedAt: string;
  source: string;
  url: string;
}

export interface Comment {
  content: string;
  likeCount: number;
  replyCount: number;
  postedAt: string;
}

// ── 5ch types ─────────────────────────────────────────────────────────

export interface ThreadData {
  title: string;        // Thread title, with suffix stripped
  opContent: string;    // Content of the first post (OP)
  links: string[];      // Links embedded in the OP content
  totalPosts: number;   // Total number of posts in the thread
  boardName: string;    // Board name extracted from URL
  url: string;          // Original URL
}

export interface PostItem {
  number: number;   // Post sequence number (starts from 2)
  content: string;  // Plain text content
}

export interface PostsData {
  posts: PostItem[];
  totalFetched: number;
  totalAvailable: number;
  limit: number | 'all';
}

export interface GeminiResult {
  text: string;
  model: string;
}

// ── Shared ────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: string;
}
