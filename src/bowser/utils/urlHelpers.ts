import { Breadcrumb } from '../types';

const SEPARATOR = ' › ';

export function parsePageFromHref(href: string): string {
  let path = href.replace(/^https?:\/\/[^/]+/, '');
  path = path.replace(/^\/+|\/+$/g, '').replace(/#.*$/, '').replace(/\?.*$/, '');

  if (!path) return 'Home';

  return path
    .split('/')
    .filter(Boolean)
    .map(segment =>
      segment
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
    )
    .join(SEPARATOR);
}

export function siteNameFromPrompt(prompt: string): string {
  const stopWords = new Set(['a', 'an', 'the', 'for', 'of', 'to', 'and', 'in', 'on', 'at', 'by', 'with', 'from', 'is', 'that']);
  const words = prompt
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => !stopWords.has(w.toLowerCase()))
    .slice(0, 3)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  return words.join(' ') || 'Site';
}

export function formatBreadcrumbInput(raw: string): string {
  return raw.split('.').join(SEPARATOR);
}

export function parseBreadcrumb(display: string): Breadcrumb {
  const parts = display.split(SEPARATOR).map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return { sitename: '', page: '' };
  if (parts.length === 1) return { sitename: parts[0], page: '' };
  return { sitename: parts[0], page: parts.slice(1).join(' › ') };
}

export function breadcrumbToDisplay(breadcrumb: Breadcrumb): string {
  if (!breadcrumb.sitename) return '';
  if (!breadcrumb.page) return breadcrumb.sitename;
  return `${breadcrumb.sitename}${SEPARATOR}${breadcrumb.page}`;
}

export function extractTitleFromHtml(html: string): Breadcrumb | null {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/is);
  if (!match || !match[1].trim()) return null;

  const title = match[1].trim();

  for (const sep of [' - ', ' | ', ' — ', ' · ']) {
    const idx = title.indexOf(sep);
    if (idx > 0) {
      return {
        sitename: title.substring(0, idx).trim(),
        page: title.substring(idx + sep.length).trim(),
      };
    }
  }

  return { sitename: title, page: 'Home' };
}

export function stripTitleTag(html: string): string {
  return html.replace(/<title>[^<]*<\/title>/i, '');
}
