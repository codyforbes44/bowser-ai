

# Fix: Proxy Blocked by Bot Detection

## Problem
The `proxy-web` edge function uses a **Chrome 120** User-Agent string (released Dec 2023). Many websites now flag this outdated version as suspicious/automated and return a bot-detection challenge page instead of real content. The proxy also lacks realistic browser headers (`Sec-Fetch-*`, `Sec-CH-UA`, etc.) that modern sites check.

## Fix

### File: `supabase/functions/proxy-web/index.ts`

Update the outbound `fetch` headers (lines 107-113) to:

1. **Modern User-Agent** — bump to a current Chrome version (e.g., Chrome 124 on Windows)
2. **Add realistic browser headers** that bot-detection systems expect:
   - `Sec-Fetch-Dest: document`
   - `Sec-Fetch-Mode: navigate`
   - `Sec-Fetch-Site: none`
   - `Sec-Fetch-User: ?1`
   - `Sec-CH-UA` / `Sec-CH-UA-Mobile` / `Sec-CH-UA-Platform` (Client Hints)
   - `Upgrade-Insecure-Requests: 1`
   - `Cache-Control: max-age=0`
3. **Follow redirects** — already set, no change needed

Single file change, ~15 lines replaced.

