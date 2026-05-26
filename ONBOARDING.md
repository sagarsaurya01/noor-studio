# Noor Studio — Session Starter

> AI-powered content creation SaaS. One input (topic or video link) → transcript → scripts → storyboard → B-roll frames.  
> Currently local-only (no cloud, no auth, no billing). Built for testing.

---

## How to Start the App

```bat
# Always use start.bat — NOT npm run dev directly
# (Next.js 16 reads .env.local from wrong dir; start.bat injects the API key)

C:\Users\sagar\Downloads\noor-studio\start.bat
```

Then open: **http://localhost:3000/dashboard**

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js **16.2.6**, App Router, Turbopack |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`) + Geist font |
| AI (scripts) | Anthropic `claude-sonnet-4-6` via `@anthropic-ai/sdk ^0.96.0` |
| Transcription | yt-dlp (captions) → OpenAI Whisper `tiny` (Python, fallback) |
| Video/frames | FFmpeg 8.0.1 + ffprobe (B-roll extraction) |
| Storage | Local JSON file — `data/projects.json` (no database) |
| PDF export | jsPDF ^4.2.1 |

---

## Project Structure

```
noor-studio/
├── app/
│   ├── api/
│   │   ├── download/route.ts      # yt-dlp: captions → Whisper fallback
│   │   ├── transcribe/route.ts    # Python Whisper tiny model
│   │   ├── generate/route.ts      # Claude: brief + 3 scripts + storyboard
│   │   ├── extract/route.ts       # FFmpeg: frames + B-roll clips
│   │   ├── projects/route.ts      # GET all projects
│   │   └── projects/[id]/route.ts # GET + PATCH single project
│   ├── dashboard/page.tsx         # Sidebar + card grid
│   ├── new/page.tsx               # New project flow (topic / video)
│   ├── project/[id]/page.tsx      # Scripts + Storyboard + B-Roll tabs
│   ├── globals.css                # Design system (glass, btn-primary, noise, etc.)
│   └── layout.tsx                 # Geist + Geist Mono fonts, noise class on body
├── lib/
│   └── local-store.ts             # getAllProjects / getProject / saveProject / updateProject
├── data/
│   └── projects.json              # All project data (auto-created)
├── public/
│   └── extracted/[projectId]/     # B-roll frames (JPG) + clips (MP4) — served statically
├── start.bat                      # Sets ANTHROPIC_API_KEY + starts dev server
└── next.config.ts                 # Turbopack root fix (workspace root bug)
```

---

## What's Been Built ✅

### Core Flow
- [x] **Topic mode** — user types an idea → Claude generates brief + 3 script variations + storyboard
- [x] **Video mode** — paste any link → yt-dlp extracts captions (fast path, ≥150 words) → Whisper fallback → editable transcript → Claude generates scripts
- [x] **Transcript-ready screen** — user can edit transcript before generating
- [x] **Project page** — 3 tabs: Scripts, Storyboard, B-Roll

### API Routes
- [x] `/api/download` — yt-dlp captions → Whisper audio fallback; VTT deduplication parser
- [x] `/api/transcribe` — Python Whisper `tiny` via temp script file (avoids Windows shell escaping issues)
- [x] `/api/generate` — Claude brief + scripts + storyboard; stores `thumbnail_url` (Unsplash stock photo from B-roll keyword)
- [x] `/api/extract` — FFmpeg: downloads 720p video → 1 JPG frame/5s → 5s B-roll clips every 30s → deletes original video → saves to `public/extracted/[id]/`
- [x] `/api/projects` + `/api/projects/[id]` — full CRUD on local JSON

### UI / Design
- [x] **Dashboard** — fixed sidebar (220px) + full-width card grid; sidebar has nav + stats
- [x] **Project cards** — smart thumbnail (B-roll frame → YouTube CDN thumbnail → Unsplash stock → gradient fallback); status badge; type icon
- [x] **New project page** — mode selector, transcribing animation, generating step timeline
- [x] **Project page** — hook/body/CTA card layout; storyboard scenes; B-roll gallery with download; PDF export
- [x] **Design system** — `globals.css`: `.glass`, `.btn-primary` (shine sweep), `.btn-ghost`, `.input-glass`, `.noise` grain texture, custom scrollbar, `pulse-ring` animation
- [x] **Thumbnail system** — `thumbnail_url` stored per project at generation time using `storyboard[0].broll_keyword` → Unsplash source URL

### Infrastructure Fixes (already solved — don't redo)
- [x] Next.js 16 workspace root bug → `start.bat` injects `ANTHROPIC_API_KEY` directly
- [x] Turbopack root path → `next.config.ts` has `turbopack: { root: __dirname }`
- [x] YouTube caption deduplication → block-by-block VTT parser with consecutive-duplicate removal
- [x] Claude returning markdown-wrapped JSON → `.replace(/```json/g, '')` before `JSON.parse`
- [x] Windows Python inline script errors → temp `.py` file approach in transcribe route
- [x] System freeze from Whisper → all heavy tools (Whisper, FFmpeg, yt-dlp) run as `child_process`, not inside Node

---

## What Still Needs to Be Done 🔲

### High Priority ✅ Done
- [x] **Regenerate scripts** — tone chips + angle hint, updates existing project in-place
- [x] **Script inline editing** — textarea edit + PATCH save per variation
- [x] **Copy to clipboard** — per-card copy button, 2s "Copied!" feedback
- [x] **Thumbnail backfill** — old projects auto-generate Unsplash URL from title on dashboard load
- [x] **Delete project** — trash icon on card hover + "Sure? Yes/No" inline confirm
- [x] **Re-extract confirmation** — warns before overwriting existing B-roll frames
- [x] **Better Whisper model** — switched from `tiny` to `base` for better accuracy

### Medium Priority ✅ Done
- [x] **Platform-specific formatting** — 4 platforms (Reels, Shorts, TikTok, LinkedIn) with tailored Claude prompts
- [x] **Hashtag generator** — 15 platform-matched hashtags in Publish tab
- [x] **Caption/description generator** — post caption + first comment in Publish tab

### Future / Phase 2
- [ ] **User authentication** — Supabase auth was removed; currently no login wall
- [ ] **Cloud storage** — move from `data/projects.json` to a real DB (Supabase, PlanetScale, etc.) for multi-device / multi-user
- [ ] **Cloud deployment** — Vercel won't run yt-dlp/FFmpeg/Python; needs a VPS (Railway, Render, DigitalOcean) or Docker container
- [ ] **Voice-over generation** — TTS (ElevenLabs, Suno, or browser SpeechSynthesis) to preview the script as audio
- [ ] **Team / workspace** — multiple users sharing projects
- [ ] **Scheduling / publishing** — post directly to Instagram, YouTube, TikTok via APIs
- [ ] **Analytics** — track which scripts get selected, which content performs best

---

## Known Quirks / Gotchas

| Issue | Notes |
|---|---|
| `start.bat` required | Never run `npm run dev` directly — the API key won't load |
| `data/projects.json` | If corrupted, delete the file — app recreates it as `[]` |
| Whisper first run | Downloads the `tiny` model (~75MB) on first transcription — wait for it |
| B-roll extraction time | 1–3 min depending on video length; FFmpeg runs in background, page stays live |
| Unsplash thumbnails | `source.unsplash.com` URLs redirect to a stock photo; may occasionally be slow to load |
| Old projects | Projects created before `thumbnail_url` was added show gradient cards — create new ones for photo thumbnails |
| Non-YouTube videos | Only YouTube links get a platform thumbnail (CDN trick); others skip straight to Unsplash |
| Windows paths | FFmpeg/yt-dlp commands use quoted Windows paths — don't change path handling without testing |

---

## Environment Variables

Only one required. Set in `start.bat` (already done):

```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

No Supabase, no Pexels, no OpenAI keys needed for current functionality.

---

## Data Model (`lib/local-store.ts`)

```typescript
type Project = {
  id: string                   // randomUUID()
  title: string                // Claude-generated short title
  input_type: 'topic' | 'video'
  topic?: string               // if topic mode
  video_url?: string           // if video mode
  transcript?: string          // extracted or Whisper transcript
  brief: {
    topic: string; angle: string; tone: string
    target_audience: string; hook_type: string
  }
  scripts: Array<{
    variation: number; hook: string; body: string; cta: string
  }>
  storyboard: Array<{
    scene: number; duration: string; visual: string
    on_screen_text: string; broll_keyword: string; voiceover: string
  }>
  selected_script: number      // index of selected variation (0-2)
  status: 'draft' | 'completed'
  created_at: string           // ISO timestamp
  thumbnail_url?: string       // Unsplash URL from storyboard[0].broll_keyword
}
```
