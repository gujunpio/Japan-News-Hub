"use client";

import { useState } from "react";
import YahooScraper from "./YahooScraper";
import FiveChScraper from "./FiveChScraper";
import SettingsPanel from "@/components/SettingsPanel";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";

function AppShell() {
  const [activeModule, setActiveModule] = useState<"yahoo" | "5ch">("yahoo");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-container">
      <header className="app-header" style={{ borderBottom: "1px solid var(--border-subtle)", marginBottom: 24, paddingBottom: 16 }}>
        <div className="app-logo">
          <div className="app-logo-icon">📰</div>
          <div>
            <div className="app-logo-text">Japan News Hub</div>
            <div className="app-logo-sub">Yahoo News & 5ch Scraper</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setActiveModule("yahoo")}
            className={`btn ${activeModule === "yahoo" ? "btn-primary" : "btn-secondary"}`}
            style={{ width: "auto" }}
          >
            Yahoo News
          </button>
          <button
            onClick={() => setActiveModule("5ch")}
            className={`btn ${activeModule === "5ch" ? "btn-primary" : "btn-secondary"}`}
            style={{ width: "auto" }}
          >
            5ch.io
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button className="settings-btn" onClick={() => setSettingsOpen(true)}>
            ⚙️ Settings
          </button>
        </div>
      </header>

      {activeModule === "yahoo" ? (
        <YahooScraper setSettingsOpen={setSettingsOpen} />
      ) : (
        <FiveChScraper setSettingsOpen={setSettingsOpen} />
      )}

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
