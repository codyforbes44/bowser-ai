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

const VALID_ACTIONS = new Set(["summarize", "key-points", "simplify", "ask", "explain", "related"]);

const ANALYSIS_PROMPTS: Record<string, string> = {
  summarize: "Provide a clear, concise summary of this content in 2-3 short paragraphs. Focus on the main content and purpose.",
  "key-points": 'Extract the key points as a concise bullet list. Use "•" for bullets. Keep each point to one sentence.',
  simplify: "Rewrite the main content in simpler, more accessible language. Keep the meaning but reduce complexity.",
  related: "Suggest 5 related topics or searches the user might find useful, formatted as a numbered list with brief descriptions.",
  explain: "Explain this topic in plain language as if to someone unfamiliar with it. Be clear and concise.",
  ask: "",
};

const TIMEOUT_MS = 25_000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.signal?.aborted) {
      return jsonError("Client disconnected", "INTERNAL_ERROR", 499);
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid JSON body", "INVALID_INPUT", 400);
    }

    const { action, question, pageHtml, url, title } = body;

    // Validate action
    if (!action || typeof action !== "string" || !VALID_ACTIONS.has(action)) {
      return jsonError(
        `action is required and must be one of: ${[...VALID_ACTIONS].join(", ")}`,
        "INVALID_INPUT", 400, "action"
      );
    }

    // Require at least one content source
    if (!pageHtml && !url) {
      return jsonError("At least one of pageHtml or url is required", "INVALID_INPUT", 400, "pageHtml");
    }

    if (pageHtml && typeof pageHtml !== "string") {
      return jsonError("pageHtml must be a string", "INVALID_INPUT", 400, "pageHtml");
    }
    if (url && typeof url !== "string") {
      return jsonError("url must be a string", "INVALID_INPUT", 400, "url");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonError("Server configuration error", "INTERNAL_ERROR", 500);
    }

    const actionPrompt = action === "ask"
      ? (typeof question === "string" && question.trim() ? question.trim() : "What is this page about?")
      : (ANALYSIS_PROMPTS[action] || ANALYSIS_PROMPTS.summarize);

    let systemPrompt: string;
    let userPrompt: string;

    if (pageHtml) {
      systemPrompt = "You analyze web page content and provide clear, useful responses. Use plain text with minimal markdown (bold, bullets, paragraphs). Be concise and direct. Do not include HTML tags in your response.";
      userPrompt = `${actionPrompt}\n\nPage content:\n${String(pageHtml).slice(0, 30000)}`;
    } else {
      systemPrompt = "You help users understand web content. The user is browsing a website and you're providing analysis based on the URL and topic. You cannot access the live page content directly — use your general knowledge about the URL, domain, and topic. Be honest about this limitation. Use plain text with minimal markdown (bold, bullets, paragraphs). Be concise and direct.";
      userPrompt = `The user is browsing: ${url}${title && typeof title === "string" ? ` (page title: "${title.slice(0, 200)}")` : ""}\n\n${actionPrompt}`;
    }

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
              { role: "system", content: systemPrompt },
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
        await response.text().catch(() => "");
        if (status === 429) {
          return jsonError("Rate limit exceeded. Please try again in a moment.", "UPSTREAM_FAILED", 429);
        }
        if (status === 402) {
          return jsonError("Usage limit reached. Please add credits.", "UPSTREAM_FAILED", 402);
        }
        console.error("AI gateway error:", status);
        return jsonError("AI service temporarily unavailable", "UPSTREAM_FAILED", 502);
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e?.name === "AbortError") {
        if (req.signal?.aborted) {
          return jsonError("Client disconnected", "INTERNAL_ERROR", 499);
        }
        return jsonError("Request timed out", "TIMEOUT", 504);
      }
      throw e;
    }
  } catch (e) {
    console.error("analyze-content error:", e);
    return jsonError("An unexpected error occurred", "INTERNAL_ERROR", 500);
  }
});
