"use client";

import { useState } from "react";
import {
  summarizeThread, analyzeComments, translateText, getActiveModel,
  SUPPORTED_LANGUAGES,
} from "@/lib/gemini/client";
import type { ThreadData, PostsData } from "@/types";

function getLimitOptions(totalAvailable: number): Array<number | "all"> {
  const fixed: Array<number | "all"> = [];
  for (let n = 50; n < totalAvailable && n <= 500; n += 50) {
    fixed.push(n);
  }
  fixed.push("all");
  return fixed;
}

interface FiveChScraperProps {
  setSettingsOpen: (open: boolean) => void;
}

export default function FiveChScraper({ setSettingsOpen }: FiveChScraperProps) {
  const [url, setUrl] = useState("");
  const [isScrapingThread, setIsScrapingThread] = useState(false);
  const [isScrapingPosts, setIsScrapingPosts] = useState(false);
  const [threadData, setThreadData] = useState<ThreadData | null>(null);
  const [postsData, setPostsData] = useState<PostsData | null>(null);
  const [selectedLimit, setSelectedLimit] = useState<number | "all">(100);
  const [activeTab, setActiveTab] = useState<"thread" | "comments" | "gemini">("thread");
  const [error, setError] = useState("");

  const [geminiThreadResult, setGeminiThreadResult] = useState("");
  const [geminiCommentsResult, setGeminiCommentsResult] = useState("");
  const [isGeminiLoading, setIsGeminiLoading] = useState<"thread" | "comments" | null>(null);
  const [copiedKey, setCopiedKey] = useState("");

  const [targetLang, setTargetLang] = useState("VI");
  const [threadTranslation, setThreadTranslation] = useState("");
  const [isTranslatingThread, setIsTranslatingThread] = useState(false);
  const [geminiThreadTr, setGeminiThreadTr] = useState("");
  const [isTranslatingGThread, setIsTranslatingGThread] = useState(false);
  const [geminiCommentsTr, setGeminiCommentsTr] = useState("");
  const [isTranslatingGComments, setIsTranslatingGComments] = useState(false);

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  }

  async function handleScrapeThread() {
    setError("");
    setIsScrapingThread(true);
    setThreadData(null);
    setPostsData(null);
    setGeminiThreadResult("");
    setGeminiCommentsResult("");
    setThreadTranslation("");
    setGeminiThreadTr("");
    setGeminiCommentsTr("");
    
    try {
      const res = await fetch("/api/5ch/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setThreadData(data);
      setActiveTab("thread");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsScrapingThread(false);
    }
  }

  async function handleScrapePosts() {
    if (!threadData) return;
    setError("");
    setIsScrapingPosts(true);
    try {
      const res = await fetch("/api/5ch/scrape-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, limit: selectedLimit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPostsData(data);
      setActiveTab("comments");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsScrapingPosts(false);
    }
  }

  async function handleGeminiThread() {
    if (!threadData) return;
    setIsGeminiLoading("thread");
    setGeminiThreadTr("");
    try {
      const result = await summarizeThread(threadData.title, threadData.opContent, getActiveModel());
      setGeminiThreadResult(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsGeminiLoading(null);
    }
  }

  async function handleGeminiComments() {
    if (!postsData || !threadData) return;
    setIsGeminiLoading("comments");
    setGeminiCommentsTr("");
    try {
      const result = await analyzeComments(postsData.posts, threadData.title, getActiveModel());
      setGeminiCommentsResult(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsGeminiLoading(null);
    }
  }

  async function handleTranslateThread() {
    if (!threadData) return;
    setIsTranslatingThread(true);
    try {
      const text = `${threadData.title}\n\n${threadData.opContent}`;
      const tr = await translateText(text, targetLang, getActiveModel());
      setThreadTranslation(tr);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsTranslatingThread(false);
    }
  }

  async function handleTranslateGThread() {
    if (!geminiThreadResult) return;
    setIsTranslatingGThread(true);
    try {
      const tr = await translateText(geminiThreadResult, targetLang, getActiveModel());
      setGeminiThreadTr(tr);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsTranslatingGThread(false);
    }
  }

  async function handleTranslateGComments() {
    if (!geminiCommentsResult) return;
    setIsTranslatingGComments(true);
    try {
      const tr = await translateText(geminiCommentsResult, targetLang, getActiveModel());
      setGeminiCommentsTr(tr);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsTranslatingGComments(false);
    }
  }

  return (
    <>
      {error && (
        <div className="error-message fade-in" style={{ marginBottom: 16 }}>
          {error}
          <button onClick={() => setError("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer" }}>✕</button>
        </div>
      )}

      <div className="main-grid">
        <aside>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><span className="icon">🔗</span> 5ch Thread URL</div>
            <div className="input-group">
              <input
                className="input-field"
                placeholder="https://news.5ch.io/test/read.cgi/newsplus/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScrapeThread()}
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={handleScrapeThread}
              disabled={!url || isScrapingThread}
            >
              {isScrapingThread ? (
                <><span className="spinner" /> Loading...</>
              ) : (
                <>Fetch Thread</>
              )}
            </button>

            {threadData && (
              <div className="badge badge-blue fade-in" style={{ marginTop: 10, padding: 8, background: "rgba(59, 130, 246, 0.1)", borderRadius: 8 }}>
                📊 Total Posts: {threadData.totalPosts}
              </div>
            )}
          </div>

          {threadData && (
            <div className="card fade-in" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>
                Select Number of Comments to Fetch
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 10 }}>
                ※ Excluding the OP (post #1)
              </div>
              <div className="checkbox-group">
                {getLimitOptions(threadData.totalPosts - 1).map((opt) => (
                  <label key={String(opt)} className={`checkbox-item ${selectedLimit === opt ? "active" : ""}`}>
                    <input
                      type="radio"
                      name="limit"
                      checked={selectedLimit === opt}
                      onChange={() => setSelectedLimit(opt)}
                      style={{ display: "none" }}
                    />
                    {opt === "all" ? `All (${threadData.totalPosts - 1})` : `${opt}`}
                  </label>
                ))}
              </div>
              <button
                className="btn btn-primary"
                style={{ width: "100%", marginTop: 12 }}
                onClick={handleScrapePosts}
                disabled={isScrapingPosts}
              >
                {isScrapingPosts ? (
                  <><span className="spinner" /> Fetching...</>
                ) : (
                  <>Fetch Comments</>
                )}
              </button>
              {postsData && (
                <div style={{ marginTop: 8, padding: 8, background: "rgba(16, 185, 129, 0.1)", color: "var(--success)", borderRadius: 8, fontSize: "13px" }}>
                  ✓ {postsData.totalFetched} Fetched
                </div>
              )}
            </div>
          )}
        </aside>

        <main>
          <div className="card">
            <div className="tabs">
              <button
                className={`tab ${activeTab === "thread" ? "active" : ""}`}
                onClick={() => setActiveTab("thread")}
              >
                Thread {threadData ? "✓" : ""}
              </button>
              <button
                className={`tab ${activeTab === "comments" ? "active" : ""}`}
                onClick={() => setActiveTab("comments")}
              >
                Comments {postsData ? `(${postsData.totalFetched})` : ""}
              </button>
              <button
                className={`tab ${activeTab === "gemini" ? "active" : ""}`}
                onClick={() => setActiveTab("gemini")}
              >
                Analysis
              </button>
            </div>

            {activeTab === "thread" && (
              threadData ? (
                <div className="fade-in">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <h2 className="article-title">{threadData.title}</h2>
                      <span className="badge badge-blue" style={{ fontSize: 12, padding: "2px 8px", background: "var(--bg-input)", borderRadius: 4 }}>{threadData.boardName}</span>
                    </div>
                    <button
                      className={`copy-btn ${copiedKey === "thread" ? "copied" : ""}`}
                      onClick={() => copyText(`${threadData.title}\n\n${threadData.opContent}`, "thread")}
                    >
                      {copiedKey === "thread" ? "Copied ✓" : "Copy"}
                    </button>
                  </div>

                  <div className="article-body" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                    {threadData.opContent}
                  </div>

                  {threadData.links && threadData.links.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>Links in OP:</h3>
                      <ul style={{ listStyle: "disc", paddingLeft: 20, fontSize: "0.85rem" }}>
                        {threadData.links.map((link, idx) => (
                          <li key={idx} style={{ marginBottom: 4 }}>
                            <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>{link}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", flexShrink: 0 }}>🌐 Translate to:</span>
                    <select
                      value={targetLang}
                      onChange={(e) => { setTargetLang(e.target.value); setThreadTranslation(""); }}
                      className="input-field"
                      style={{ padding: "4px 8px", height: 32, width: "auto" }}
                    >
                      {SUPPORTED_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                    <button className={`btn-translate ${isTranslatingThread ? 'translating' : threadTranslation ? 'translated' : ''}`} onClick={handleTranslateThread} disabled={isTranslatingThread || !!threadTranslation}>
                      {isTranslatingThread ? <><span className="spinner-sm" /> Translating...</> : threadTranslation ? "✓ Translated" : "🌐 Translate"}
                    </button>
                  </div>

                  {threadTranslation && (
                    <div className="translated-box fade-in" style={{ marginTop: 12, padding: 12, background: "rgba(99, 102, 241, 0.05)", borderRadius: 8 }}>
                      {threadTranslation}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "48px 0" }}>
                  Please enter a URL to fetch the thread
                </div>
              )
            )}

            {activeTab === "comments" && (
              postsData ? (
                <div className="fade-in">
                  <div className="output-toolbar">
                    <div className="output-stats">
                      Fetched: {postsData.totalFetched} / Total: {postsData.totalAvailable}
                    </div>
                    <button
                      className={`copy-btn ${copiedKey === "posts" ? "copied" : ""}`}
                      onClick={() => copyText(postsData.posts.map((p) => `${p.number}. ${p.content}`).join("\n"), "posts")}
                    >
                      {copiedKey === "posts" ? "Copied ✓" : "Copy All"}
                    </button>
                  </div>
                  <div className="output-content" style={{ padding: 12 }}>
                    {postsData.posts.map((post) => (
                      <div key={post.number} className="comment-card">
                        <div className="comment-rank" style={{ color: "var(--accent)" }}>#{post.number}</div>
                        <div className="comment-content">{post.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "48px 0" }}>
                  Please select the number of comments to fetch
                </div>
              )
            )}

            {activeTab === "gemini" && (
              <div className="fade-in">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "10px 14px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>🌐 Translation language:</span>
                  <select
                    value={targetLang}
                    onChange={(e) => { setTargetLang(e.target.value); setGeminiThreadTr(""); setGeminiCommentsTr(""); }}
                    className="input-field"
                    style={{ padding: "4px 8px", height: 32, width: "auto" }}
                  >
                    {SUPPORTED_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>

                <div className="gemini-panel">
                  <div className="gemini-section">
                    <div className="gemini-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h3 className="gemini-section-title" style={{ margin: 0 }}>📰 Summarize Thread</h3>
                      <button className="btn-gemini" onClick={handleGeminiThread} disabled={!threadData || isGeminiLoading === "thread"}>
                        {isGeminiLoading === "thread" ? <><span className="spinner" /> Analyzing...</> : "✨ Summarize"}
                      </button>
                    </div>

                    {geminiThreadResult && (
                      <div className="gemini-result fade-in" style={{ marginTop: 16 }}>
                        <div className="output-toolbar">
                          <span className="output-stats">{geminiThreadResult.length} chars</span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className={`btn-translate ${isTranslatingGThread ? 'translating' : geminiThreadTr ? 'translated' : ''}`} onClick={handleTranslateGThread} disabled={isTranslatingGThread || !!geminiThreadTr}>
                              {isTranslatingGThread ? <><span className="spinner-sm" /> Translating...</> : geminiThreadTr ? "✓ Translated" : "🌐 Translate"}
                            </button>
                            <button className={`copy-btn ${copiedKey === "gthread" ? "copied" : ""}`} onClick={() => copyText(geminiThreadResult, "gthread")}>
                              {copiedKey === "gthread" ? "Copied ✓" : "Copy"}
                            </button>
                          </div>
                        </div>
                        <div className="gemini-output">{geminiThreadResult}</div>
                        {geminiThreadTr && (
                          <div className="translated-box fade-in" style={{ marginTop: 12, padding: 12, background: "rgba(99, 102, 241, 0.05)", borderRadius: 8 }}>
                            {geminiThreadTr}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="gemini-divider" style={{ borderTop: "1px solid var(--border-subtle)", margin: "24px 0" }} />

                  <div className="gemini-section">
                    <div className="gemini-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h3 className="gemini-section-title" style={{ margin: 0 }}>💬 Analyze Comments</h3>
                      <button className="btn-gemini" onClick={handleGeminiComments} disabled={!postsData || isGeminiLoading === "comments"}>
                        {isGeminiLoading === "comments" ? <><span className="spinner" /> Analyzing...</> : "✨ Analyze"}
                      </button>
                    </div>

                    {geminiCommentsResult && (
                      <div className="gemini-result fade-in" style={{ marginTop: 16 }}>
                        <div className="output-toolbar">
                          <span className="output-stats">{geminiCommentsResult.length} chars</span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className={`btn-translate ${isTranslatingGComments ? 'translating' : geminiCommentsTr ? 'translated' : ''}`} onClick={handleTranslateGComments} disabled={isTranslatingGComments || !!geminiCommentsTr}>
                              {isTranslatingGComments ? <><span className="spinner-sm" /> Translating...</> : geminiCommentsTr ? "✓ Translated" : "🌐 Translate"}
                            </button>
                            <button className={`copy-btn ${copiedKey === "gcmt" ? "copied" : ""}`} onClick={() => copyText(geminiCommentsResult, "gcmt")}>
                              {copiedKey === "gcmt" ? "Copied ✓" : "Copy"}
                            </button>
                          </div>
                        </div>
                        <div className="gemini-output">{geminiCommentsResult}</div>
                        {geminiCommentsTr && (
                          <div className="translated-box fade-in" style={{ marginTop: 12, padding: 12, background: "rgba(99, 102, 241, 0.05)", borderRadius: 8 }}>
                            {geminiCommentsTr}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
