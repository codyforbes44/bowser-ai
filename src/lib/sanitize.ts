/**
 * Sanitizes HTML by removing <script> tags and javascript: URLs.
 * Event handlers (onclick, etc.) are intentionally preserved because
 * content is rendered inside sandboxed iframes that prevent script escape.
 */
export function sanitizeHtml(html: string): string {
  // Remove all <script> tags and their contents
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove javascript: in href and src attributes
  clean = clean.replace(/(href|src)\s*=\s*["']\s*javascript\s*:[^"']*["']/gi, '$1=""');
  clean = clean.replace(/(href|src)\s*=\s*javascript\s*:[^\s>]*/gi, '$1=""');

  return clean;
}
