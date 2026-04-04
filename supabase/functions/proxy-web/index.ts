import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function rewriteUrls(html: string, baseUrl: string): string {
  const origin = new URL(baseUrl).origin;

  // Add <base> tag right after <head>
  html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseUrl}" target="_self">`);

  // Rewrite relative src/href to absolute
  html = html.replace(/(src|href|action)=["'](?!https?:\/\/|data:|blob:|javascript:|mailto:|tel:|#|\/\/)(\/?)([^"']*?)["']/gi,
    (match, attr, slash, path) => {
      const absolute = slash ? `${origin}/${path}` : `${origin}/${path}`;
      return `${attr}="${absolute}"`;
    }
  );

  // Rewrite protocol-relative URLs
  html = html.replace(/(src|href)=["']\/\/([^"']+)["']/gi, (_, attr, rest) => `${attr}="https://${rest}"`);

  // Remove X-Frame-Options meta tags
  html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, '');

  // Remove CSP meta tags that block framing
  html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');

  // Inject script to intercept link clicks and send back to parent
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return new Response(JSON.stringify({ error: 'Only HTTP(S) URLs are supported' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Sec-CH-UA': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return new Response(JSON.stringify({ error: 'Not an HTML page', contentType }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let html = await response.text();

    // Server-side bot detection: short page + multiple bot-specific phrases
    const textOnly = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const botPhrases = [
      'challenge-platform',
      'cf-browser-verification',
      'checking your browser',
      'automated process',
      'unusual traffic',
      'are you a robot',
    ];
    const matchCount = botPhrases.filter(p => textOnly.toLowerCase().includes(p)).length;
    if (textOnly.length < 3000 && matchCount >= 2) {
      return new Response(JSON.stringify({ blocked: true, error: 'blocked' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    html = rewriteUrls(html, response.url || url);

    return new Response(JSON.stringify({ html, finalUrl: response.url || url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch page' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
