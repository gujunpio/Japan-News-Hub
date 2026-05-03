"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getApiKey,
  setApiKey,
  getModel,
  setModel,
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
} from "@/lib/gemini/client";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_YAHOO_ARTICLE = "以下のニュース記事を3〜5行で要約してください。日本語で出力してください。";
const DEFAULT_YAHOO_COMMENTS = "以下のコメント一覧から主要な意見・傾向を日本語で分析・要約してください。";

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [apiKey, setApiKeyState] = useState("");
  const [selectedModel, setSelectedModelState] = useState("");
  const [models, setModels] = useState<GeminiModel[]>([]);
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

  // Load saved settings
  useEffect(() => {
    if (open) {
      setApiKeyState(getApiKey());
      setSelectedModelState(getModel());
      setYahooArticlePromptState(getArticlePrompt());
      setYahooCommentsPromptState(getYahooCommentsPrompt());
      setFiveChThreadPromptState(getThreadPrompt());
      setFiveChCommentsPromptState(get5chCommentsPrompt());
      setTranslationEngineState(getTranslationEngine());
    }
  }, [open]);

  // Auto-fetch models when API key changes and looks valid
  useEffect(() => {
    if (apiKey.length > 20) {
      handleFetchModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  const handleFetchModels = useCallback(async () => {
    if (!apiKey) return;
    setModelsLoading(true);
    setModelsError("");
    try {
      const list = await fetchModels(apiKey);
      setModels(list);
      // Auto-select best model if none selected
      if (list.length > 0 && !selectedModel) {
        const best = list[0].name;
        setSelectedModelState(best);
        setModel(best);
      }
    } catch (err) {
      setModelsError(
        err instanceof Error ? err.message : "Failed to fetch models"
      );
    } finally {
      setModelsLoading(false);
    }
  }, [apiKey, selectedModel]);

  const handleSaveKey = () => {
    setApiKey(apiKey);
    setTestStatus("idle");
  };

  const handleModelChange = (value: string) => {
    setSelectedModelState(value);
    setModel(value);
  };

  const handleTranslationEngineChange = (value: "google" | "ai") => {
    setTranslationEngineState(value);
    setTranslationEngine(value);
  };

  const handleTest = async () => {
    setTestStatus("testing");
    try {
      const ok = await testConnection(apiKey);
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
                  value={apiKey}
                  onChange={(e) => setApiKeyState(e.target.value)}
                  onBlur={handleSaveKey}
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
                    onClick={handleFetchModels}
                  >
                    Retry
                  </button>
                </div>
              ) : models.length > 0 ? (
                <select
                  id="settings-model"
                  className="input-field"
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                >
                  {models.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.displayName} ({m.name.replace("models/", "")})
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
                <option value="ai">Gemini AI (Accurate, Uses API Key)</option>
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
                disabled={!apiKey || testStatus === "testing"}
                style={{ width: "100%" }}
              >
                {testStatus === "testing" ? (
                  <>
                    <span className="spinner" /> Testing…
                  </>
                ) : (
                  <>🔌 Test Connection</>
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
