import { GoogleGenAI } from "@google/genai";
import { TokenCount } from '../types';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

const MODEL_NAME = 'gemini-3-flash-preview'; 

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

export interface GenerationResult {
  tokenCount: TokenCount;
}

export type AnalysisAction = 'summarize' | 'key-points' | 'simplify' | 'ask' | 'related' | 'explain';

const ANALYSIS_PROMPTS: Record<AnalysisAction, string> = {
  'summarize': 'Provide a clear, concise summary of this content in 2-3 short paragraphs. Focus on the main content and purpose.',
  'key-points': 'Extract the key points as a concise bullet list. Use "•" for bullets. Keep each point to one sentence.',
  'simplify': 'Rewrite the main content in simpler, more accessible language. Keep the meaning but reduce complexity.',
  'related': 'Suggest 5 related topics or searches the user might find useful, formatted as a numbered list with brief descriptions.',
  'explain': 'Explain this topic in plain language as if to someone unfamiliar with it. Be clear and concise.',
  'ask': '',
};

/**
 * Stream analysis for AI-generated page content (has full HTML access)
 */
export async function* streamTextAnalysis(
  pageHtml: string,
  action: AnalysisAction,
  question?: string,
  abortSignal?: AbortSignal,
): AsyncGenerator<string> {
  const actionPrompt = action === 'ask'
    ? (question || 'What is this page about?')
    : ANALYSIS_PROMPTS[action];

  const systemPrompt = 'You analyze web page content and provide clear, useful responses. Use plain text with minimal markdown (bold, bullets, paragraphs). Be concise and direct. Do not include HTML tags in your response.';
  const userPrompt = `${actionPrompt}\n\nPage content:\n${pageHtml.slice(0, 30000)}`;

  try {
    const response = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        ...(abortSignal ? { abortSignal } : {}),
      },
    });

    for await (const chunk of response) {
      if (abortSignal?.aborted) break;
      if (chunk.text) yield chunk.text;
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') return;
    yield `Analysis failed: ${error?.message || 'Unknown error'}`;
  }
}

/**
 * Stream analysis for web tabs (no page content, uses URL context only)
 */
export async function* streamWebTabAnalysis(
  url: string,
  tabTitle: string,
  action: AnalysisAction,
  question?: string,
  abortSignal?: AbortSignal,
): AsyncGenerator<string> {
  const actionPrompt = action === 'ask'
    ? (question || 'What is this website about?')
    : ANALYSIS_PROMPTS[action];

  const systemPrompt = `You help users understand web content. The user is browsing a website and you're providing analysis based on the URL and topic. You cannot access the live page content directly — use your general knowledge about the URL, domain, and topic. Be honest about this limitation. Use plain text with minimal markdown (bold, bullets, paragraphs). Be concise and direct.`;
  const userPrompt = `The user is browsing: ${url}${tabTitle ? ` (page title: "${tabTitle}")` : ''}\n\n${actionPrompt}`;

  try {
    const response = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        ...(abortSignal ? { abortSignal } : {}),
      },
    });

    for await (const chunk of response) {
      if (abortSignal?.aborted) break;
      if (chunk.text) yield chunk.text;
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') return;
    yield `Analysis failed: ${error?.message || 'Unknown error'}`;
  }
}

export async function* streamPageGeneration(
  prompt: string,
  currentPageHtml: string | null = null,
  isGrounded: boolean = false,
  abortSignal?: AbortSignal,
  formState?: Array<{ name: string; type: string; value: string }>,
  isMobile: boolean = false,
): AsyncGenerator<string> {
  const isEdit = currentPageHtml !== null;

  let userPrompt: string;
  if (isEdit) {
    const formStateBlock = formState && formState.length > 0
      ? `\n\nThe user entered the following values into input fields on the previous page:\n${formState.map(f => `- ${f.name || 'unnamed'} (${f.type}): "${f.value}"`).join('\n')}\n`
      : '';
    userPrompt = `
Update this page based on the following.
Instruction: "${prompt}"

Keep the layout and style generally consistent.
Return the complete updated HTML document.${formStateBlock}

CURRENT HTML:
${currentPageHtml}
`;
  } else {
    userPrompt = `
Task: Generate a new web page.
Description: "${prompt}"

Create a complete, detailed, realistic-looking web page based on this description.
`;
  }

  if (isGrounded) {
    userPrompt += `\nIMPORTANT: You have access to Google Search. Use it to find current, accurate data for populating the page content. Always ground the page in search results — use real names, real statistics, real facts from your Google searches.\n`;
  }

  if (isMobile) {
    userPrompt += `\nIMPORTANT: The user is on a MOBILE device with a narrow viewport. Design mobile-first:\n- Use a single-column layout\n- Use responsive Tailwind classes)\n- Avoid horizontal scrolling\n- Stack elements vertically\n- Keep navigation simple\n`;
  }

  const config: any = {
    systemInstruction: SYSTEM_PROMPT,
  };

  if (isGrounded) {
    config.tools = [{ googleSearch: {} }];
  }

  try {
    let inputTokens = 0;
    try {
      const countResult = await ai.models.countTokens({
        model: MODEL_NAME,
        contents: [
          { role: 'user', parts: [{ text: config.systemInstruction || '' }] },
          { role: 'user', parts: [{ text: userPrompt }] },
        ],
      });
      inputTokens = countResult.totalTokens || 0;
    } catch {
      // countTokens may fail, fall back to usageMetadata
    }

    yield `__TOKEN__${JSON.stringify({ input: inputTokens, output: 0, isEstimate: true })}`;

    const responseStream = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: userPrompt,
      config: { ...config, ...(abortSignal ? { abortSignal } : {}) }
    });

    let outputTokens = 0;
    let totalChars = 0;
    let groundingSources: Array<{ title: string; uri: string }> = [];
    let searchEntryPointHtml = '';

    for await (const chunk of responseStream) {
      if (chunk.usageMetadata) {
        if (chunk.usageMetadata.promptTokenCount) {
          inputTokens = chunk.usageMetadata.promptTokenCount;
        }
        outputTokens = chunk.usageMetadata.candidatesTokenCount || 0;
      }
      const groundingMeta = (chunk as any).candidates?.[0]?.groundingMetadata;
      if (groundingMeta?.groundingChunks?.length) {
        groundingSources = groundingMeta.groundingChunks
          .filter((c: any) => c.web?.uri && c.web?.title)
          .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
      }
      if (groundingMeta?.searchEntryPoint?.renderedContent) {
        searchEntryPointHtml = groundingMeta.searchEntryPoint.renderedContent;
      }
      if (chunk.text) {
        totalChars += chunk.text.length;
        const estimatedOutput = Math.round(totalChars / 4);
        yield `__TOKEN__${JSON.stringify({ input: inputTokens, output: estimatedOutput, isEstimate: true })}`;
        yield chunk.text;
      }
    }

    yield `__META__${JSON.stringify({ tokenCount: { input: inputTokens, output: outputTokens }, groundingSources, searchEntryPointHtml })}`;

  } catch (error) {
    yield `<div class="p-8 text-red-600"><h1>Generation Error</h1><p>${error}</p></div>`;
  }
}