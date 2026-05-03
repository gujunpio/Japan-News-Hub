# ══════════════════════════════════════════════════════════════════
# Stage 1: Dependencies
# ══════════════════════════════════════════════════════════════════
FROM node:20-slim AS deps

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

# ══════════════════════════════════════════════════════════════════
# Stage 2: Build the Next.js app
# ══════════════════════════════════════════════════════════════════
FROM node:20-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Apply polyfill during build (for @google/generative-ai)
RUN NODE_OPTIONS="--require ./polyfill-file.cjs" npm run build

# ══════════════════════════════════════════════════════════════════
# Stage 3: Production runner
# ══════════════════════════════════════════════════════════════════
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER=1
# Apply polyfill at runtime (needed for @google/generative-ai)
ENV NODE_OPTIONS="--require /app/polyfill-file.cjs"

# Install system dependencies for Chromium + CJK fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    libwayland-client0 \
    fonts-noto-cjk \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy built Next.js app (standalone output)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy runtime node_modules (playwright-core + google AI + cheerio)
COPY --from=builder /app/node_modules/playwright-core ./node_modules/playwright-core
COPY --from=builder /app/node_modules/@google ./node_modules/@google
COPY --from=builder /app/node_modules/cheerio ./node_modules/cheerio

# Copy polyfill
COPY --from=builder /app/polyfill-file.cjs ./polyfill-file.cjs

# Install Playwright Chromium browser
RUN node ./node_modules/playwright-core/cli.js install chromium

# Tell playwright-core where to find the browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
