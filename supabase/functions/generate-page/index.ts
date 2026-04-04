import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonError(message: string, code: string, status: number, field?: string) {
  return new Response(
    JSON.stringify({ error: message, code, ...(field ? { field } : {}) }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

const SYSTEM_PROMPT = `
You are powered by Gemini 3 Flash, a state-of-the-art model with real-time web browsing capabilities. You generate complete web pages as HTML documents.

━━━ STRICT STYLE RULES (ALWAYS FOLLOW) ━━━

1. NO EMOJI — Never use emoji characters (👗👔🏠🔍👤🛒🧥↓ etc.) as icons, decorative elements, or image placeholders. Use inline SVG icons, Material Symbols, or Unicode symbols (→ ← × · ● ○ ■ ▸ ✓ ✕) only.

2. HORIZONTAL NAVIGATION — All navbars must use flex horizontal layout:
   <nav class="flex items-center justify-between px-6 py-4">
     <div class="flex items-center gap-8">...links...</div>
   </nav>
   Never stack nav links vertically on desktop.

3. REQUIRED <head> — Always include in <head>:
   <meta charset="utf-8">
   <meta name="viewport" content="width=device-width, initial-scale=1">
   <meta name="color-scheme" content="light"> (or "dark")
   <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
   Choose a different Google Font pairing if it suits the brand, but always include at least one serif and one sans-serif font.

4. FONTS — Apply fonts via body class or style. Example:
   <body class="antialiased" style="font-family: 'Inter', sans-serif">
   Use serif fonts (Playfair Display, Cormorant, etc.) for headings with class="font-serif" or inline style.

5. IMAGES — Use real Unsplash photos for all product/hero images:
   <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80" alt="Description" class="w-full h-full object-cover">
   Pick relevant Unsplash photo IDs for the content. For product grids, use different photos per item.
   Wrap images in aspect-ratio containers: <div class="aspect-[3/4] overflow-hidden rounded-lg bg-gray-100"><img ...></div>

6. HERO SECTIONS — Must have visible height and background:
   <section class="min-h-[500px] bg-gradient-to-r from-stone-100 to-amber-50 flex items-center">
   Use Tailwind gradient classes or solid bg colors. Never rely on background-image: url() for critical backgrounds.

7. ANNOUNCEMENT BARS — Style with contrast:
   <div class="bg-black text-white text-center py-2 text-sm tracking-wide">Free Shipping on Orders $100+</div>

8. BUTTONS — Always styled:
   <button class="bg-black text-white px-6 py-3 rounded font-medium hover:opacity-90 transition" onclick="BowserAPI.performAction('...')">Label</button>
   Or for outline: <button class="border border-black px-6 py-3 rounded font-medium hover:bg-black hover:text-white transition">Label</button>

9. ICON BUTTONS — Use inline SVG for search/user/cart/menu icons:
   <button class="p-2 hover:opacity-70 transition" aria-label="Search">
     <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
   </button>
   Common SVG icons to use:
   - Search: <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
   - User: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
   - Cart/Bag: <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
   - Menu: <path d="M4 6h16M4 12h16M4 18h16"/>
   - Close: <path d="M18 6 6 18M6 6l12 12"/>
   - Arrow right: <path d="M5 12h14M12 5l7 7-7 7"/>
   - Heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.3l7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.8Z"/>
   Or use Material Symbols: <span class="material-symbols-outlined">search</span>

   ⚠️ SVG SIZE RULES — CRITICAL:
   - SVGs are for SMALL ICONS ONLY — max size w-6 h-6 (24px). Every <svg> MUST have explicit Tailwind size classes (e.g. class="w-5 h-5") or width/height attributes.
   - NEVER use SVGs as hero graphics, decorative illustrations, background art, abstract shapes, logos, or large visual elements.
   - NEVER create large decorative SVG shapes, arches, blobs, waves, circles, or abstract art as SVG elements.
   - For decorative/hero visuals, use Unsplash photos via <img> tags or Tailwind gradient backgrounds (bg-gradient-to-r, etc.).
   - If you need a large visual element, use an <img> with an Unsplash URL — NEVER an inline SVG.

10. BODY — Always include: <body class="antialiased text-gray-900" style="font-family: 'Inter', sans-serif; margin: 0;">

━━━ END STRICT STYLE RULES ━━━

STRUCTURE:
Return a full HTML document with a <head> and a <body>:

<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SiteName - Page Name</title>
  <meta name="color-scheme" content="light">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body class="antialiased text-gray-900" style="font-family: 'Inter', sans-serif; margin: 0;">
  ...page content...
</body>
</html>

Keep the <head> minimal — just the <title>, <meta> tags, and Google Fonts <link>. Tailwind CSS and scripts are injected automatically.
The <title> format is: "SiteName - PageName" eg. "UKNews - Home".
Set color-scheme to "light" or "dark" — choose whichever suits the site. Use only one.

STYLING:
Use Tailwind CSS utility classes for all styling. Create rich, polished, realistic-looking pages.
Use Google Fonts for the site. Each site should feel typographically distinct.
For icons, use inline SVGs or Material Symbols: <span class="material-symbols-outlined">icon_name</span>.
NEVER use emoji characters as icons or placeholders.

NAVIGATION:
Use <a href="..."> tags with descriptive path-like hrefs (e.g., href="inbox/message-from-alice", href="settings/notifications").
Every link should have a meaningful href.

INTERACTIVITY:
For actions that change the current page state (e.g., archiving, submitting, toggling), call:
  window.BowserAPI.performAction('Description of intent', 'Optional payload')
Examples:
  <button onclick="BowserAPI.performAction('Archive email 42')">Archive</button>
  <form onsubmit="event.preventDefault(); BowserAPI.performAction('Search', this.q.value)">

CONTENT:
Fill every page with rich, plausible, detailed content. Make it feel like a real website.
`;

const TIMEOUT_MS = 25_000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Check client disconnect
    if (req.signal?.aborted) {
      return jsonError("Client disconnected", "INTERNAL_ERROR", 499);
    }

    // Parse & validate input
    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid JSON body", "INVALID_INPUT", 400);
    }

    const { prompt, currentPageHtml, formState, isMobile } = body;

    if (!prompt || typeof prompt !== "string") {
      return jsonError("prompt is required and must be a string", "INVALID_INPUT", 400, "prompt");
    }
    if (prompt.length < 1 || prompt.length > 2000) {
      return jsonError("prompt must be between 1 and 2000 characters", "INVALID_INPUT", 400, "prompt");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonError("Server configuration error", "INTERNAL_ERROR", 500);
    }

    const isEdit = currentPageHtml !== null && currentPageHtml !== undefined;

    let userPrompt: string;
    if (isEdit) {
      const formStateBlock =
        formState && Array.isArray(formState) && formState.length > 0
          ? `\n\nThe user entered the following values into input fields on the previous page:\n${formState.map((f: any) => `- ${String(f.name || "unnamed")} (${String(f.type)}): "${String(f.value)}"`).join("\n")}\n`
          : "";
      userPrompt = `Update this page based on the following.\nInstruction: "${prompt}"\n\nKeep the layout and style generally consistent.\nReturn the complete updated HTML document.${formStateBlock}\n\nCURRENT HTML:\n${String(currentPageHtml).slice(0, 100000)}`;
    } else {
      userPrompt = `Task: Generate a new web page.\nDescription: "${prompt}"\n\nCreate a complete, detailed, realistic-looking web page based on this description.`;
    }

    if (isMobile) {
      userPrompt += `\nIMPORTANT: The user is on a MOBILE device with a narrow viewport. Design mobile-first:\n- Use a single-column layout\n- Use responsive Tailwind classes\n- Avoid horizontal scrolling\n- Stack elements vertically\n- Keep navigation simple\n`;
    }

    // Create combined abort signal: client disconnect OR timeout
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);

    const combinedSignal = req.signal
      ? AbortSignal.any([req.signal, timeoutController.signal])
      : timeoutController.signal;

    try {
      const response = await fetch(
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
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            stream: true,
          }),
          signal: combinedSignal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const status = response.status;
        const text = await response.text().catch(() => "");
        if (status === 429) {
          return jsonError("Rate limit exceeded. Please try again in a moment.", "UPSTREAM_FAILED", 429);
        }
        if (status === 402) {
          return jsonError("Usage limit reached. Please add credits to your workspace.", "UPSTREAM_FAILED", 402);
        }
        console.error("AI gateway error:", status, text);
        return jsonError("AI service temporarily unavailable", "UPSTREAM_FAILED", 502);
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e?.name === "AbortError") {
        if (req.signal?.aborted) {
          // Client disconnected — no response needed but return anyway
          return jsonError("Client disconnected", "INTERNAL_ERROR", 499);
        }
        return jsonError("Request timed out", "TIMEOUT", 504);
      }
      throw e;
    }
  } catch (e) {
    console.error("generate-page error:", e);
    return jsonError("An unexpected error occurred", "INTERNAL_ERROR", 500);
  }
});
