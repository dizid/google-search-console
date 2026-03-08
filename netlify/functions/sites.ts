import '../lib/env.js'
import type { Context } from '@netlify/functions'
import { listGscSites, listVerifiedSites, listSitemaps } from '../lib/google.js'
import { listSites, listDnsZones } from '../lib/netlify-api.js'
import { getUniqueDomains, findDnsZone } from '../lib/domain-utils.js'
import { loadRefreshToken } from '../lib/token-store.js'
import type { ManagedSite, SiteStatus } from '../../src/types/index.js'

export default async (req: Request, _context: Context) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Fetch all data sources in parallel
    let googleError: string | null = null
    const [netlifySites, dnsZones, gscSites, verifiedSites] = await Promise.all([
      listSites(),
      listDnsZones(),
      listGscSites().catch((e) => { googleError = e instanceof Error ? e.message : 'Google API error'; return [] as never[] }),
      listVerifiedSites().catch(() => [] as never[])
    ])

    // Build lookup sets for fast checking
    const gscMap = new Map(gscSites.map(s => [s.siteUrl, s.permissionLevel]))
    const verifiedDomains = new Set(
      verifiedSites
        .filter(v => v.site.type === 'INET_DOMAIN')
        .map(v => v.site.identifier)
    )

    // Get unique domains from Netlify sites
    const domainMap = getUniqueDomains(netlifySites)

    // Fetch sitemaps for verified domains (in parallel, max 5 at a time)
    const sitemapMap = new Map<string, string | null>()
    const verifiedDomainList = [...domainMap.keys()].filter(d => verifiedDomains.has(d))
    const sitemapResults = await Promise.allSettled(
      verifiedDomainList.map(async (domain) => {
        const sitemaps = await listSitemaps(domain).catch(() => [])
        return { domain, sitemaps }
      })
    )
    for (const r of sitemapResults) {
      if (r.status === 'fulfilled') {
        const url = r.value.sitemaps.length > 0 ? r.value.sitemaps[0].path : null
        sitemapMap.set(r.value.domain, url)
      }
    }

    // Build merged site list
    const sites: ManagedSite[] = []

    for (const [domain, site] of domainMap) {
      const gscPropertyUrl = `sc-domain:${domain}`
      const gscExists = gscMap.has(gscPropertyUrl)
      const isVerified = verifiedDomains.has(domain)
      const zone = findDnsZone(domain, dnsZones)

      let verificationStatus: SiteStatus = 'discovered'
      if (gscExists && isVerified) {
        verificationStatus = 'verified'
      } else if (gscExists && !isVerified) {
        verificationStatus = 'pending_verification'
      } else if (!zone) {
        verificationStatus = 'manual_required'
      }

      const sitemapUrl = sitemapMap.get(domain) ?? null
      let sitemapStatus: ManagedSite['sitemapStatus'] = null
      if (isVerified) {
        sitemapStatus = sitemapUrl ? 'submitted' : 'missing'
      }

      sites.push({
        domain,
        netlifySiteId: site.id,
        netlifySiteName: site.name,
        netlifyUrl: site.ssl_url || site.url,
        customDomain: site.custom_domain || domain,
        hasManagedDns: !!zone,
        dnsZoneId: zone?.id || null,
        gscPropertyUrl,
        gscExists,
        gscPermissionLevel: gscMap.get(gscPropertyUrl) || null,
        verificationStatus,
        verificationToken: null,
        error: null,
        sitemapUrl,
        sitemapStatus,
        indexingRequested: false
      })
    }

    // Sort: unverified first, then alphabetical
    sites.sort((a, b) => {
      if (a.verificationStatus === 'verified' && b.verificationStatus !== 'verified') return 1
      if (a.verificationStatus !== 'verified' && b.verificationStatus === 'verified') return -1
      return a.domain.localeCompare(b.domain)
    })

    const token = await loadRefreshToken()
    const googleConnected = !!(token ?? process.env.GOOGLE_REFRESH_TOKEN)
    return Response.json({ sites, googleConnected, googleError })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
