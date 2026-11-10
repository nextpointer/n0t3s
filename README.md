<h1 align="center">📝 N0T3S</h1>

<div align="center">

![Bun](https://img.shields.io/badge/Bun-F472B6?style=flat&logo=bun&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat&logo=tailwind-css&logoColor=white)
![Upstash](https://img.shields.io/badge/Upstash-000000?style=flat&logo=upstash&logoColor=white)

</div>

<p align="center">
  <b>A fast, minimal, local-first note-taking app with AI and exports.</b>
</p>

---

## 🚀 Tech Stack

| Frontend | Styling | Runtime / Tooling | Services |
| --- | --- | --- | --- |
| Next.js 15, React | Tailwind CSS, Radix/shadcn UI | Bun, TypeScript | Groq (AI), Upstash Redis (rate limiting) |

---

## ✨ Features

- **Notes:** create, edit, delete, search, and organize notes locally (IndexedDB/local-first)
- **Markdown editor:** write in markdown with edit/read modes, formatting tools, and inline `#tags`
- **AI tools:** summarize, rewrite, fix grammar, expand, simplify, convert to todos, edit by prompt, and generate titles (Groq-powered, configurable model)
- **Selection actions:** quick AI/edit actions from selected text (with safety limits)
- **Export & share:** export notes as **Markdown**, **Text**, **HTML**, **PDF**, or **Image**, plus copy/share (where supported)
- **Productivity & UX:** autosave, command palette, zen mode, keyboard shortcuts, and mobile-friendly context actions
- **Safety/performance guards:** note and AI input size limits with user-facing warnings to prevent lag/oversized requests

---

## 📦 Installation

```bash
# 1️⃣ Clone the repository
git clone https://github.com/nextpointer/n0t3s.git
cd n0t3s

# 2️⃣ Install dependencies
bun install

# 3️⃣ Set up environment variables
cp .env.example .env.local

# 4️⃣ Run the development server
bun dev
```

### Environment variables

Configure `.env.local` (see `.env.example`) as needed:

- `GROQ_API_KEY` – API key for AI features
- `GENAI_MODEL` – optional model override (defaults to a fast Groq model in code)
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` – for API rate limiting

---

## 🎯 Usage

- Create a new note and start writing in markdown
- Use inline `#tags` in content for organization
- Use AI actions from the editor/selection or dialogs
- Export a note as Markdown, Text, HTML, PDF, or Image from the export menu

---

<p align="center">Made with ❤️ using <b>Next.js</b> & <b>Bun</b></p>
