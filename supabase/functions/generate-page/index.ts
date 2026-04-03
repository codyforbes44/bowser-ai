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

STRUCTURE:
Return a full HTML document with a <head> and a <body>:

<html>
<head>
  <title>SiteName - Page Name</title>
  <meta name="color-scheme" content="light">
  <link href="https://fonts.googleapis.com/css2?family=ChosenFont:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Chosen Font', sans-serif">
  ...page content...
</body>
</html>

Keep the <head> minimal — just the <title>, <meta name="color-scheme">, and a Google Fonts <link>. Tailwind CSS and scripts are injected automatically.
The <title> format is: "SiteName - PageName" eg. "UKNews - Home".
Set color-scheme to "light" or "dark" — choose whichever suits the site. Use only one.

STYLING:
Use Tailwind CSS utility classes for all styling. Create rich, polished, realistic-looking pages.
Use Google Fonts for the site. Include the <link> tag in <head> and apply the font via an inline style on the <body> tag (e.g., style="font-family: 'Playfair Display', serif"). Each site should feel typographically distinct.
For icons, use Material Symbols: <span class="material-symbols-outlined">icon_name</span> (e.g., home, search, settings, favorite, delete, mail, star).
Use emojis generously for visual flair and as image placeholders.
For images, use CSS gradients, inline SVGs, or emoji placeholders.

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
