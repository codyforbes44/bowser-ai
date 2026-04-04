

# Bowser 2029: Best-in-Class Agentic Browser Platform Optimization

## Context: What the Uploaded Repos Tell Us

The uploaded repositories are Google Cloud reference implementations spanning:
- **java-docs-samples / python-docs-samples / golang-samples** — Cloud AI, Vertex AI, Gemini multimodal, document processing, speech, translation, Cloud Functions patterns
- **DataflowTemplates** — Large-scale data pipeline orchestration patterns
- **scion-main** — Next-gen internet architecture (path-aware networking, multi-path routing)
- **gke-mcp** — Model Context Protocol for Kubernetes — the emerging standard for agentic tool use

These repos collectively represent the building blocks of a 2029-class agentic system: **multimodal AI, tool-use protocols (MCP), data pipelines, and next-gen networking**. Here's how to apply them to Bowser.

---

## Phase 1: Agentic Core — Multi-Step Task Execution

**Problem**: Bowser currently generates single pages per prompt. A 2029 browser needs autonomous multi-step task completion.

### 1.1 Add an Agent Loop to the Edge Function Layer
- **New edge function: `agent-execute`** — accepts a goal, maintains a scratchpad, and iterates: plan → act → observe → reflect
- Uses tool-calling (inspired by gke-mcp's MCP patterns) to chain: web search → page generation → data extraction → follow-up actions
- Returns streaming progress updates via SSE (reusing existing streaming infra)

### 1.2 Add Tool Definitions for the Agent
Inspired by MCP's tool schema pattern, define tools the agent can invoke:
- `browse_url` — fetch and extract content from a URL
- `search_web` — perform a search query
- `generate_page` — create a page from a prompt
- `extract_data` — pull structured data from HTML (using Gemini JSON mode, per the python/java samples)
- `analyze_image` — multimodal analysis (per Vertex AI patterns in the samples)

### 1.3 Client-Side Agent UI
- New tab kind: `agent` — shows a task timeline with steps, intermediate results, and final output
- Collapsible step cards showing what the agent did at each stage
- User can intervene, redirect, or approve at any step

**Files**: New `supabase/functions/agent-execute/index.ts`, new `src/bowser/components/AgentView.tsx`, update `types.ts` with `TabKind = 'agent'`

---

## Phase 2: Multimodal Intelligence

**Problem**: Bowser only processes text. The sample repos show Gemini's vision, document, and audio capabilities.

### 2.1 Image/Screenshot Analysis
- Allow users to paste or upload images in the omnibox
- Edge function sends image + prompt to Gemini multimodal endpoint
- Generate pages that respond to visual input ("rebuild this screenshot", "what's in this image")

### 2.2 Document Processing
- Accept PDF/DOCX uploads in Create mode
- Extract content server-side, feed to AI for analysis or rebuild
- Display results as rich AI-generated pages

### 2.3 Voice Input
- Add microphone button to the omnibox (Web Speech API, already available in browsers)
- Transcribe → route through existing omnibox pipeline
- Critical for mobile-first UX

**Files**: Update `AddressBar.tsx` (voice/image buttons), new `supabase/functions/analyze-multimodal/index.ts`

---

## Phase 3: Persistent Memory and Context

**Problem**: Each generation is stateless. No cross-session learning.

### 3.1 Conversation Context per Tab
- Store a rolling context window (last 5 interactions) per tab
- Pass conversation history to the AI, enabling "refine this", "add a section about X", "make it darker"
- Stored in-memory per session, optionally persisted to database for logged-in users

### 3.2 User Profile & Preferences Learning
- Database table: `user_preferences` — stores learned style preferences, frequently used sites, preferred color schemes
- Edge functions reference these preferences in system prompts
- "Bowser learns how you like things"

**Files**: Update `generate-page/index.ts` to accept conversation history, update `useAIGenerate.ts` to track context, new DB migration for preferences

---

## Phase 4: Mobile-First Platform Hardening

**Problem**: Several mobile UX gaps exist in the current implementation.

### 4.1 Gesture Navigation Enhancements
- Add pull-to-refresh gesture (currently only swipe left/right for tabs)
- Long-press on links for a context menu (open in new tab, copy, rebuild)
- Pinch-to-zoom awareness in the sandbox iframe

### 4.2 Offline-First with Service Worker Caching
- Cache recently generated pages in the service worker for offline access
- Show cached content with a "you're offline" banner
- Queue prompts for when connectivity returns

### 4.3 Performance Optimizations
- **Virtualize tab rendering** — only mount the active tab's content, unmount others
- **Lazy-load the sandbox iframe** — defer Tailwind CDN load until first AI generation
- **Streaming HTML rendering** — inject chunks into the sandbox as they arrive instead of replacing innerHTML (reduces perceived latency)
- **Preconnect hints** — add `<link rel="preconnect">` for fonts.googleapis.com and the AI gateway

### 4.4 PWA Enhancements
- Add share target support (receive shared URLs/text from other apps → auto-rebuild)
- Add shortcuts manifest entries for "New Tab", "Create Page"
- Background sync for queued agent tasks

**Files**: Update `vite.config.ts` (PWA manifest), `Sandbox.tsx` (streaming injection), `BowserApp.tsx` (gesture handlers), `index.html` (preconnect)

---

## Phase 5: Advanced Web Proxy & Data Pipeline

**Problem**: The proxy is basic — no JS rendering, limited content extraction.

### 5.1 Enhanced Content Extraction
- Improve `extractContent` in `rebuild-from-url` to preserve semantic structure (headings, lists, tables, images with alt text)
- Add Readability-style main content extraction (strip nav/footer/ads)
- Extract Open Graph metadata for richer breadcrumbs and previews

### 5.2 Multi-Page Crawl for Rebuild
- Inspired by the Dataflow pipeline patterns: when rebuilding a site, optionally crawl 3-5 key pages (homepage + nav links) to build a more complete rebuild
- Present as a multi-page AI-generated site with working internal navigation

### 5.3 GitHub Deep Analysis
- Fetch more than just README — analyze `src/` structure, extract component patterns, API routes
- For monorepos, detect and present sub-packages
- Generate interactive documentation, not just a landing page

**Files**: Update `rebuild-from-url/index.ts`, potentially new `crawl-site/index.ts` edge function

---

## Phase 6: Cross-Device Sync & Collaboration

### 6.1 Cloud Sync (requires auth)
- Sync tabs, bookmarks, history, and agent task results across devices via database
- Real-time sync using existing Supabase realtime infrastructure

### 6.2 Shareable Pages
- Generated pages can be saved to a public URL
- Share button in the address bar → generates a permalink

**Files**: New DB tables (`saved_pages`, `user_sessions`), update `BowserApp.tsx` for sync logic

---

## Implementation Priority (Mobile-First)

| Priority | Phase | Impact | Effort |
|----------|-------|--------|--------|
| 1 | 4.1-4.4 Mobile hardening | High | Medium |
| 2 | 2.3 Voice input | High | Low |
| 3 | 3.1 Conversation context | High | Medium |
| 4 | 1.1-1.3 Agent loop | Very High | High |
| 5 | 5.1-5.2 Enhanced extraction | Medium | Medium |
| 6 | 2.1-2.2 Multimodal | High | Medium |
| 7 | 6.1-6.2 Sync & sharing | Medium | High |

---

## Recommended Starting Point

Begin with **Phase 4 (Mobile Hardening)** + **Phase 3.1 (Conversation Context)** as they provide the highest immediate value with moderate effort. Then proceed to **Phase 1 (Agent Loop)** which is the transformative feature that makes Bowser a true 2029-class agentic browser.

Shall I proceed with implementing any specific phase?

