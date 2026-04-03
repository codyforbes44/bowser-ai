/**
 * Sanitizes HTML by removing <script> tags and javascript: URLs.
 * Used to clean AI-generated and proxied HTML before rendering in iframes.
 */
export function sanitizeHtml(html: string): string {
  // Remove all <script> tags and their contents
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handler attributes (onclick, onerror, onload, etc.)
  clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');

  // Remove javascript: in href and src attributes
  clean = clean.replace(/(href|src)\s*=\s*["']\s*javascript\s*:[^"']*["']/gi, '$1=""');
  clean = clean.replace(/(href|src)\s*=\s*javascript\s*:[^\s>]*/gi, '$1=""');

  return clean;
}
