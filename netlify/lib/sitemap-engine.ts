import { submitSitemap, listSitemaps, requestIndexing } from './google.js'
import { deploySitemapFile } from './netlify-api.js'

export interface SitemapResult {
  domain: string
  sitemapUrl: string | null
  status: 'submitted' | 'already_submitted' | 'generated' | 'failed'
  indexingRequested: boolean
  error?: string
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// --- Sitemap Discovery ---

// Check if a URL responds with XML/text content (not a soft 404 HTML page)
async function sitemapExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    if (!res.ok) return false
    const ct = res.headers.get('content-type') || ''
    return ct.includes('xml') || ct.includes('text/plain')
  } catch {
    return false
  }
}

// Parse robots.txt for Sitemap: directives and check common alternate paths
async function discoverSitemapUrls(domain: string): Promise<string[]> {
  const origin = `https://${domain}`
  const found = new Set<string>()

  // 1. Parse robots.txt for Sitemap: directives
  try {
    const res = await fetch(`${origin}/robots.txt`, { redirect: 'follow' })
    if (res.ok) {
      const text = await res.text()
      const lines = text.split('\n')
      for (const line of lines) {
        const match = line.match(/^\s*Sitemap:\s*(.+)/i)
        if (match) {
          const url = match[1].trim()
          if (url.startsWith('http')) found.add(url)
        }
      }
    }
  } catch {
    // robots.txt not available
  }

  // 2. Check common alternate sitemap paths
  const commonPaths = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap-index.xml',
  ]
  const checks = await Promise.allSettled(
    commonPaths.map(async (path) => {
      const url = `${origin}${path}`
      if (found.has(url)) return null // Already found via robots.txt
      return (await sitemapExists(url)) ? url : null
    })
  )
  for (const r of checks) {
    if (r.status === 'fulfilled' && r.value) found.add(r.value)
  }

  return [...found]
}

// --- Recursive Crawl ---

const MAX_URLS = 500       // Max URLs to include in generated sitemap
const MAX_PAGES = 50       // Max pages to actually fetch (bandwidth limit)
const CRAWL_DEPTH = 2      // How many levels deep to follow links
const BATCH_SIZE = 5       // Concurrent fetches per batch

function isAssetUrl(path: string): boolean {
  return /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|pdf|zip|mp4|webp|webm|map|json)$/i.test(path)
}

// Extract same-origin internal links from HTML
function extractLinks(html: string, origin: string): string[] {
  const links: string[] = []
  const hrefRegex = /href=["']([^"']+)["']/g
  let match
  while ((match = hrefRegex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], origin)
      if (resolved.origin === origin && !resolved.hash && !isAssetUrl(resolved.pathname)) {
        resolved.hash = ''
        resolved.search = ''
        links.push(resolved.href)
      }
    } catch {
      // Skip malformed URLs
    }
  }
  return links
}

// Crawl a site recursively up to CRAWL_DEPTH levels, collecting internal URLs
async function crawlSite(domain: string): Promise<Set<string>> {
  const origin = `https://${domain}`
  const allUrls = new Set<string>([origin + '/'])
  const visited = new Set<string>()
  let pagesFetched = 0

  // BFS: process level by level
  let currentLevel = [origin + '/']

  for (let depth = 0; depth <= CRAWL_DEPTH && currentLevel.length > 0; depth++) {
    const nextLevel: string[] = []

    // Process current level in batches
    for (let i = 0; i < currentLevel.length; i += BATCH_SIZE) {
      if (pagesFetched >= MAX_PAGES || allUrls.size >= MAX_URLS) break

      const batch = currentLevel.slice(i, i + BATCH_SIZE)
        .filter(url => !visited.has(url))
        .slice(0, MAX_PAGES - pagesFetched)

      const results = await Promise.allSettled(
        batch.map(async (url) => {
          visited.add(url)
          const res = await fetch(url, { redirect: 'follow' })
          pagesFetched++
          if (!res.ok) return []
          const ct = res.headers.get('content-type') || ''
          if (!ct.includes('text/html')) return []
          const html = await res.text()
          return extractLinks(html, origin)
        })
      )

      for (const r of results) {
        if (r.status !== 'fulfilled') continue
        for (const link of r.value) {
          if (allUrls.size >= MAX_URLS) break
          allUrls.add(link)
          if (!visited.has(link)) nextLevel.push(link)
        }
      }
    }

    currentLevel = nextLevel
  }

  return allUrls
}

// --- XML Building ---

function buildSitemapXml(urls: Set<string>): string {
  const today = new Date().toISOString().split('T')[0]
  const entries = [...urls].map(url =>
    `  <url>\n    <loc>${escapeXml(url)}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`
  ).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// --- Main Processing ---

export async function processSitemap(
  domain: string,
  netlifySiteId: string
): Promise<SitemapResult> {
  const result: SitemapResult = {
    domain,
    sitemapUrl: null,
    status: 'failed',
    indexingRequested: false
  }

  try {
    // 1. Check if any sitemap already submitted to GSC
    const existing = await listSitemaps(domain).catch(() => [])
    if (existing.length > 0) {
      result.sitemapUrl = existing[0].path
      result.status = 'already_submitted'
    } else {
      // 2. Discover sitemaps via robots.txt + common paths
      const discovered = await discoverSitemapUrls(domain)

      if (discovered.length > 0) {
        // Submit all discovered sitemaps to GSC
        for (const url of discovered) {
          await submitSitemap(domain, url)
        }
        result.sitemapUrl = discovered[0]
        result.status = 'submitted'
      } else {
        // 3. No existing sitemap — crawl and generate one
        const urls = await crawlSite(domain)
        const xml = buildSitemapXml(urls)
        await deploySitemapFile(netlifySiteId, xml)
        // Wait for deploy to propagate
        await sleep(5_000)
        const sitemapUrl = `https://${domain}/sitemap.xml`
        await submitSitemap(domain, sitemapUrl)
        result.sitemapUrl = sitemapUrl
        result.status = 'generated'
      }
    }

    // Request indexing for the homepage
    try {
      await requestIndexing(`https://${domain}/`)
      result.indexingRequested = true
    } catch {
      // Indexing API may not be available for all sites — not critical
      result.indexingRequested = false
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : 'Unknown error'
    result.status = 'failed'
  }

  return result
}
