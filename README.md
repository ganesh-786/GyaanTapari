# CurioPal/ ज्ञान टपरी — Project README

<p align="center">
  <img width="200" height="200" alt="Gyan Tapari" src="https://github.com/user-attachments/assets/509b1f46-3dd4-47b2-8362-1ef8561a1059" />
</p>

> **CurioPal / ज्ञान टपरी**  — kid-friendly learning dashboard (sample app included).
> Copy-ready `README.md` for your repo: setup, design tokens, sample code snippets, Gemini prompts, testing & deployment guidance.

---

# Table of contents

1. [Project overview](#project-overview)
2. [Features (sample)](#features-sample)
3. [Tech stack](#tech-stack)
4. [Quick start](#quick-start)
5. [Local development](#local-development)
6. [Recommended folder structure](#recommended-folder-structure)
7. [Key components (single-file sample)](#key-components-single-file-sample)
8. [Design tokens & Tailwind config snippet](#design-tokens--tailwind-config-snippet)
9. [Gemini prompt templates (age-safe)](#gemini-prompt-templates-age-safe)
10. [Testing & CI](#testing--ci)
11. [Deployment](#deployment)
12. [Analytics & privacy notes](#analytics--privacy-notes)
13. [Contributing](#contributing)
14. [License](#license)

---

# Project overview

CurioPal is a lightweight, mobile-first React app for young learners. The sample component (`CurioPal_Sample_App.jsx`) demonstrates core flows: a Home dashboard, Quick Quiz, Hangman game, and a simple Profile/Badge shelf. UI is Tailwind-ready and designed for tablets/phones.

---

# Features (sample)

* Subject cards (Math, Science, Vocab)
* One-question quick quiz with star rewards
* Hangman game with lives and guessed letters
* Profile screen: stars, badges, streak
* Mascot and playful microcopy for encouragement

---

# Tech stack

* Frontend: React (Vite recommended)
* Styling: Tailwind CSS
* Optional: Firebase (Auth + Firestore), Lottie animations
* Testing: Jest / React Testing Library, Cypress (E2E)
* AI (optional): Gemini (GenAI API) — use server-side and filter outputs

---

# Quick start

## 1. Create a new Vite + React project

```bash
npm create vite@latest curiopal -- --template react
cd curiopal
npm install
```

## 2. Install Tailwind

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Add Tailwind directives to `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 3. Add the sample component

Copy `CurioPal_Sample_App.jsx` into `src/components/CurioPal_Sample_App.jsx` and render it from `src/main.jsx`:

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import CurioPalSampleApp from "./components/CurioPal_Sample_App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CurioPalSampleApp />
  </React.StrictMode>
);
```

## 4. Run dev server

```bash
npm run dev
# or
pnpm dev
```

---

# Local development

Recommended `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "test": "vitest run",
    "storybook": "storybook dev -p 6006",
    "cypress:open": "cypress open"
  }
}
```

### Tips

* Use Storybook for visual testing of components.
* Lazy-load heavy components or games.
* Keep small units of state (useContext + useReducer or Zustand).

---

# Recommended folder structure

```
curiopal/
├─ public/
├─ src/
│  ├─ assets/
│  ├─ components/
│  │  ├─ CurioPal_Sample_App.jsx   # single-file demo
│  │  ├─ SubjectCard.jsx
│  │  ├─ QuizCard.jsx
│  │  ├─ HangmanGame.jsx
│  │  └─ BadgeShelf.jsx
│  ├─ hooks/
│  ├─ pages/
│  ├─ services/                    # api, ai, persistence wrappers
│  ├─ styles/
│  │  └─ tailwind.css
│  ├─ utils/
│  └─ main.jsx
├─ .env.local
├─ tailwind.config.cjs
└─ package.json
```

---

# Key components (single-file sample)

The single-file demo contains:

* `Topbar` — brand + star counter
* `Home` — mission banner + subject carousel + actions
* `Quiz` — question, options, feedback
* `Hangman` — word selection, guessed letters, lives
* `Profile` — stars, badges, streak
* Utilities: `Footer`, `Mascot`

**Refactor plan**

1. Move each block into its own file under `src/components/`.
2. Add TypeScript or PropTypes.
3. Create Storybook stories for each component.

---

# Design tokens & Tailwind config snippet

### Color tokens

* Primary: `#2596be`
* Accent / Reward: `#FFB86B`
* Secondary: `#8FE3C5`
* Dark text: `#123A5B`
* Soft bg: `#F6FBFF`

### tailwind.config.cjs (snippet)

```js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2596be",
          light: "#8BD1E8",
          dark: "#123A5B"
        },
        accent: "#FFB86B",
        success: "#8FE3C5",
        bg: "#F6FBFF"
      },
      fontFamily: {
        sans: ["Poppins", "Nunito", "system-ui", "sans-serif"],
        display: ["Fredoka", "Baloo 2", "sans-serif"]
      },
      borderRadius: {
        xl: "1rem",
        '2xl': "1.5rem"
      }
    }
  },
  plugins: []
}
```

---

# Gemini prompt templates (age-safe)

> Run these server-side. Sanitize and filter outputs before displaying to children.

## 1) Generate 5 easy fraction questions (age 8)

```
SYSTEM: You are a friendly tutor for 8-year-old children. Use very simple language. If uncertain or sensitive, reply "Ask an adult."
PROMPT: Create 5 multiple-choice questions about simple fractions for 8-year-olds. For each item include:
- question text
- 4 options labeled A–D
- the correct answer letter
- a one-sentence explanation suitable for an 8-year-old
Return as JSON array.
```

## 2) Create 10 hangman words for Grade 3 (animals)

```
SYSTEM: You are a friendly game word generator for kids. Only include single words, no proper nouns.
PROMPT: Generate 10 single-word animal names suitable for Grade 3 hangman. Return as a JSON array of lowercase words.
```

## 3) Safety check (teacher review)

```
SYSTEM: You are a content-safety assistant. Given text, flag if any content is inappropriate for ages 6–10.
PROMPT: {user_generated_text}
Expected output: {"safe": true/false, "reasons": ["..."]}
```

---

# Testing & CI

## Unit & integration

* Jest + React Testing Library for components and logic.

## Visual

* Storybook for interactive UI previews.
* Chromatic (optional) for visual diffs.

## E2E

* Cypress to verify onboarding → quiz → badge flows.

## Sample GitHub Actions (basic)

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v2
      with:
        version: 8
    - run: pnpm install
    - run: pnpm lint
    - run: pnpm test
    - run: pnpm build
```

---

# Deployment

* Static SPA: Vercel or Netlify (recommended)
* Server / API: Vercel serverless functions, Render, or a small Node server (for Gemini proxy + content filtering)
* Use CDN for static assets, compress SVG/Lottie files, enable Brotli/GZIP.

---

# Analytics & privacy notes

* For a kids product, follow privacy-first rules:

  * Minimize PII collection (do not collect name/age unless necessary).
  * Provide parental consent flows and an easy privacy page.
  * Allow parents to request deletion of their child's data.
* Track anonymized metrics only: daily active sessions, session length, subject engagement, and completion rates.

---

# Contributing

1. Fork the repo
2. Create a branch: `feature/your-feature`
3. Add tests and update Storybook
4. Open a PR with a clear description and screenshots

Add `CODE_OF_CONDUCT.md` and `CONTRIBUTING.md` to guide contributors.

---

# License

Choose a license for your project. Example (MIT):

```
MIT License

Copyright (c) 2025 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

