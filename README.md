# Japan News Hub

Japan News Hub is a unified Next.js web application designed to scrape, translate, and analyze content from Yahoo Japan News and 5ch.io. It leverages Google's Gemini AI to provide quick summaries of long articles and deep sentiment analysis of community comments.

## Features

- **Yahoo News Scraper**: Extract article content, metadata, and user comments from Yahoo Japan News URLs.
- **5ch.io Thread Scraper**: Extract OP content and all replies from 5ch.io community threads.
- **AI Integration (Gemini)**:
  - Summarize long news articles into concise bullet points.
  - Analyze community sentiment from hundreds of comments.
- **Smart Translation**:
  - Blazing fast free translation via Google Translate API.
  - High-accuracy context-aware translation via Gemini AI.
- **Modern UI/UX**: "Bright Fuji Modern" design featuring glassmorphism, clean typography, and a responsive layout.

## Project Structure

```text
japan-news-hub/
├── app/                        # Next.js App Router root
│   ├── api/                    # Serverless API Routes
│   │   ├── 5ch/                # Endpoints for scraping 5ch threads & posts
│   │   ├── gemini/             # Endpoints for interacting with Google Gemini API
│   │   └── yahoo/              # Endpoints for scraping Yahoo articles & comments
│   ├── FiveChScraper.tsx       # React Component: 5ch scraping UI & logic
│   ├── YahooScraper.tsx        # React Component: Yahoo scraping UI & logic
│   ├── globals.css             # Global CSS styles (Design system & tokens)
│   ├── layout.tsx              # Next.js Root Layout (Metadata & ThemeProvider)
│   ├── page.tsx                # Main application entry point & layout shell
│   └── icon.svg                # Application Favicon (Japan Flag)
├── components/                 # Reusable React Components
│   ├── SettingsPanel.tsx       # UI for managing API keys, prompts, and translation engines
│   └── ThemeProvider.tsx       # Context provider for Light/Dark mode switching
├── lib/                        # Core Utilities and Business Logic
│   ├── gemini/                 # Gemini AI integration and prompt management (client.ts)
│   ├── scraper/                # Playwright/Cheerio scraping logic
│   │   ├── fivech/             # Modules for fetching and parsing 5ch data
│   │   └── yahoo/              # Modules for interacting with Yahoo DOM (headless browser)
│   └── translate.ts            # Google Translate free API implementation
├── types/                      # TypeScript Interface definitions (index.ts)
├── Design/                     # UI/UX reference files and mockups
├── Dockerfile                  # Multi-stage Docker build configuration
├── docker-compose.yml          # Docker Compose orchestration
└── design.md                   # Documentation of the "Bright Fuji Modern" design system
```

## Setup & Deployment

This application is containerized using Docker for consistent, cross-platform deployment. It utilizes Playwright internally, so the Docker image comes pre-installed with the necessary Chromium binaries.

### Running Locally with Docker

1. Ensure Docker Desktop is running.
2. Build and start the container:
   ```bash
   docker compose up -d --build
   ```
3. Access the application at `http://localhost:3002`.

### Configuration

- **API Key**: You need a Google Gemini API key to use the AI summarization features. This is configured client-side via the `⚙️ Settings` panel in the UI and stored securely in your browser's `localStorage`.
- **Translation Engine**: By default, the app uses Google Translate for speed. You can switch to Gemini for translation via the Settings panel.

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS (CSS Variables)
- **Scraping**: Playwright Core (Headless Chromium) & Cheerio
- **AI**: Google Generative AI SDK (`@google/generative-ai`)
- **Deployment**: Docker
