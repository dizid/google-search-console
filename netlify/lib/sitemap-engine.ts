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

// Check if a sitemap exists at the given URL
async function sitemapExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    if (!res.ok) return false
    // Verify it's actually XML-ish content, not a soft 404 HTML page
    const ct = res.headers.get('content-type') || ''
    return ct.includes('xml') || ct.includes('text/plain')
  } catch {
    return false
  }
}

// Crawl homepage for internal links and generate a basic sitemap XML
async function generateSitemap(domain: string): Promise<string> {
  const origin = `https://${domain}`
  const urls = new Set<string>([origin + '/'])

  try {
    const res = await fetch(origin, { redirect: 'follow' })
    if (!res.ok) return buildSitemapXml(urls)
    const html = await res.text()

    // Extract internal links from href attributes
    const hrefRegex = /href=["']([^"']+)["']/g
    let match
    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1]
      try {
        // Resolve relative URLs
        const resolved = new URL(href, origin)
        // Only include same-domain, HTTP(S), non-fragment, non-asset URLs
        if (resolved.origin === origin && !resolved.hash && !isAssetUrl(resolved.pathname)) {
          resolved.hash = ''
          resolved.search = ''
          urls.add(resolved.href)
        }
      } catch {
        // Skip malformed URLs
      }
      if (urls.size >= 50) break
    }
  } catch {
    // If homepage fetch fails, just use the homepage URL
  }

  return buildSitemapXml(urls)
}

function isAssetUrl(path: string): boolean {
  return /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|pdf|zip|mp4|webp|webm)$/i.test(path)
}

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

// Process sitemaps for a single verified domain
export async function processSitemap(
  domain: string,
  netlifySiteId: string
): Promise<SitemapResult> {
  const sitemapUrl = `https://${domain}/sitemap.xml`
  const result: SitemapResult = {
    domain,
    sitemapUrl: null,
    status: 'failed',
    indexingRequested: false
  }

  try {
    // Check if sitemap already submitted to GSC
    const existing = await listSitemaps(domain).catch(() => [])
    const alreadySubmitted = existing.some(s => s.path === sitemapUrl)

    if (alreadySubmitted) {
      result.sitemapUrl = sitemapUrl
      result.status = 'already_submitted'
    } else if (await sitemapExists(sitemapUrl)) {
      // Sitemap exists on the site — submit to GSC
      await submitSitemap(domain, sitemapUrl)
      result.sitemapUrl = sitemapUrl
      result.status = 'submitted'
    } else {
      // No sitemap — generate and deploy one
      const xml = await generateSitemap(domain)
      await deploySitemapFile(netlifySiteId, xml)
      // Wait a moment for the deploy to propagate
      await sleep(5_000)
      await submitSitemap(domain, sitemapUrl)
      result.sitemapUrl = sitemapUrl
      result.status = 'generated'
    }

    // Request indexing for the homepage
    try {
      await requestIndexing(`https://${domain}/`)
      result.indexingRequested = true
    } catch {
      // Indexing API may fail for non-JobPosting sites — not critical
      result.indexingRequested = false
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : 'Unknown error'
    result.status = 'failed'
  }

  return result
}
