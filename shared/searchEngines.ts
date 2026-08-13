/**
 * Search-engine hosts excluded from active time / Top sites.
 * Product hosts on the same registrable domain (docs.google.com, mail.google.com) are NOT search.
 */

import { normalizeDomain } from './domain'

/** Exact hosts (after www. strip) treated as search only. */
const SEARCH_ENGINE_HOSTS = new Set([
  'google.com',
  'google.fr',
  'google.co.uk',
  'bing.com',
  'duckduckgo.com',
  'yahoo.com',
  'search.yahoo.com',
  'ecosia.org',
  'qwant.com',
  'startpage.com',
  'search.brave.com',
  'baidu.com',
  'yandex.com',
  'yandex.ru',
])

/**
 * True for bare search engines (google.com), false for docs.google.com / mail.google.com / etc.
 */
export function isSearchEngineDomain(domain: string | null | undefined): boolean {
  if (!domain) return false
  const d = normalizeDomain(domain)
  if (!d) return false
  if (SEARCH_ENGINE_HOSTS.has(d)) return true
  // fr.search.yahoo.com etc.
  if (d.endsWith('.search.yahoo.com')) return true
  return false
}
