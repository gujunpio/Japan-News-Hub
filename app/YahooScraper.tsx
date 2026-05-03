"use client";

import { useState, useCallback } from "react";
import { translateText } from "@/lib/translate";
import {
  getApiKey,
  getModel,
  summarizeArticle,
  summarizeComments,
} from "@/lib/gemini/client";
import type {
  YahooScrapeResponse,
  ScrapeCommentsResponse,
  CommentInfoResponse,
  Comment,
} from "@/types";

type Status = "idle" | "loading" | "success" | "error";

interface YahooScraperProps {
  setSettingsOpen: (open: boolean) => void;
}

export default function YahooScraper({ setSettingsOpen }: YahooScraperProps) {
  const [url, setUrl] = useState("");
  const [selectedPages, setSelectedPages] = useState<number[]>([]);

  const [articleData, setArticleData] = useState<YahooScrapeResponse | null>(null);
  const [commentsData, setCommentsData] = useState<ScrapeCommentsResponse | null>(null);
  const [commentInfo, setCommentInfo] = useState<CommentInfoResponse | null>(null);

  const [geminiArticleResult, setGeminiArticleResult] = useState("");
  const [geminiCommentsResult, setGeminiCommentsResult] = useState("");
  const [geminiArticleStatus, setGeminiArticleStatus] = useState<Status>("idle");
  const [geminiCommentsStatus, setGeminiCommentsStatus] = useState<Status>("idle");
  const [geminiArticleError, setGeminiArticleError] = useState("");
  const [geminiCommentsError, setGeminiCommentsError] = useState("");

  const [activeTab, setActiveTab] = useState<"article" | "comments" | "gemini">("article");
  const [scrapeStatus, setScrapeStatus] = useState<Status>("idle");
  const [commentsStatus, setCommentsStatus] = useState<Status>("idle");
  const [commentInfoStatus, setCommentInfoStatus] = useState<Status>("idle");
  const [scrapeError, setScrapeError] = useState("");
  const [commentsError, setCommentsError] = useState("");
  const [commentInfoError, setCommentInfoError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const handleScrape = useCallback(async () => {
    if (!url.trim()) return;
    setScrapeStatus("loading");
    setScrapeError("");
    setArticleData(null);
    setStatusMessage("Launching browser…");
    setGeminiArticleResult("");
    setGeminiArticleStatus("idle");

    try {
      setStatusMessage("Navigating to page…");
      const res = await fetch("/api/yahoo/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      setStatusMessage("Extracting content…");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setArticleData(data as YahooScrapeResponse);
      setScrapeStatus("success");
      setActiveTab("article");
      
      setCommentInfoStatus("loading");
      setCommentInfoError("");
      setCommentInfo(null);
      setSelectedPages([]);
      
      try {
        const cRes = await fetch("/api/yahoo/comment-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });
        const cData = await cRes.json();
        if (!cRes.ok) throw new Error(cData.error || `HTTP ${cRes.status}`);

        const info = cData as CommentInfoResponse;
        setCommentInfo(info);
        setCommentInfoStatus("success");

        const autoSelect = Array.from(
          { length: Math.min(2, info.totalPages) },
          (_, i) => i + 1
        );
        setSelectedPages(autoSelect);
      } catch (cerr) {
        setCommentInfoError(cerr instanceof Error ? cerr.message : "Unknown error");
        setCommentInfoStatus("error");
      }
      setStatusMessage("");
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : "Unknown error");
      setScrapeStatus("error");
      setStatusMessage("");
    }
  }, [url]);

  const handleScrapeComments = useCallback(async () => {
    if (!url.trim() || selectedPages.length === 0) return;
    setCommentsStatus("loading");
    setCommentsError("");
    setCommentsData(null);
    setStatusMessage("Loading comments…");
    setGeminiCommentsResult("");
    setGeminiCommentsStatus("idle");

    const BATCH_SIZE = 5;
    const batches: number[][] = [];
    for (let i = 0; i < selectedPages.length; i += BATCH_SIZE) {
      batches.push(selectedPages.slice(i, i + BATCH_SIZE));
    }

    const allComments: Comment[] = [];
    const allPagesFetched: number[] = [];
    let failedBatch: number | null = null;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      setStatusMessage(
        `Fetching batch ${i + 1}/${batches.length} (pages ${batch.join(", ")})…`
      );

      try {
        const res = await fetch("/api/yahoo/scrape-comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim(), pages: batch }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

        allComments.push(...(data.comments ?? []));
        allPagesFetched.push(...(data.pagesFetched ?? []));

        // Deduplicate locally to ensure unique comments
        const seen = new Set<string>();
        const deduped = allComments.filter((c) => {
          const key = c.content.slice(0, 80);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        
        deduped.sort((a, b) => b.likeCount - a.likeCount);

        setCommentsData({
          comments: deduped,
          totalFetched: deduped.length,
          pagesFetched: allPagesFetched,
        });
      } catch (err) {
        failedBatch = i + 1;
        const msg = err instanceof Error ? err.message : "Unknown error";
        setCommentsError(
          `Batch ${failedBatch}/${batches.length} failed (pages ${batch.join(", ")}): ${msg}. ` +
          `${allComments.length} comments from ${allPagesFetched.length} pages were saved.`
        );
        break;
      }
    }

    if (allComments.length > 0) {
      setCommentsStatus("success");
      setActiveTab("comments");
    } else {
      setCommentsStatus("error");
    }
    setStatusMessage("");
  }, [url, selectedPages]);

  const handleGeminiArticle = useCallback(async () => {
    if (!getApiKey()) { setSettingsOpen(true); return; }
    if (!articleData?.body) return;
    setGeminiArticleStatus("loading");
    setGeminiArticleError("");
    setGeminiArticleResult("");
    try {
      const result = await summarizeArticle(articleData.body, getModel());
      setGeminiArticleResult(result);
      setGeminiArticleStatus("success");
    } catch (err) {
      setGeminiArticleError(err instanceof Error ? err.message : "Failed");
      setGeminiArticleStatus("error");
    }
  }, [articleData, setSettingsOpen]);

  const handleGeminiComments = useCallback(async () => {
    if (!getApiKey()) { setSettingsOpen(true); return; }
    if (!commentsData?.comments?.length) return;
    setGeminiCommentsStatus("loading");
    setGeminiCommentsError("");
    setGeminiCommentsResult("");
    try {
      const result = await summarizeComments(commentsData.comments, getModel());
      setGeminiCommentsResult(result);
      setGeminiCommentsStatus("success");
    } catch (err) {
      setGeminiCommentsError(err instanceof Error ? err.message : "Failed");
      setGeminiCommentsStatus("error");
    }
  }, [commentsData, setSettingsOpen]);

  const togglePage = (page: number) => {
    setSelectedPages((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page].sort((a, b) => a - b)
    );
  };

  const selectAllPages = () => {
    if (!commentInfo) return;
    setSelectedPages(Array.from({ length: commentInfo.totalPages }, (_, i) => i + 1));
  };

  const clearAllPages = () => setSelectedPages([]);

  const isLoading = scrapeStatus === "loading" || commentsStatus === "loading" || commentInfoStatus === "loading";
  const hasApiKey = !!getApiKey();

  return (
    <div className="main-grid">
      <aside>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title"><span className="icon">🔗</span> Article URL</div>
          <div className="input-group">
            <label className="input-label" htmlFor="url-input">Yahoo Japan News URL</label>
            <input
              id="url-input"
              className="input-field"
              type="url"
              placeholder="https://news.yahoo.co.jp/articles/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScrape()}
              disabled={isLoading}
            />
          </div>
          <button
            id="btn-scrape"
            className="btn btn-primary"
            onClick={handleScrape}
            disabled={!url.trim() || isLoading}
          >
            {scrapeStatus === "loading" ? (
              <><span className="spinner" /> Scraping…</>
            ) : (
              <>🚀 Scrape Article</>
            )}
          </button>
          {scrapeError && <div className="error-message fade-in" style={{ marginTop: 12 }}>{scrapeError}</div>}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title"><span className="icon">💬</span> Comments</div>
          {commentInfo && (
            <div className="fade-in" style={{ marginBottom: 16 }}>
              <div className="comment-info-badge">
                <span>📊 {commentInfo.totalComments.toLocaleString()} comments</span>
                <span>·</span>
                <span>{commentInfo.totalPages} pages</span>
                <span>·</span>
                <span>{commentInfo.commentsPerPage}/page</span>
              </div>
              <label className="input-label" style={{ marginTop: 12 }}>
                Select Pages ({selectedPages.length} of {commentInfo.totalPages})
              </label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button className="btn-mini" onClick={selectAllPages} disabled={isLoading}>
                  Select All
                </button>
                <button className="btn-mini" onClick={clearAllPages} disabled={isLoading}>
                  Clear
                </button>
              </div>
              <div className="checkbox-group">
                {Array.from({ length: commentInfo.totalPages }, (_, i) => i + 1).map((pg) => (
                  <label key={pg} className={`checkbox-item ${selectedPages.includes(pg) ? "active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={selectedPages.includes(pg)}
                      onChange={() => togglePage(pg)}
                      disabled={isLoading}
                    />
                    {pg}
                  </label>
                ))}
              </div>
              <button
                id="btn-scrape-comments"
                className="btn btn-primary"
                onClick={handleScrapeComments}
                disabled={selectedPages.length === 0 || isLoading}
                style={{ marginTop: 12 }}
              >
                {commentsStatus === "loading" ? (
                  <><span className="spinner" /> Fetching…</>
                ) : (
                  <>💬 Fetch {selectedPages.length} {selectedPages.length === 1 ? "page" : "pages"} (~{selectedPages.length * (commentInfo?.commentsPerPage ?? 10)} comments)</>
                )}
              </button>
            </div>
          )}
          {commentsError && <div className="error-message fade-in" style={{ marginTop: 12 }}>{commentsError}</div>}
        </div>

        {isLoading && statusMessage && (
          <div className="card fade-in" style={{ marginBottom: 20 }}>
            <div className="loading-status">
              <span className="spinner" />
              <span>{statusMessage}</span>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-title"><span className="icon">✨</span> Gemini AI</div>
          {hasApiKey ? (
            <p className="settings-hint" style={{ margin: 0 }}>
              ✓ API key configured. Use the Gemini tab to analyze.
            </p>
          ) : (
            <p className="settings-hint" style={{ margin: 0 }}>
              Set up your API key in{" "}
              <button onClick={() => setSettingsOpen(true)} className="link-btn">Settings</button>
              {" "}to enable Gemini analysis.
            </p>
          )}
        </div>
      </aside>

      <main>
        <div className="card">
          <div className="tabs">
            {([
              { key: "article", label: "📄 Article", badge: null },
              { key: "comments", label: "💬 Comments", badge: commentsData ? `${commentsData.totalFetched}` : null },
              { key: "gemini", label: "✨ Gemini", badge: null },
            ] as const).map((t) => (
              <button
                key={t.key}
                className={`tab ${activeTab === t.key ? "active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
                {t.badge && <span className="tab-badge">{t.badge}</span>}
              </button>
            ))}
          </div>

          {activeTab === "article" && <ArticleTab data={articleData} status={scrapeStatus} />}
          {activeTab === "comments" && <CommentsTab data={commentsData} status={commentsStatus} />}
          {activeTab === "gemini" && (
            <GeminiTab
              articleData={articleData}
              commentsData={commentsData}
              articleResult={geminiArticleResult}
              commentsResult={geminiCommentsResult}
              articleStatus={geminiArticleStatus}
              commentsStatus={geminiCommentsStatus}
              articleError={geminiArticleError}
              commentsError={geminiCommentsError}
              onAnalyzeArticle={handleGeminiArticle}
              onAnalyzeComments={handleGeminiComments}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const text = getText();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={handleCopy}>
      {copied ? "✓ Copied!" : "📋 Copy"}
    </button>
  );
}

function ArticleTab({ data, status }: { data: YahooScrapeResponse | null; status: Status }) {
  const [translatedBody, setTranslatedBody] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  if (status === "loading") return <LoadingPlaceholder message="Scraping article content…" />;
  if (!data) return <EmptyPlaceholder icon="📄" message="Enter a URL and click Scrape Article to get started." />;

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const res = await translateText(data.body, "vi");
      setTranslatedBody(res);
    } catch (e) {
      console.error(e);
    }
    setIsTranslating(false);
  };

  return (
    <div className="fade-in">
      <div className="output-toolbar">
        <div className="output-stats">
          {data.body.length.toLocaleString()} chars · {data.publishedAt || "Date unknown"}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={`btn-translate ${isTranslating ? 'translating' : translatedBody ? 'translated' : ''}`} onClick={handleTranslate} disabled={isTranslating || !!translatedBody}>
            {isTranslating ? <><span className="spinner-sm" /> Translating...</> : translatedBody ? "✓ Translated" : "🌐 Translate to VI"}
          </button>
          <CopyButton getText={() => `${data.title}\n\nPublished: ${data.publishedAt}\n\n${data.body}${translatedBody ? `\n\n--- Translation ---\n\n${translatedBody}` : ""}`} />
        </div>
      </div>
      <div className="output-content">
        <h2 className="article-title">{data.title}</h2>
        {data.publishedAt && <div className="article-date">Published: {data.publishedAt}</div>}
        <div className="article-body">{data.body || "No article body extracted."}</div>
        {translatedBody && <div className="translated-box fade-in">{translatedBody}</div>}
      </div>
    </div>
  );
}

function CommentsTab({ data, status }: { data: ScrapeCommentsResponse | null; status: Status }) {
  if (status === "loading") return <LoadingPlaceholder message="Fetching comments…" />;
  if (!data) return <EmptyPlaceholder icon="💬" message="Detect comments first, then select pages and fetch." />;

  if (data.comments.length === 0) {
    return (
      <div className="output-content fade-in" style={{ color: "var(--text-muted)" }}>
        No comments were found for this article.
      </div>
    );
  }

  const getText = () =>
    data.comments
      .map((c, i) => `#${i + 1} [${c.likeCount} likes] ${c.content}`)
      .join("\n\n");

  return (
    <div className="fade-in">
      <div className="output-toolbar">
        <div className="output-stats">
          {data.totalFetched} comments · pages {data.pagesFetched?.join(", ")} · sorted by likes
        </div>
        <CopyButton getText={getText} />
      </div>
      <div className="output-content" style={{ padding: 12 }}>
        {data.comments.map((comment: Comment, i: number) => (
          <div key={i} className="comment-card">
            <div className="comment-rank">#{i + 1}</div>
            <div className="comment-content">{comment.content}</div>
            <div className="comment-meta">
              <span className="likes">👍 {comment.likeCount.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeminiTab({
  articleData, commentsData,
  articleResult, commentsResult,
  articleStatus, commentsStatus,
  articleError, commentsError,
  onAnalyzeArticle, onAnalyzeComments,
}: {
  articleData: YahooScrapeResponse | null;
  commentsData: ScrapeCommentsResponse | null;
  articleResult: string; commentsResult: string;
  articleStatus: Status; commentsStatus: Status;
  articleError: string; commentsError: string;
  onAnalyzeArticle: () => void; onAnalyzeComments: () => void;
}) {
  const [articleLang, setArticleLang] = useState("vi");
  const [commentsLang, setCommentsLang] = useState("vi");
  const [translatedArticle, setTranslatedArticle] = useState("");
  const [translatedComments, setTranslatedComments] = useState("");
  const [isTranslatingArticle, setIsTranslatingArticle] = useState(false);
  const [isTranslatingComments, setIsTranslatingComments] = useState(false);

  const handleTranslateArticle = async () => {
    if (!articleResult) return;
    setIsTranslatingArticle(true);
    try {
      const res = await translateText(articleResult, articleLang);
      setTranslatedArticle(res);
    } catch (e) {}
    setIsTranslatingArticle(false);
  };

  const handleTranslateComments = async () => {
    if (!commentsResult) return;
    setIsTranslatingComments(true);
    try {
      const res = await translateText(commentsResult, commentsLang);
      setTranslatedComments(res);
    } catch (e) {}
    setIsTranslatingComments(false);
  };

  return (
    <div className="gemini-panel fade-in">
      <div className="gemini-section">
        <div className="gemini-section-header">
          <div>
            <h3 className="gemini-section-title">📝 Summarize Article</h3>
            <p className="gemini-section-desc">
              {articleData ? "Generate a concise summary using Gemini AI." : "Scrape an article first."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-gemini" onClick={onAnalyzeArticle} disabled={!articleData?.body || articleStatus === "loading"}>
              {articleStatus === "loading" ? (<><span className="spinner" /> Analyzing…</>) : (<>✨ Summarize</>)}
            </button>
          </div>
        </div>
        {articleError && <div className="error-message" style={{ marginTop: 12 }}>{articleError}</div>}
        {articleResult && (
          <div className="gemini-result fade-in">
            <div className="output-toolbar">
              <div className="output-stats">{articleResult.length.toLocaleString()} chars</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select className="input-field" style={{ padding: "4px 8px", height: 32 }} value={articleLang} onChange={(e) => setArticleLang(e.target.value)}>
                  <option value="vi">Vietnamese (vi)</option>
                  <option value="en">English (en)</option>
                </select>
                <button className={`btn-translate ${isTranslatingArticle ? 'translating' : translatedArticle ? 'translated' : ''}`} onClick={handleTranslateArticle} disabled={isTranslatingArticle || !articleResult || !!translatedArticle}>
                  {isTranslatingArticle ? <><span className="spinner-sm" /> Translating...</> : translatedArticle ? "✓ Translated" : "🌐 Translate"}
                </button>
                <CopyButton getText={() => `${articleResult}${translatedArticle ? `\n\n--- Translation ---\n\n${translatedArticle}` : ""}`} />
              </div>
            </div>
            <div className="gemini-output">{articleResult}</div>
            {translatedArticle && <div className="translated-box fade-in">{translatedArticle}</div>}
          </div>
        )}
      </div>

      <div className="gemini-divider" />

      <div className="gemini-section">
        <div className="gemini-section-header">
          <div>
            <h3 className="gemini-section-title">💬 Analyze Comments</h3>
            <p className="gemini-section-desc">
              {commentsData?.comments?.length
                ? `Analyze ${commentsData.totalFetched} comments for trends and opinions.`
                : "Fetch comments first."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-gemini" onClick={onAnalyzeComments} disabled={!commentsData?.comments?.length || commentsStatus === "loading"}>
              {commentsStatus === "loading" ? (<><span className="spinner" /> Analyzing…</>) : (<>✨ Analyze</>)}
            </button>
          </div>
        </div>
        {commentsError && <div className="error-message" style={{ marginTop: 12 }}>{commentsError}</div>}
        {commentsResult && (
          <div className="gemini-result fade-in">
            <div className="output-toolbar">
              <div className="output-stats">{commentsResult.length.toLocaleString()} chars</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select className="input-field" style={{ padding: "4px 8px", height: 32 }} value={commentsLang} onChange={(e) => setCommentsLang(e.target.value)}>
                  <option value="vi">Vietnamese (vi)</option>
                  <option value="en">English (en)</option>
                </select>
                <button className={`btn-translate ${isTranslatingComments ? 'translating' : translatedComments ? 'translated' : ''}`} onClick={handleTranslateComments} disabled={isTranslatingComments || !commentsResult || !!translatedComments}>
                  {isTranslatingComments ? <><span className="spinner-sm" /> Translating...</> : translatedComments ? "✓ Translated" : "🌐 Translate"}
                </button>
                <CopyButton getText={() => `${commentsResult}${translatedComments ? `\n\n--- Translation ---\n\n${translatedComments}` : ""}`} />
              </div>
            </div>
            <div className="gemini-output">{commentsResult}</div>
            {translatedComments && <div className="translated-box fade-in">{translatedComments}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingPlaceholder({ message }: { message: string }) {
  return (
    <div className="output-placeholder">
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <div className="text animate-pulse">{message}</div>
    </div>
  );
}

function EmptyPlaceholder({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="output-placeholder">
      <div className="icon">{icon}</div>
      <div className="text">{message}</div>
    </div>
  );
}
