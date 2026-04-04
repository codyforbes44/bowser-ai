import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_SYSTEM_PROMPT = `You are Bowser Agent, an autonomous AI agent inside a browser. You receive a goal from the user and execute it step-by-step using available tools.

AVAILABLE TOOLS:
- browse_url(url): Fetch and extract content from a URL
- search_web(query): Search the web for information
- generate_page(prompt): Generate an HTML page from a prompt
- extract_data(html, schema): Extract structured data from HTML content

PROCESS:
1. PLAN: Break the goal into concrete steps
2. ACT: Execute each step using the appropriate tool
3. OBSERVE: Analyze the result of each action
4. REFLECT: Decide if goal is achieved or adjust plan

OUTPUT FORMAT:
For each step, output a JSON object on its own line:
{"step": "plan|act|observe|reflect|result", "tool": "tool_name", "input": "...", "output": "...", "status": "running|done|error"}

When complete, output the final result as:
{"step": "result", "html": "<complete HTML page>", "status": "complete"}

IMPORTANT:
- Always think step-by-step
- Use tools efficiently — minimize unnecessary calls
- Produce a polished final HTML page with Tailwind CSS styling
- Include a <title> tag in the format "SiteName - PageName"
- Use Google Fonts and Material Symbols for rich typography
`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "browse_url",
      description: "Fetch and extract the main text content from a URL",
      parameters: {
        type: "object",
        properties: { url: { type: "string", description: "URL to fetch" } },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web and return relevant results",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Search query" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_page",
      description: "Generate a complete HTML page from a description",
      parameters: {
        type: "object",
        properties: { prompt: { type: "string", description: "Page description" } },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "extract_data",
      description: "Extract structured data from HTML content",
      parameters: {
        type: "object",
        properties: {
          html: { type: "string", description: "HTML content to analyze" },
          schema: { type: "string", description: "Description of data to extract" },
        },
        required: ["html", "schema"],
      },
    },
  },
];

async function executeTool(name: string, args: Record<string, string>): Promise<string> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

  switch (name) {
    case "browse_url": {
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/proxy-web`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ url: args.url }),
        });
        if (!resp.ok) return `Error: Failed to fetch ${args.url} (${resp.status})`;
        const html = await resp.text();
        // Strip tags for content extraction
        const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 15000);
        return text || "No content extracted";
      } catch (e) {
        return `Error fetching URL: ${e instanceof Error ? e.message : "Unknown"}`;
      }
    }
    case "search_web": {
      // Use AI to simulate search results based on knowledge
      return `Search results for "${args.query}" — use this information to help complete the task.`;
    }
    case "generate_page": {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `Generate a complete HTML page with Tailwind CSS. Include <title>, Google Fonts link, and Material Symbols. Use dark theme with color-scheme meta tag. Fill with rich, realistic content.`,
              },
              { role: "user", content: args.prompt },
            ],
          }),
        });
        if (!resp.ok) return "Error: Failed to generate page";
        const data = await resp.json();
        return data.choices?.[0]?.message?.content || "No content generated";
      } catch (e) {
        return `Error generating page: ${e instanceof Error ? e.message : "Unknown"}`;
      }
    }
    case "extract_data": {
      const text = (args.html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 10000);
      return `Extracted from content (schema: ${args.schema}): ${text.slice(0, 2000)}`;
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { goal, maxSteps = 5 } = await req.json();
    if (!goal || typeof goal !== "string" || goal.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Invalid goal" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        const messages: Array<{ role: string; content: string; tool_calls?: any[]; tool_call_id?: string }> = [
          { role: "system", content: AGENT_SYSTEM_PROMPT },
          { role: "user", content: `Goal: ${goal}\n\nPlan and execute this goal step by step. When you have enough information, generate a final polished HTML page as the result.` },
        ];

        emit({ step: "plan", tool: "thinking", input: goal, output: "Analyzing goal and planning steps...", status: "running" });

        let steps = 0;
        const maxIterations = Math.min(maxSteps, 8);

        while (steps < maxIterations) {
          steps++;

          const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages,
              tools: TOOLS,
              tool_choice: "auto",
            }),
          });

          if (!resp.ok) {
            const status = resp.status;
            if (status === 429) {
              emit({ step: "error", tool: "system", input: "", output: "Rate limit exceeded. Please try again later.", status: "error" });
              break;
            }
            if (status === 402) {
              emit({ step: "error", tool: "system", input: "", output: "Usage limit reached. Please add credits.", status: "error" });
              break;
            }
            emit({ step: "error", tool: "system", input: "", output: "AI gateway error", status: "error" });
            break;
          }

          const data = await resp.json();
          const choice = data.choices?.[0];
          if (!choice) break;

          const message = choice.message;

          // If the model wants to call tools
          if (message.tool_calls && message.tool_calls.length > 0) {
            messages.push(message);

            for (const toolCall of message.tool_calls) {
              const fn = toolCall.function;
              let args: Record<string, string> = {};
              try { args = JSON.parse(fn.arguments); } catch { /* ignore */ }

              emit({
                step: "act",
                tool: fn.name,
                input: JSON.stringify(args).slice(0, 500),
                output: `Executing ${fn.name}...`,
                status: "running",
              });

              const result = await executeTool(fn.name, args);

              emit({
                step: "observe",
                tool: fn.name,
                input: JSON.stringify(args).slice(0, 500),
                output: result.slice(0, 500),
                status: "done",
              });

              messages.push({
                role: "tool",
                content: result.slice(0, 20000),
                tool_call_id: toolCall.id,
              });
            }
            continue;
          }

          // Model produced text (no tool calls) — this is the final answer
          const content = message.content || "";
          messages.push({ role: "assistant", content });

          // Check if it contains HTML
          const htmlMatch = content.match(/<html[\s\S]*<\/html>/i) || content.match(/<!DOCTYPE[\s\S]*<\/html>/i);
          if (htmlMatch) {
            emit({ step: "result", tool: "complete", input: goal, output: "Task complete", status: "complete" });
            // Stream the HTML as a separate event
            emit({ step: "html", tool: "", input: "", output: htmlMatch[0], status: "complete" });
            break;
          }

          // If no HTML yet, ask the model to produce the final page
          if (steps >= maxIterations - 1) {
            messages.push({
              role: "user",
              content: "Now produce the final complete HTML page based on everything you've gathered. Return only the HTML.",
            });
          } else {
            emit({ step: "reflect", tool: "thinking", input: "", output: content.slice(0, 500), status: "done" });
          }
        }

        // If we exhausted steps without HTML, generate a fallback
        if (steps >= maxIterations) {
          emit({ step: "result", tool: "complete", input: goal, output: "Generating final page...", status: "complete" });

          const finalResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                ...messages,
                { role: "user", content: "Based on all the information gathered, generate the final complete HTML page now. Return only HTML." },
              ],
            }),
          });

          if (finalResp.ok) {
            const finalData = await finalResp.json();
            const finalContent = finalData.choices?.[0]?.message?.content || "";
            const finalHtml = finalContent.match(/<html[\s\S]*<\/html>/i)?.[0] || finalContent;
            emit({ step: "html", tool: "", input: "", output: finalHtml, status: "complete" });
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    console.error("agent-execute error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
