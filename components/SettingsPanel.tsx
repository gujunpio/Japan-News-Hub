"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getApiKey,
  setApiKey,
  getOpenRouterApiKey,
  setOpenRouterApiKey,
  getModel,
  setModel,
  getOpenRouterModel,
  setOpenRouterModel,
  getProvider,
  setProvider,
  fetchModels,
  testConnection,
  getArticlePrompt,
  setArticlePrompt,
  getYahooCommentsPrompt,
  setYahooCommentsPrompt,
  getThreadPrompt,
  setThreadPrompt,
  get5chCommentsPrompt,
  set5chCommentsPrompt,
  getTranslationEngine,
  setTranslationEngine,
  DEFAULT_THREAD_PROMPT,
  DEFAULT_COMMENTS_PROMPT as DEFAULT_5CH_COMMENTS_PROMPT,
  type GeminiModel,
  type ApiProvider,
} from "@/lib/gemini/client";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_YAHOO_ARTICLE = "以下のニュース記事を3〜5行で要約してください。日本語で出力してください。";
const DEFAULT_YAHOO_COMMENTS = "以下のコメント一覧から主要な意見・傾向を日本語で分析・要約してください。";

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  // Provider
  const [providerState, setProviderState] = useState<ApiProvider>("google");

  // Google
  const [googleKey, setGoogleKeyState] = useState("");
  const [googleModel, setGoogleModelState] = useState("");
  const [googleModels, setGoogleModels] = useState<GeminiModel[]>([]);

  // OpenRouter
  const [orKey, setOrKeyState] = useState("");
  const [orModel, setOrModelState] = useState("");
  const [orModels, setOrModels] = useState<GeminiModel[]>([]);

  // Shared
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [showKey, setShowKey] = useState(false);
  const [translationEngine, setTranslationEngineState] = useState<"google" | "ai">("google");

  // Prompts
  const [yahooArticlePrompt, setYahooArticlePromptState] = useState("");
  const [yahooCommentsPrompt, setYahooCommentsPromptState] = useState("");
  const [fiveChThreadPrompt, setFiveChThreadPromptState] = useState("");
  const [fiveChCommentsPrompt, setFiveChCommentsPromptState] = useState("");

  const [activeTab, setActiveTab] = useState<"general" | "yahoo" | "5ch">("general");

  // Current key based on provider
  const currentKey = providerState === "openrouter" ? orKey : googleKey;

  // Load saved settings
  useEffect(() => {
    if (open) {
      setProviderState(getProvider());
      setGoogleKeyState(getApiKey());
      setGoogleModelState(getModel());
      setOrKeyState(getOpenRouterApiKey());
      setOrModelState(getOpenRouterModel());
      setYahooArticlePromptState(getArticlePrompt());
      setYahooCommentsPromptState(getYahooCommentsPrompt());
      setFiveChThreadPromptState(getThreadPrompt());
      setFiveChCommentsPromptState(get5chCommentsPrompt());
      setTranslationEngineState(getTranslationEngine());
    }
  }, [open]);

  // Auto-fetch models when key changes
  useEffect(() => {
    if (googleKey.length > 20) {
      handleFetchModels("google", googleKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleKey]);

  useEffect(() => {
    if (orKey.length > 20) {
      handleFetchModels("openrouter", orKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orKey]);

  const handleFetchModels = useCallback(async (p: ApiProvider, key: string) => {
    if (!key) return;
    setModelsLoading(true);
    setModelsError("");
    try {
      const list = await fetchModels(key, p);
      if (p === "openrouter") {
        setOrModels(list);
        if (list.length > 0 && !orModel) {
          const best = list[0].name;
          setOrModelState(best);
          setOpenRouterModel(best);
        }
      } else {
        setGoogleModels(list);
        if (list.length > 0 && !googleModel) {
          const best = list[0].name;
          setGoogleModelState(best);
          setModel(best);
        }
      }
    } catch (err) {
      setModelsError(
        err instanceof Error ? err.message : "Failed to fetch models"
      );
    } finally {
      setModelsLoading(false);
    }
  }, [orModel, googleModel]);

  const handleProviderChange = (p: ApiProvider) => {
    setProviderState(p);
    setProvider(p);
    setModelsError("");
    setTestStatus("idle");
  };

  const handleSaveGoogleKey = () => {
    setApiKey(googleKey);
    setTestStatus("idle");
  };

  const handleSaveOrKey = () => {
    setOpenRouterApiKey(orKey);
    setTestStatus("idle");
  };

  const handleGoogleModelChange = (value: string) => {
    setGoogleModelState(value);
    setModel(value);
  };

  const handleOrModelChange = (value: string) => {
    setOrModelState(value);
    setOpenRouterModel(value);
  };

  const handleTranslationEngineChange = (value: "google" | "ai") => {
    setTranslationEngineState(value);
    setTranslationEngine(value);
  };

  const handleTest = async () => {
    setTestStatus("testing");
    try {
      const ok = await testConnection(currentKey, providerState);
      setTestStatus(ok ? "ok" : "error");
    } catch {
      setTestStatus("error");
    }
  };

  const saveYahooPrompts = () => {
    setArticlePrompt(yahooArticlePrompt);
    setYahooCommentsPrompt(yahooCommentsPrompt);
  };

  const save5chPrompts = () => {
    setThreadPrompt(fiveChThreadPrompt);
    set5chCommentsPrompt(fiveChCommentsPrompt);
  };

  if (!open) return null;

  // Determine which models/model to show
  const activeModels = providerState === "openrouter" ? orModels : googleModels;
  const activeModel = providerState === "openrouter" ? orModel : googleModel;
  const handleModelChange = providerState === "openrouter" ? handleOrModelChange : handleGoogleModelChange;

  return (
    <>
      <div className="settings-backdrop" onClick={onClose} />

      <div className="settings-drawer fade-in">
        <div className="settings-header">
          <h2 className="settings-title">⚙️ Settings</h2>
          <button className="settings-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="tabs" style={{ marginBottom: "20px" }}>
          <button
            className={`tab ${activeTab === "general" ? "active" : ""}`}
            onClick={() => setActiveTab("general")}
          >
            General
          </button>
          <button
            className={`tab ${activeTab === "yahoo" ? "active" : ""}`}
            onClick={() => setActiveTab("yahoo")}
          >
            Yahoo Prompts
          </button>
          <button
            className={`tab ${activeTab === "5ch" ? "active" : ""}`}
            onClick={() => setActiveTab("5ch")}
          >
            5ch Prompts
          </button>
        </div>

        {activeTab === "general" && (
          <>
            {/* Provider selector */}
            <div className="settings-section">
              <label className="input-label">AI Provider</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className={`btn ${providerState === "google" ? "btn-primary" : "btn-secondary"}`}
                  style={{ flex: 1, fontSize: "13px", padding: "10px 12px" }}
                  onClick={() => handleProviderChange("google")}
                >
                  🔵 Google AI Studio
                </button>
                <button
                  className={`btn ${providerState === "openrouter" ? "btn-primary" : "btn-secondary"}`}
                  style={{ flex: 1, fontSize: "13px", padding: "10px 12px" }}
                  onClick={() => handleProviderChange("openrouter")}
                >
                  🟠 OpenRouter
                </button>
              </div>
            </div>

            {/* API Key — Google */}
            {providerState === "google" && (
              <div className="settings-section">
                <label className="input-label" htmlFor="settings-api-key">
                  Google AI Studio API Key
                </label>
                <div className="settings-key-row">
                  <input
                    id="settings-api-key"
                    className="input-field"
                    type={showKey ? "text" : "password"}
                    placeholder="AIzaSy..."
                    value={googleKey}
                    onChange={(e) => setGoogleKeyState(e.target.value)}
                    onBlur={handleSaveGoogleKey}
                  />
                  <button
                    className="settings-toggle-btn"
                    onClick={() => setShowKey(!showKey)}
                    title={showKey ? "Hide" : "Show"}
                  >
                    {showKey ? "🙈" : "👁️"}
                  </button>
                </div>
                <p className="settings-hint">
                  Get a free key at{" "}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    aistudio.google.com
                  </a>
                  . Stored locally.
                </p>
              </div>
            )}

            {/* API Key — OpenRouter */}
            {providerState === "openrouter" && (
              <div className="settings-section">
                <label className="input-label" htmlFor="settings-or-key">
                  OpenRouter API Key
                </label>
                <div className="settings-key-row">
                  <input
                    id="settings-or-key"
                    className="input-field"
                    type={showKey ? "text" : "password"}
                    placeholder="sk-or-v1-..."
                    value={orKey}
                    onChange={(e) => setOrKeyState(e.target.value)}
                    onBlur={handleSaveOrKey}
                  />
                  <button
                    className="settings-toggle-btn"
                    onClick={() => setShowKey(!showKey)}
                    title={showKey ? "Hide" : "Show"}
                  >
                    {showKey ? "🙈" : "👁️"}
                  </button>
                </div>
                <p className="settings-hint">
                  Get your key at{" "}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    openrouter.ai/keys
                  </a>
                  . Supports 200+ models including free tiers. Stored locally.
                </p>
              </div>
            )}

            {/* Model selector */}
            <div className="settings-section">
              <label className="input-label" htmlFor="settings-model">
                Model
              </label>
              {modelsLoading ? (
                <div className="settings-loading">
                  <span className="spinner" /> Loading models…
                </div>
              ) : modelsError ? (
                <div className="settings-model-error">
                  {modelsError}
                  <button
                    className="settings-retry-btn"
                    onClick={() => handleFetchModels(providerState, currentKey)}
                  >
                    Retry
                  </button>
                </div>
              ) : activeModels.length > 0 ? (
                <select
                  id="settings-model"
                  className="input-field"
                  value={activeModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                >
                  {activeModels.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.displayName} ({providerState === "openrouter" ? m.name : m.name.replace("models/", "")})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="settings-hint">
                  Enter a valid API key to load available models.
                </p>
              )}
            </div>

            <div className="settings-section">
              <label className="input-label" htmlFor="settings-translation-engine">
                Translation Engine
              </label>
              <select
                id="settings-translation-engine"
                className="input-field"
                value={translationEngine}
                onChange={(e) => handleTranslationEngineChange(e.target.value as "google" | "ai")}
              >
                <option value="google">Google Translate (Fast, Default)</option>
                <option value="ai">AI Translation (Accurate, Uses API Key)</option>
              </select>
              <p className="settings-hint">
                Choose the service used for translating articles and comments.
              </p>
            </div>

            <div className="settings-section">
              <button
                id="btn-test-connection"
                className="btn btn-secondary"
                onClick={handleTest}
                disabled={!currentKey || testStatus === "testing"}
                style={{ width: "100%" }}
              >
                {testStatus === "testing" ? (
                  <>
                    <span className="spinner" /> Testing…
                  </>
                ) : (
                  <>🔌 Test Connection ({providerState === "openrouter" ? "OpenRouter" : "Google"})</>
                )}
              </button>

              {testStatus === "ok" && (
                <div className="status-badge success fade-in" style={{ marginTop: 10 }}>
                  ✓ API key is valid
                </div>
              )}
              {testStatus === "error" && (
                <div className="status-badge error fade-in" style={{ marginTop: 10 }}>
                  ✗ Invalid API key or network error
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "yahoo" && (
          <>
            <div className="settings-section">
              <label className="input-label">Article Summary Prompt</label>
              <textarea
                className="input-field"
                rows={4}
                value={yahooArticlePrompt}
                onChange={(e) => setYahooArticlePromptState(e.target.value)}
                onBlur={saveYahooPrompts}
              />
              <button
                className="settings-retry-btn"
                style={{ marginTop: "8px" }}
                onClick={() => {
                  setYahooArticlePromptState(DEFAULT_YAHOO_ARTICLE);
                  setArticlePrompt(DEFAULT_YAHOO_ARTICLE);
                }}
              >
                Reset to Default
              </button>
            </div>
            <div className="settings-section">
              <label className="input-label">Comments Summary Prompt</label>
              <textarea
                className="input-field"
                rows={4}
                value={yahooCommentsPrompt}
                onChange={(e) => setYahooCommentsPromptState(e.target.value)}
                onBlur={saveYahooPrompts}
              />
              <button
                className="settings-retry-btn"
                style={{ marginTop: "8px" }}
                onClick={() => {
                  setYahooCommentsPromptState(DEFAULT_YAHOO_COMMENTS);
                  setYahooCommentsPrompt(DEFAULT_YAHOO_COMMENTS);
                }}
              >
                Reset to Default
              </button>
            </div>
          </>
        )}

        {activeTab === "5ch" && (
          <>
            <div className="settings-section">
              <label className="input-label">Thread Analysis Prompt</label>
              <textarea
                className="input-field"
                rows={6}
                value={fiveChThreadPrompt}
                onChange={(e) => setFiveChThreadPromptState(e.target.value)}
                onBlur={save5chPrompts}
              />
              <button
                className="settings-retry-btn"
                style={{ marginTop: "8px" }}
                onClick={() => {
                  setFiveChThreadPromptState(DEFAULT_THREAD_PROMPT);
                  setThreadPrompt(DEFAULT_THREAD_PROMPT);
                }}
              >
                Reset to Default
              </button>
            </div>
            <div className="settings-section">
              <label className="input-label">Comments Analysis Prompt</label>
              <textarea
                className="input-field"
                rows={6}
                value={fiveChCommentsPrompt}
                onChange={(e) => setFiveChCommentsPromptState(e.target.value)}
                onBlur={save5chPrompts}
              />
              <button
                className="settings-retry-btn"
                style={{ marginTop: "8px" }}
                onClick={() => {
                  setFiveChCommentsPromptState(DEFAULT_5CH_COMMENTS_PROMPT);
                  set5chCommentsPrompt(DEFAULT_5CH_COMMENTS_PROMPT);
                }}
              >
                Reset to Default
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
