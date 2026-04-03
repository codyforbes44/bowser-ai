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

const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB
const TIMEOUT_MS = 25_000;

// Block private/local IPs
function isPrivateHost(hostname: string): boolean {
  // Localhost
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0") return true;
  // IPv4 private ranges
  const parts = hostname.split(".").map(Number);
  if (parts.length === 4 && parts.every(p => !isNaN(p))) {
    if (parts[0] === 10) return true; // 10.x.x.x
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16-31.x.x
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.x.x
    if (parts[0] === 127) return true; // 127.x.x.x
    if (parts[0] === 0) return true; // 0.x.x.x
    if (parts[0] === 169 && parts[1] === 254) return true; // link-local
  }
  // IPv6 loopback
  if (hostname.startsWith("[::1]") || hostname.startsWith("[0:") || hostname.startsWith("[::ffff:127")) return true;
  return false;
}

function rewriteUrls(html: string, baseUrl: string): string {
  const origin = new URL(baseUrl).origin;

  html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseUrl}" target="_self">`);

  html = html.replace(/(src|href|action)=["'](?!https?:\/\/|data:|blob:|javascript:|mailto:|tel:|#|\/\/)(\/?)([^"']*?)["']/gi,
    (match, attr, slash, path) => {
      const absolute = slash ? `${origin}/${path}` : `${origin}/${path}`;
      return `${attr}="${absolute}"`;
    }
  );

  html = html.replace(/(src|href)=["']\/\/([^"']+)["']/gi, (_, attr, rest) => `${attr}="https://${rest}"`);

  // Remove framing-blocking meta tags
  html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '');
  html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');

  const interceptScript = `
<script>
document.addEventListener('click', function(e) {
  var link = e.target.closest('a');
  if (link) {
    var href = link.getAttribute('href');
    if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
      e.preventDefault();
      try {
        var resolved = new URL(href, document.baseURI).href;
        window.parent.postMessage({ type: 'PROXY_NAVIGATE', url: resolved }, '*');
      } catch(err) {
        window.parent.postMessage({ type: 'PROXY_NAVIGATE', url: href }, '*');
      }
    }
  }
});
document.addEventListener('submit', function(e) {
  e.preventDefault();
  var form = e.target;
  var action = form.getAttribute('action') || window.location.href;
  var method = (form.getAttribute('method') || 'GET').toUpperCase();
  var formData = new FormData(form);
  var params = new URLSearchParams(formData).toString();
  var url;
  if (method === 'GET') {
    url = action + (action.includes('?') ? '&' : '?') + params;
  } else {
    url = action;
  }
  try {
    url = new URL(url, document.baseURI).href;
  } catch(err) {}
  window.parent.postMessage({ type: 'PROXY_NAVIGATE', url: url }, '*');
});
<\/script>`;

  html = html.replace(/<\/body>/i, `${interceptScript}</body>`);

  return html;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid JSON body", "INVALID_INPUT", 400);
    }

    const { url } = body;

    // Validate url exists and is a string
    if (!url || typeof url !== "string") {
      return jsonError("url is required and must be a string", "INVALID_INPUT", 400, "url");
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return jsonError("Invalid URL format", "INVALID_INPUT", 400, "url");
    }

    // Only allow http/https
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return jsonError("Only HTTP and HTTPS URLs are supported", "INVALID_INPUT", 400, "url");
    }

    // Block private/local IPs
    if (isPrivateHost(parsedUrl.hostname)) {
      return jsonError("Requests to private or local addresses are not allowed", "INVALID_INPUT", 400, "url");
    }

    // Fetch with timeout
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        redirect: "follow",
        signal: timeoutController.signal,
      });
      clearTimeout(timeoutId);
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e?.name === "AbortError") {
        return jsonError("Request timed out", "TIMEOUT", 504);
      }
      return jsonError("Failed to connect to the requested URL", "UPSTREAM_FAILED", 502);
    }

    // Check Content-Length before reading body
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      await response.body?.cancel();
      return jsonError("Response too large (max 5MB)", "UPSTREAM_FAILED", 413);
    }

    // Check content type — only allow HTML
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      await response.body?.cancel();
      const safeUrl = url.replace(/[<>"']/g, "");
      const fallbackHtml = `<!DOCTYPE html><html><head><title>Preview unavailable</title><meta name="color-scheme" content="dark"></head><body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#1a1a1a;color:#e8eaed;"><div style="text-align:center;max-width:400px;padding:32px;"><h2 style="font-size:18px;margin-bottom:8px;">Can't preview this content</h2><p style="color:#999;font-size:14px;margin-bottom:16px;">This URL returns <code style="background:#333;padding:2px 6px;border-radius:4px;">${contentType.split(";")[0] || "unknown"}</code> content, which can't be displayed inline.</p><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 20px;background:#4285f4;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;">Open in new tab ↗</a></div></body></html>`;
      return new Response(JSON.stringify({ html: fallbackHtml, finalUrl: response.url || url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read body with size cap
    const reader = response.body?.getReader();
    if (!reader) {
      return jsonError("Empty response from server", "UPSTREAM_FAILED", 502);
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.byteLength;
      if (totalSize > MAX_BODY_SIZE) {
        reader.cancel();
        return jsonError("Response too large (max 5MB)", "UPSTREAM_FAILED", 413);
      }
      chunks.push(value);
    }

    const decoder = new TextDecoder();
    let html = chunks.map(c => decoder.decode(c, { stream: true })).join("") + decoder.decode();
    html = rewriteUrls(html, response.url || url);

    return new Response(JSON.stringify({ html, finalUrl: response.url || url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("proxy-web error:", e);
    return jsonError("An unexpected error occurred", "INTERNAL_ERROR", 500);
  }
});
