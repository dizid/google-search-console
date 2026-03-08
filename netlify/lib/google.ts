import { google } from 'googleapis'
import type { GscSiteEntry, GscSitemapEntry, VerificationToken, VerifiedResource } from './types.js'
import { loadRefreshToken } from './token-store.js'

async function getAuth() {
  // Redirect URI not needed for API calls with refresh token
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  // Blob store takes precedence, fall back to env var for backward compat
  const refreshToken = await loadRefreshToken() ?? process.env.GOOGLE_REFRESH_TOKEN
  if (!refreshToken) {
    throw new Error('No Google refresh token found. Connect your Google account in Settings.')
  }
  oauth2.setCredentials({ refresh_token: refreshToken })
  return oauth2
}

// Validate that the stored refresh token is still accepted by Google
export async function validateToken(): Promise<{ valid: boolean; error?: string }> {
  try {
    const auth = await getAuth()
    await auth.getAccessToken()
    return { valid: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg.includes('invalid_grant') || msg.includes('Token has been revoked')) {
      return { valid: false, error: 'Token revoked or expired. Please reconnect your Google account.' }
    }
    if (msg.includes('No Google refresh token')) {
      return { valid: false, error: msg }
    }
    return { valid: false, error: msg }
  }
}

async function getSearchConsole() {
  return google.webmasters({ version: 'v3', auth: await getAuth() })
}

async function getSiteVerification() {
  return google.siteVerification({ version: 'v1', auth: await getAuth() })
}

// --- Search Console ---

export async function listGscSites(): Promise<GscSiteEntry[]> {
  const sc = await getSearchConsole()
  const res = await sc.sites.list()
  return (res.data.siteEntry as GscSiteEntry[]) || []
}

export async function addGscSite(domain: string): Promise<void> {
  const siteUrl = `sc-domain:${domain}`
  const sc = await getSearchConsole()
  await sc.sites.add({ siteUrl })
}

// --- Site Verification ---

export async function getVerificationToken(domain: string): Promise<VerificationToken> {
  const sv = await getSiteVerification()
  const res = await sv.webResource.getToken({
    requestBody: {
      site: { type: 'INET_DOMAIN', identifier: domain },
      verificationMethod: 'DNS_TXT'
    }
  })
  return res.data as VerificationToken
}

export async function verifyDomain(domain: string): Promise<VerifiedResource> {
  const sv = await getSiteVerification()
  const res = await sv.webResource.insert({
    verificationMethod: 'DNS_TXT',
    requestBody: {
      site: { type: 'INET_DOMAIN', identifier: domain }
    }
  })
  return res.data as VerifiedResource
}

export async function listVerifiedSites(): Promise<VerifiedResource[]> {
  const sv = await getSiteVerification()
  const res = await sv.webResource.list()
  return (res.data.items as VerifiedResource[]) || []
}

// --- Sitemaps ---

export async function listSitemaps(domain: string): Promise<GscSitemapEntry[]> {
  const sc = await getSearchConsole()
  const siteUrl = `sc-domain:${domain}`
  const res = await sc.sitemaps.list({ siteUrl })
  const items = res.data.sitemap || []
  return items.map((s) => ({
    path: s.path || '',
    lastSubmitted: s.lastSubmitted || null,
    isPending: s.isPending || false,
    errors: Number(s.errors) || 0,
    warnings: Number(s.warnings) || 0
  }))
}

export async function submitSitemap(domain: string, sitemapUrl: string): Promise<void> {
  const sc = await getSearchConsole()
  const siteUrl = `sc-domain:${domain}`
  await sc.sitemaps.submit({ siteUrl, feedpath: sitemapUrl })
}

export async function deleteSitemap(domain: string, sitemapUrl: string): Promise<void> {
  const sc = await getSearchConsole()
  const siteUrl = `sc-domain:${domain}`
  await sc.sitemaps.delete({ siteUrl, feedpath: sitemapUrl })
}

// --- Indexing ---

export async function requestIndexing(url: string): Promise<void> {
  const auth = await getAuth()
  const indexing = google.indexing({ version: 'v3', auth })
  await indexing.urlNotifications.publish({
    requestBody: { url, type: 'URL_UPDATED' }
  })
}

// --- OAuth helpers ---

// Build redirect URI from request headers — works in any environment.
// Can't use req.url because Netlify rewrites /api/* to /.netlify/functions/*,
// so the path (and sometimes origin) in req.url won't match what the browser sees.
export function buildRedirectUri(req: Request): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  return `${proto}://${host}/api/auth-callback`
}

export function getAuthUrl(redirectUri: string): string {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  )
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/webmasters',
      'https://www.googleapis.com/auth/siteverification',
      'https://www.googleapis.com/auth/indexing'
    ]
  })
}

export async function exchangeCode(code: string, redirectUri: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  )
  const { tokens } = await oauth2.getToken(code)
  return tokens
}
