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

function extractContent(html: string): string {
  let content = html;

  // Remove scripts
  content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Remove styles
  content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Remove comments
  content = content.replace(/<!--[\s\S]*?-->/g, '');
  // Remove SVG content (usually decorative)
  content = content.replace(/<svg[\s\S]*?<\/svg>/gi, '[SVG icon]');
  // Remove noscript
  content = content.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  // Collapse whitespace
  content = content.replace(/\s+/g, ' ').trim();

  // Truncate if too long (keep first ~30k chars to stay within context limits)
  if (content.length > 30000) {
    content = content.substring(0, 30000) + '\n[...content truncated...]';
  }

  return content;
}

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

    // Step 1: Fetch the source page
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let sourceHtml: string;
    try {
      const fetchResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!fetchResponse.ok) {
        return new Response(
          JSON.stringify({ error: `Failed to fetch page: HTTP ${fetchResponse.status}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      sourceHtml = await fetchResponse.text();
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      const msg = fetchErr?.name === 'AbortError' ? 'Request timed out' : (fetchErr?.message || 'Failed to fetch page');
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Extract meaningful content
    const extracted = extractContent(sourceHtml);

    // Step 3: Build user prompt
    let userPrompt = `Analyze and rebuild the following web page as a best-in-class implementation.\n\nSource URL: ${url}\n\nEXTRACTED PAGE CONTENT:\n${extracted}`;

    if (isMobile) {
      userPrompt += `\n\nIMPORTANT: The user is on a MOBILE device. Design mobile-first with single-column layout, responsive Tailwind classes, no horizontal scrolling.`;
    }

    // Step 4: Stream AI rebuild
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
            { role: "system", content: REBUILD_SYSTEM_PROMPT },
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
