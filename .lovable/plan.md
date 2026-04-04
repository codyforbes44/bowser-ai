

# Add GitHub Repository Rebuild Support

## Overview
Extend the existing rebuild flow so that when a user pastes a GitHub repository URL (e.g. `https://github.com/user/repo`) in Create mode, Bowser fetches the repo's key files via the GitHub API and asks the AI to rebuild the project as a best-in-class web implementation.

## How it works for the user
1. User is in **Create** mode
2. Pastes a GitHub URL like `https://github.com/shadcn/ui`
3. Bowser detects it's a GitHub repo, fetches README + key source files via GitHub's public API
4. AI analyzes the codebase and generates a polished, functional web page representing the project

## Technical approach

### 1. Update Edge Function: `rebuild-from-url`
**File:** `supabase/functions/rebuild-from-url/index.ts`

Add a GitHub detection branch at the top of the handler:
- Parse the URL — if hostname is `github.com` and path matches `/:owner/:repo`, treat as a GitHub repo
- Fetch via GitHub REST API (no auth needed for public repos, 60 req/hr):
  - `GET /repos/:owner/:repo` → repo metadata (description, stars, language, topics)
  - `GET /repos/:owner/:repo/readme` → decoded README content
  - `GET /repos/:owner/:repo/contents/` → root directory listing
  - Selectively fetch key files: `package.json`, `Cargo.toml`, `pyproject.toml`, `src/` index files (up to ~5 key files, staying under context limits)
- Assemble extracted content into a structured text block
- Use a **GitHub-specific system prompt** that instructs the AI to:
  - Analyze the project's purpose, features, tech stack, and README
  - Build a stunning landing/showcase page for the project
  - Include: hero section, feature highlights, installation/usage, tech stack badges, navigation
  - Preserve all meaningful content from README
- Stream the AI response identically to the existing web rebuild flow

### 2. Update Navigation Detection
**File:** `src/bowser/utils/navigation.ts`

The existing URL regex already matches `github.com/user/repo`, so it already triggers `rebuild: true` in Create mode. No changes needed here — GitHub URLs are valid URLs and already route to the rebuild flow.

### 3. No other file changes needed
The `streamPageRebuild` service, `useAIGenerate.rebuild()`, and `useOmnibox` already handle the full rebuild pipeline. The only change is server-side in the edge function.

## Files to modify

| File | Change |
|---|---|
| `supabase/functions/rebuild-from-url/index.ts` | Add GitHub URL detection, API fetching, and GitHub-specific prompt |

## Edge cases handled
- Private repos → returns a clear error ("This repository is private or doesn't exist")
- Rate limiting (GitHub 403) → returns friendly message
- Repos with no README → falls back to file listing + metadata only
- Very large repos → fetches only root listing + README + up to 5 key config/source files, truncating to ~30k chars total

