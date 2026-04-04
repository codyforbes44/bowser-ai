import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REBUILD_SYSTEM_PROMPT = `
You are powered by Gemini 3 Flash, a state-of-the-art model. You analyze existing web pages and rebuild them as best-in-class implementations.

TASK:
You will receive the extracted content from a real web page. Your job is to analyze its purpose, structure, and content, then recreate it as a polished, modern, best-in-class implementation that dramatically improves the original.

STRUCTURE:
Return a full HTML document:

<html>
<head>
  <title>SiteName - Page Name</title>
  <meta name="color-scheme" content="light">
  <link href="https://fonts.googleapis.com/css2?family=ChosenFont:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Chosen Font', sans-serif">
  ...rebuilt page content...
</body>
</html>

Keep the <head> minimal — just <title>, <meta name="color-scheme">, and a Google Fonts <link>. Tailwind CSS and scripts are injected automatically.
The <title> format is: "SiteName - PageName" eg. "Apple - Home".
Set color-scheme to "light" or "dark" — choose whichever best suits the brand.

DESIGN PRINCIPLES:
- Analyze the original page's purpose and recreate it with dramatically improved design
- Use Tailwind CSS utility classes for all styling
- Choose a Google Font that elevates the brand (not generic sans-serif)
- Use Material Symbols for icons: <span class="material-symbols-outlined">icon_name</span>
- Create a cohesive color palette inspired by (but improving on) the original
- Use generous whitespace, strong visual hierarchy, and modern layout patterns
- Add subtle micro-interactions where appropriate (hover states, transitions)
- Use CSS gradients, inline SVGs, or emoji as image placeholders
- Ensure full accessibility (proper contrast, semantic HTML, ARIA labels)

CONTENT:
- Preserve ALL meaningful content from the original (text, headings, navigation items, features, etc.)
- Improve copy where it's unclear or could be more compelling
- Maintain the same information architecture but improve the visual presentation
- Keep the same navigation structure with <a href="..."> tags

NAVIGATION:
Use <a href="..."> tags with descriptive path-like hrefs.

INTERACTIVITY:
For actions that change page state, call:
  window.BowserAPI.performAction('Description of intent', 'Optional payload')

GOAL: The rebuilt page should look like it was designed by a top-tier design agency — clean, modern, polished, and delightful to use.
`;

const GITHUB_SYSTEM_PROMPT = `
You are powered by Gemini 3 Flash, a state-of-the-art model. You analyze GitHub repositories and build stunning, best-in-class web showcases for them.

TASK:
You will receive metadata, README content, and key source files from a GitHub repository. Your job is to analyze the project's purpose, features, and tech stack, then create a polished, modern landing page / showcase that represents the project beautifully.

STRUCTURE:
Return a full HTML document:

<html>
<head>
  <title>ProjectName - Overview</title>
  <meta name="color-scheme" content="dark">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Inter', sans-serif">
  ...showcase page content...
</body>
</html>

Keep the <head> minimal — just <title>, <meta name="color-scheme">, and a Google Fonts <link>. Tailwind CSS and scripts are injected automatically.
Choose light or dark color-scheme based on the project's branding.

PAGE SECTIONS TO INCLUDE:
1. **Hero Section** — Project name, tagline/description, star count badge, primary CTA buttons (GitHub link, docs link if available)
2. **Key Features** — Extract features from README and present as a beautiful feature grid with icons
3. **Tech Stack** — Show languages, frameworks, dependencies as styled badges/pills
4. **Installation / Quick Start** — Code blocks with install commands from README, styled beautifully
5. **Usage Examples** — Key code examples from README in syntax-highlighted blocks
6. **Project Stats** — Stars, forks, language breakdown, license
7. **Contributing / Links** — Links back to GitHub, issues, discussions

DESIGN PRINCIPLES:
- Use Tailwind CSS utility classes for all styling
- Choose a Google Font that fits the project's vibe (developer tools → Inter/JetBrains Mono, creative → Poppins, etc.)
- Use Material Symbols for icons: <span class="material-symbols-outlined">icon_name</span>
- Create a stunning color palette that fits the project's identity
- Use generous whitespace, strong visual hierarchy, and modern layout patterns
- For code blocks, use <pre><code> with appropriate styling (dark bg, monospace font, padding)
- Add subtle animations and hover effects
- Use CSS gradients and inline SVGs for visual flair
- Ensure full accessibility (proper contrast, semantic HTML, ARIA labels)

CONTENT:
- Extract ALL meaningful information from the README and metadata
- Improve and polish the copy to be more compelling
- Present technical information in an accessible, visually appealing way
- Make code examples easy to read and copy

NAVIGATION:
Use <a href="..."> tags. Link back to the actual GitHub repo URL where appropriate.

INTERACTIVITY:
For actions that change page state, call:
  window.BowserAPI.performAction('Description of intent', 'Optional payload')

GOAL: The page should look like a premium open-source project landing page — think Tailwind CSS's homepage, Vercel's showcases, or Stripe's documentation. Clean, modern, and developer-friendly.
`;

// --- GitHub helpers ---

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  license: { spdx_id: string } | null;
  html_url: string;
  homepage: string | null;
  default_branch: string;
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com' && u.hostname !== 'www.github.com') return null;
    const parts = u.pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
    if (parts.length < 2 || !parts[0] || !parts[1]) return null;
    // Ignore paths like /user/repo/tree/... — just take owner/repo
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
  } catch {
    return null;
  }
}

async function fetchGitHub(path: string): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Bowser-AI/1.0',
    },
  });
}

async function fetchGitHubContent(owner: string, repo: string): Promise<string> {
  // Fetch repo metadata
  const repoRes = await fetchGitHub(`/repos/${owner}/${repo}`);
  if (!repoRes.ok) {
    if (repoRes.status === 404) throw new Error('GITHUB_NOT_FOUND');
    if (repoRes.status === 403) throw new Error('GITHUB_RATE_LIMITED');
    throw new Error(`GitHub API error: ${repoRes.status}`);
  }
  const repoData: GitHubRepo = await repoRes.json();

  let sections: string[] = [];

  // Metadata section
  sections.push(`# Repository: ${repoData.full_name}`);
  sections.push(`Description: ${repoData.description || 'No description'}`);
  sections.push(`Stars: ${repoData.stargazers_count} | Forks: ${repoData.forks_count}`);
  sections.push(`Language: ${repoData.language || 'Unknown'}`);
  if (repoData.topics?.length) sections.push(`Topics: ${repoData.topics.join(', ')}`);
  if (repoData.license) sections.push(`License: ${repoData.license.spdx_id}`);
  if (repoData.homepage) sections.push(`Homepage: ${repoData.homepage}`);
  sections.push(`URL: ${repoData.html_url}`);
  sections.push('');

  // Fetch README
  try {
    const readmeRes = await fetchGitHub(`/repos/${owner}/${repo}/readme`);
    if (readmeRes.ok) {
      const readmeData = await readmeRes.json();
      if (readmeData.content) {
        const decoded = atob(readmeData.content.replace(/\n/g, ''));
        sections.push('## README\n');
        // Truncate if very long
        sections.push(decoded.length > 20000 ? decoded.substring(0, 20000) + '\n[...truncated...]' : decoded);
        sections.push('');
      }
    }
  } catch { /* skip */ }

  // Fetch root directory listing
  const keyFiles = ['package.json', 'Cargo.toml', 'pyproject.toml', 'go.mod', 'composer.json', 'Gemfile', 'pom.xml', 'build.gradle'];
  try {
    const contentsRes = await fetchGitHub(`/repos/${owner}/${repo}/contents/`);
    if (contentsRes.ok) {
      const files: Array<{ name: string; type: string; size: number }> = await contentsRes.json();
      sections.push('## Root Files\n');
      sections.push(files.map(f => `${f.type === 'dir' ? '📁' : '📄'} ${f.name}`).join('\n'));
      sections.push('');

      // Fetch key config files
      let fetched = 0;
      for (const file of files) {
        if (fetched >= 5) break;
        if (file.type === 'file' && keyFiles.includes(file.name) && file.size < 50000) {
          try {
            const fileRes = await fetchGitHub(`/repos/${owner}/${repo}/contents/${file.name}`);
            if (fileRes.ok) {
              const fileData = await fileRes.json();
              if (fileData.content) {
                const content = atob(fileData.content.replace(/\n/g, ''));
                sections.push(`## ${file.name}\n\`\`\`\n${content.substring(0, 5000)}\n\`\`\`\n`);
                fetched++;
              }
            }
          } catch { /* skip */ }
        }
      }
    }
  } catch { /* skip */ }

  let result = sections.join('\n');
  if (result.length > 30000) {
    result = result.substring(0, 30000) + '\n[...content truncated...]';
  }
  return result;
}

// --- Web page helpers ---

function extractContent(html: string): string {
  let content = html;
  content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
  content = content.replace(/<!--[\s\S]*?-->/g, '');
  content = content.replace(/<svg[\s\S]*?<\/svg>/gi, '[SVG icon]');
  content = content.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  content = content.replace(/\s+/g, ' ').trim();
  if (content.length > 30000) {
    content = content.substring(0, 30000) + '\n[...content truncated...]';
  }
  return content;
}

async function fetchWebPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err: any) {
    clearTimeout(timeout);
    throw new Error(err?.name === 'AbortError' ? 'Request timed out' : (err?.message || 'Failed to fetch page'));
  }
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, isMobile } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return new Response(
        JSON.stringify({ error: 'Only HTTP(S) URLs are supported' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Determine if GitHub repo
    const ghParsed = parseGitHubUrl(url);
    let extracted: string;
    let systemPrompt: string;

    if (ghParsed) {
      // GitHub flow
      try {
        extracted = await fetchGitHubContent(ghParsed.owner, ghParsed.repo);
      } catch (err: any) {
        if (err.message === 'GITHUB_NOT_FOUND') {
          return new Response(
            JSON.stringify({ error: 'This repository is private or doesn\'t exist.' }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (err.message === 'GITHUB_RATE_LIMITED') {
          return new Response(
            JSON.stringify({ error: 'GitHub API rate limit reached. Please try again in a few minutes.' }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw err;
      }
      systemPrompt = GITHUB_SYSTEM_PROMPT;
    } else {
      // Web page flow
      let sourceHtml: string;
      try {
        sourceHtml = await fetchWebPage(url);
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      extracted = extractContent(sourceHtml);
      systemPrompt = REBUILD_SYSTEM_PROMPT;
    }

    // Build user prompt
    let userPrompt = ghParsed
      ? `Analyze this GitHub repository and build a stunning showcase/landing page for it.\n\nRepository URL: ${url}\n\nREPOSITORY DATA:\n${extracted}`
      : `Analyze and rebuild the following web page as a best-in-class implementation.\n\nSource URL: ${url}\n\nEXTRACTED PAGE CONTENT:\n${extracted}`;

    if (isMobile) {
      userPrompt += `\n\nIMPORTANT: The user is on a MOBILE device. Design mobile-first with single-column layout, responsive Tailwind classes, no horizontal scrolling.`;
    }

    // Stream AI rebuild
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: true,
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await aiResponse.text();
      console.error("AI gateway error:", status, text);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("rebuild-from-url error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
