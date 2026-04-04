/**
 * Sanitizes HTML by removing dangerous <script> tags and javascript: URLs.
 * Preserves:
 * - Google Fonts <link> tags
 * - Tailwind CDN <script> tags
 * - Inline event handlers (security handled by iframe sandbox attribute)
 */
export function sanitizeHtml(html: string): string {
  // Remove <script> tags EXCEPT Tailwind CDN
  let clean = html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    (match) => {
      // Preserve Tailwind CDN script
      if (/src\s*=\s*["']https:\/\/cdn\.tailwindcss\.com["']/i.test(match)) {
        return match;
      }
      return '';
    }
  );

  // Remove javascript: in href and src attributes
  clean = clean.replace(/(href|src)\s*=\s*["']\s*javascript\s*:[^"']*["']/gi, '$1=""');
  clean = clean.replace(/(href|src)\s*=\s*javascript\s*:[^\s>]*/gi, '$1=""');

  return clean;
}
