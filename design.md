# Japan News Hub - Design Specifications

This document outlines the design language and visual specifications for the **Japan News Hub** application, adopting the **Bright Fuji Modern** aesthetic. The design emphasizes a clean, bright, and modern Japanese editorial feel, utilizing glassmorphism, monochrome backgrounds, and strong accent colors.

## 1. Core Concept

- **Aesthetic**: Minimalist Japanese Editorial / Modern Glassmorphism
- **Key Visual**: A vast, monochromatic Mount Fuji background with a semi-transparent glass overlay (`backdrop-filter: blur()`), creating a serene and sophisticated atmosphere.
- **Vibe**: Clean, structured, highly readable, and professional.

## 2. Typography

The application uses a dual-font strategy to ensure both English and Japanese text render beautifully:

- **Primary Font (English/Numbers)**: `Inter` (Weights: 400, 500, 600, 700, 800)
- **Secondary Font (Japanese)**: `Noto Sans JP` (Weights: 400, 700, 900)
- **System Fallbacks**: `-apple-system, BlinkMacSystemFont, sans-serif`

### Headings (Hierarchy)
- **H1 (Brand Logo)**: 22px, `font-weight: 900`, `text-transform: uppercase`, `letter-spacing: -0.04em`.
- **H2 (Card Titles / Section Headers)**: 15px, `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 0.5px`, color: `var(--text-secondary)`.
- **H3 (Article Titles)**: 18px, `font-weight: 700`, line-height: 1.4.

## 3. Color Palette

The color system is defined using CSS variables and supports both Light (Default) and Dark modes.

### Light Mode (Default - Bright Fuji Modern)
- **Background (Primary)**: `#f8f7f4` (Soft off-white/paper texture)
- **Background (Secondary)**: `#f0eeea`
- **Surface (Cards/Panels)**: `rgba(255, 255, 255, 0.92)` (Translucent white for glassmorphism)
- **Inputs**: `#f5f4f1`
- **Text (Primary)**: `#1a1a1a` (Near black for high contrast)
- **Text (Secondary)**: `#4a4a4a`
- **Text (Muted)**: `#888888`
- **Border**: `rgba(0, 0, 0, 0.08)`

### Dark Mode (Alternative)
- **Background (Primary)**: `#111111`
- **Background (Secondary)**: `#1a1a1a`
- **Surface (Cards/Panels)**: `rgba(28, 28, 28, 0.92)`
- **Inputs**: `#1e1e1e`
- **Text (Primary)**: `#f0f0f0`
- **Text (Secondary)**: `#a0a0a0`
- **Text (Muted)**: `#666666`
- **Border**: `rgba(255, 255, 255, 0.08)`

### Accent Colors (Shared)
- **Hanko Red (Primary Accent)**: `#c53030` - Used for primary buttons, active tabs, and key highlights. Represents the traditional Japanese stamp (Hanko).
- **Red Glow**: `rgba(197, 48, 48, 0.12)`
- **Success (Green)**: `#16a34a`
- **Warning (Orange)**: `#d97706`
- **Error (Red)**: `#dc2626`

## 4. UI Components & Effects

### Glassmorphism (Background & Panels)
- **Body Background**: A fixed, monochromatic image of Mt. Fuji (`unsplash: 1493976040374-85c8e12f0c0e`) overlaid with a semi-transparent linear gradient to ensure text readability while letting the image peek through.
- **Panels/Cards**: Use `backdrop-filter: blur(10px)` with `rgba(255, 255, 255, 0.92)` background to create a frosted glass effect over the mountain background.
- **Settings Drawer**: Uses a stronger `blur(16px)` for distinct separation.

### Borders & Shadows
- **Radii**: 
  - Cards: 12px (`var(--radius-lg)`)
  - Buttons/Inputs: 8px (`var(--radius-sm)`)
- **Shadows**: Soft, diffuse shadows (`0 8px 30px rgba(0, 0, 0, 0.04)`) to lift cards off the background slightly.
- **Hover States**: Cards subtly increase border contrast (`rgba(0, 0, 0, 0.12)`) rather than heavy shadow shifts.

### Buttons
- **Primary**: Solid Hanko Red (`#c53030`) with white text and a soft red glow shadow. On hover, it brightens slightly and lifts (`translateY(-2px)`).
- **Secondary**: Light gray background (`#f5f4f1`) with primary text.
- **Translate/Copy**: Ghost buttons with subtle hover effects. Active/Translated states turn Green (`#16a34a`).
