"use client";

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Comment, PostItem } from "@/types";

// ── Provider type ─────────────────────────────────────────────────────
export type ApiProvider = "google" | "openrouter";

// ── localStorage keys ─────────────────────────────────────────────────
// Shared keys for both modules
const STORAGE_KEY_API = "gemini_api_key";
const STORAGE_KEY_OPENROUTER_API = "openrouter_api_key";
const STORAGE_KEY_PROVIDER = "ai_provider";
const STORAGE_KEY_MODEL = "gemini_model";
const STORAGE_KEY_OPENROUTER_MODEL = "openrouter_model";
const STORAGE_KEY_TRANSLATION_ENGINE = "translation_engine";

// Yahoo-specific prompt keys
const STORAGE_KEY_ARTICLE_PROMPT = "gemini_article_prompt";
const STORAGE_KEY_YAHOO_COMMENTS_PROMPT = "gemini_comments_prompt";

// 5ch-specific prompt keys
const STORAGE_KEY_THREAD_PROMPT = "5ch_thread_prompt";
const STORAGE_KEY_5CH_COMMENTS_PROMPT = "5ch_comments_prompt";

// ── Default prompts ───────────────────────────────────────────────────

const DEFAULT_ARTICLE_PROMPT = "以下のニュース記事を3〜5行で要約してください。日本語で出力してください。";
const DEFAULT_YAHOO_COMMENTS_PROMPT = "以下のコメント一覧から主要な意見・傾向を日本語で分析・要約してください。";

export const DEFAULT_THREAD_PROMPT = `Please analyze the following 5ch thread.

【Thread Title】
{title}

【Original Post (OP)】
{content}

Respond entirely in Japanese using this exact format:
■ スレッドのテーマ（1〜2行）
■ OPが伝えたい主なポイント（3〜4行）
■ 予想される議論のポイント（箇条書き 2〜3点）`;

export const DEFAULT_COMMENTS_PROMPT = `Below are {count} comments from the 5ch thread "{title}".

Analyze and summarize them entirely in Japanese using this exact format:

1. 感情の傾向（賛成・反対・中立・その他の割合）
2. 注目コメント上位 3〜5 件（番号と内容を引用）
3. 頻出キーワード・話題（5〜7 項目）
4. 全体的な雰囲気（1〜2行）

【コメント一覧】
{posts}`;

// ── Supported translation languages ──────────────────────────────────

export const SUPPORTED_LANGUAGES = [
  { code: "VI", label: "🇻🇳 VI" },
  { code: "EN", label: "🇺🇸 EN" },
  { code: "ZH", label: "🇨🇳 ZH" },
  { code: "KO", label: "🇰🇷 KO" },
  { code: "TH", label: "🇹🇭 TH" },
  { code: "FR", label: "🇫🇷 FR" },
  { code: "DE", label: "🇩🇪 DE" },
  { code: "ES", label: "🇪🇸 ES" },
];

const LANGUAGE_NAMES: Record<string, string> = {
  VI: "Vietnamese",
  EN: "English",
  ZH: "Simplified Chinese",
  KO: "Korean",
  TH: "Thai",
  FR: "French",
  DE: "German",
  ES: "Spanish",
};

// ── Provider helpers ──────────────────────────────────────────────────

export function getProvider(): ApiProvider {
  if (typeof window === "undefined") return "google";
  return (localStorage.getItem(STORAGE_KEY_PROVIDER) as ApiProvider) ?? "google";
}

export function setProvider(provider: ApiProvider): void {
  localStorage.setItem(STORAGE_KEY_PROVIDER, provider);
}

// ── Shared API key/model helpers ──────────────────────────────────────

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY_API) ?? "";
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY_API, key);
}

export function getOpenRouterApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY_OPENROUTER_API) ?? "";
}

export function setOpenRouterApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY_OPENROUTER_API, key);
}

/** Returns the active API key based on current provider */
export function getActiveApiKey(): string {
  const provider = getProvider();
  return provider === "openrouter" ? getOpenRouterApiKey() : getApiKey();
}

export function getModel(): string {
  if (typeof window === "undefined") return "gemini-2.0-flash";
  return localStorage.getItem(STORAGE_KEY_MODEL) ?? "gemini-2.0-flash";
}

export function setModel(model: string): void {
  localStorage.setItem(STORAGE_KEY_MODEL, model);
}

export function getOpenRouterModel(): string {
  if (typeof window === "undefined") return "google/gemini-2.0-flash-exp:free";
  return localStorage.getItem(STORAGE_KEY_OPENROUTER_MODEL) ?? "google/gemini-2.0-flash-exp:free";
}

export function setOpenRouterModel(model: string): void {
  localStorage.setItem(STORAGE_KEY_OPENROUTER_MODEL, model);
}

/** Returns the active model based on current provider */
export function getActiveModel(): string {
  const provider = getProvider();
  return provider === "openrouter" ? getOpenRouterModel() : getModel();
}

export function getTranslationEngine(): "google" | "ai" {
  if (typeof window === "undefined") return "google";
  return (localStorage.getItem(STORAGE_KEY_TRANSLATION_ENGINE) as "google" | "ai") ?? "google";
}

export function setTranslationEngine(engine: "google" | "ai"): void {
  localStorage.setItem(STORAGE_KEY_TRANSLATION_ENGINE, engine);
}

// ── Yahoo prompt helpers ───────────────────────────────────────────────

export function getArticlePrompt(): string {
  if (typeof window === "undefined") return DEFAULT_ARTICLE_PROMPT;
  return localStorage.getItem(STORAGE_KEY_ARTICLE_PROMPT) ?? DEFAULT_ARTICLE_PROMPT;
}

export function setArticlePrompt(prompt: string): void {
  localStorage.setItem(STORAGE_KEY_ARTICLE_PROMPT, prompt);
}

export function getYahooCommentsPrompt(): string {
  if (typeof window === "undefined") return DEFAULT_YAHOO_COMMENTS_PROMPT;
  return localStorage.getItem(STORAGE_KEY_YAHOO_COMMENTS_PROMPT) ?? DEFAULT_YAHOO_COMMENTS_PROMPT;
}

export function setYahooCommentsPrompt(prompt: string): void {
  localStorage.setItem(STORAGE_KEY_YAHOO_COMMENTS_PROMPT, prompt);
}

// Keep old name for compat
export const getCommentsPrompt = getYahooCommentsPrompt;
export const setCommentsPrompt = setYahooCommentsPrompt;

// ── 5ch prompt helpers ────────────────────────────────────────────────

export function getThreadPrompt(): string {
  if (typeof window === "undefined") return DEFAULT_THREAD_PROMPT;
  return localStorage.getItem(STORAGE_KEY_THREAD_PROMPT) ?? DEFAULT_THREAD_PROMPT;
}

export function setThreadPrompt(prompt: string): void {
  localStorage.setItem(STORAGE_KEY_THREAD_PROMPT, prompt);
}

export function get5chCommentsPrompt(): string {
  if (typeof window === "undefined") return DEFAULT_COMMENTS_PROMPT;
  return localStorage.getItem(STORAGE_KEY_5CH_COMMENTS_PROMPT) ?? DEFAULT_COMMENTS_PROMPT;
}

export function set5chCommentsPrompt(prompt: string): void {
  localStorage.setItem(STORAGE_KEY_5CH_COMMENTS_PROMPT, prompt);
}

// ── Model list helpers ────────────────────────────────────────────────

export interface GeminiModel {
  name: string;
  displayName: string;
  supportedGenerationMethods: string[];
}

export async function fetchModels(apiKey: string, provider?: ApiProvider): Promise<GeminiModel[]> {
  const p = provider ?? getProvider();

  if (p === "openrouter") {
    return fetchOpenRouterModels(apiKey);
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data?.error?.message ?? `Failed to fetch models (HTTP ${res.status})`
    );
  }

  const data = await res.json();
  const models: GeminiModel[] = (data.models ?? [])
    .filter(
      (m: GeminiModel) =>
        m.supportedGenerationMethods?.includes("generateContent")
    )
    .map((m: GeminiModel) => ({
      name: m.name,
      displayName: m.displayName,
      supportedGenerationMethods: m.supportedGenerationMethods,
    }));

  models.sort((a, b) => {
    const priority = (name: string) => {
      if (name.includes("2.5-pro")) return 0;
      if (name.includes("2.5-flash")) return 1;
      if (name.includes("2.0")) return 2;
      return 3;
    };
    const pa = priority(a.name);
    const pb = priority(b.name);
    if (pa !== pb) return pa - pb;
    return b.name.localeCompare(a.name);
  });

  return models;
}

// ── OpenRouter model list ─────────────────────────────────────────────

interface OpenRouterModelRaw {
  id: string;
  name: string;
  pricing?: { prompt?: string; completion?: string };
}

async function fetchOpenRouterModels(apiKey: string): Promise<GeminiModel[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch OpenRouter models (HTTP ${res.status})`);
  }

  const data = await res.json();
  const models: GeminiModel[] = ((data.data ?? []) as OpenRouterModelRaw[])
    .filter((m) => m.id && m.name)
    .map((m) => {
      const isFree = m.pricing?.prompt === "0" || m.id.includes(":free");
      return {
        name: m.id,
        displayName: m.name + (isFree ? " 🆓" : ""),
        supportedGenerationMethods: ["generateContent"],
      };
    });

  // Sort: free models first, then by name
  models.sort((a, b) => {
    const aFree = a.displayName.includes("🆓") ? 0 : 1;
    const bFree = b.displayName.includes("🆓") ? 0 : 1;
    if (aFree !== bFree) return aFree - bFree;
    return a.displayName.localeCompare(b.displayName);
  });

  return models;
}

export async function testConnection(apiKey: string, provider?: ApiProvider): Promise<boolean> {
  const p = provider ?? getProvider();

  if (p === "openrouter") {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return res.ok;
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  return res.ok;
}

// ── Internal AI call (routes to Google or OpenRouter) ─────────────────

async function callGemini(prompt: string, model?: string): Promise<string> {
  const provider = getProvider();

  if (provider === "openrouter") {
    return callOpenRouter(prompt, model);
  }

  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API key not configured");
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelId = (model ?? getModel()).replace("models/", "");
  const genModel = genAI.getGenerativeModel({ model: modelId });
  const result = await genModel.generateContent(prompt);
  return result.response.text();
}

async function callOpenRouter(prompt: string, model?: string): Promise<string> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) throw new Error("OpenRouter API key not configured");

  const modelId = model ?? getOpenRouterModel();

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
      "X-Title": "Japan News Hub",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.error?.message ?? `OpenRouter API error (HTTP ${res.status})`
    );
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Yahoo News AI functions ───────────────────────────────────────────

export async function summarizeArticle(
  articleText: string,
  model: string
): Promise<string> {
  const metaPrompt = getArticlePrompt();
  const prompt = `${metaPrompt}\n\n${articleText}`;
  return callGemini(prompt, model);
}

export async function summarizeComments(
  comments: Comment[],
  model: string
): Promise<string> {
  const commentsText = comments
    .map((c, i) => `#${i + 1} [共感 ${c.likeCount}] ${c.content}`)
    .join("\n");
  const metaPrompt = getYahooCommentsPrompt();
  const prompt = `${metaPrompt}\n\n${commentsText}`;
  return callGemini(prompt, model);
}

// ── 5ch AI functions ──────────────────────────────────────────────────

export async function summarizeThread(
  threadTitle: string,
  opContent: string,
  model: string,
  customPrompt?: string
): Promise<string> {
  const template = customPrompt ?? getThreadPrompt();
  const prompt = template
    .replace(/{title}/g, threadTitle)
    .replace(/{content}/g, opContent);
  try {
    return await callGemini(prompt, model);
  } catch (err) {
    throw new Error("Gemini API Error: " + (err instanceof Error ? err.message : "Unknown"));
  }
}

export async function analyzeComments(
  posts: PostItem[],
  threadTitle: string,
  model: string,
  customPrompt?: string
): Promise<string> {
  const formattedPosts = posts.map((p) => `${p.number}. ${p.content}`).join("\n");
  const count = posts.length;
  const template = customPrompt ?? get5chCommentsPrompt();
  const prompt = template
    .replace(/{title}/g, threadTitle)
    .replace(/{count}/g, String(count))
    .replace(/{posts}/g, formattedPosts);
  try {
    return await callGemini(prompt, model);
  } catch (err) {
    throw new Error("Gemini API Error: " + (err instanceof Error ? err.message : "Unknown"));
  }
}

// ── Translation ───────────────────────────────────────────────────────

export async function translateText(
  text: string,
  targetLang: string,
  model?: string
): Promise<string> {
  if (!text) return "";

  const engine = getTranslationEngine();

  if (engine === "google") {
    // Force lowercase for Google Translate API
    const code = targetLang.toLowerCase();
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${code}&dt=t&q=${encodeURIComponent(text)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data[0].map((item: any) => item[0]).join("");
    } catch (err) {
      console.error("Translation error:", err);
      throw err;
    }
  }

  // Use Gemini AI
  const langName = LANGUAGE_NAMES[targetLang.toUpperCase()] ?? targetLang;
  const m = model ?? getActiveModel();
  const prompt = `Translate to ${langName}. Keep formatting. Output only translation.

${text}`;
  try {
    return await callGemini(prompt, m);
  } catch (err) {
    throw new Error("Translation error: " + (err instanceof Error ? err.message : "Unknown"));
  }
}
