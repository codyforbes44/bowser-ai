import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANALYSIS_PROMPTS: Record<string, string> = {
  summarize: "Provide a clear, concise summary of this content in 2-3 short paragraphs. Focus on the main content and purpose.",
  "key-points": 'Extract the key points as a concise bullet list. Use "•" for bullets. Keep each point to one sentence.',
  simplify: "Rewrite the main content in simpler, more accessible language. Keep the meaning but reduce complexity.",
  related: "Suggest 5 related topics or searches the user might find useful, formatted as a numbered list with brief descriptions.",
  explain: "Explain this topic in plain language as if to someone unfamiliar with it. Be clear and concise.",
  ask: "",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, question, pageHtml, url, title } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const actionPrompt = action === "ask" ? (question || "What is this page about?") : (ANALYSIS_PROMPTS[action] || ANALYSIS_PROMPTS.summarize);

    let systemPrompt: string;
    let userPrompt: string;

    if (pageHtml) {
      // AI-generated tab — has full HTML
      systemPrompt = "You analyze web page content and provide clear, useful responses. Use plain text with minimal markdown (bold, bullets, paragraphs). Be concise and direct. Do not include HTML tags in your response.";
      userPrompt = `${actionPrompt}\n\nPage content:\n${pageHtml.slice(0, 30000)}`;
    } else {
      // Web tab — URL context only
      systemPrompt = "You help users understand web content. The user is browsing a website and you're providing analysis based on the URL and topic. You cannot access the live page content directly — use your general knowledge about the URL, domain, and topic. Be honest about this limitation. Use plain text with minimal markdown (bold, bullets, paragraphs). Be concise and direct.";
      userPrompt = `The user is browsing: ${url}${title ? ` (page title: "${title}")` : ""}\n\n${actionPrompt}`;
    }

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
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("analyze-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
