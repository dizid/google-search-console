import type { Context } from '@netlify/functions'
import { listGscSites, listVerifiedSites } from '../lib/google.js'
import { listSites, listDnsZones } from '../lib/netlify-api.js'
import { getUniqueDomains, findDnsZone } from '../lib/domain-utils.js'
import type { ManagedSite, SiteStatus } from '../../src/types/index.js'

export default async (req: Request, _context: Context) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Fetch all data sources in parallel
    const [netlifySites, dnsZones, gscSites, verifiedSites] = await Promise.all([
      listSites(),
      listDnsZones(),
      listGscSites().catch(() => []),
      listVerifiedSites().catch(() => [])
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
        error: null
      })
    }

    // Sort: unverified first, then alphabetical
    sites.sort((a, b) => {
      if (a.verificationStatus === 'verified' && b.verificationStatus !== 'verified') return 1
      if (a.verificationStatus !== 'verified' && b.verificationStatus === 'verified') return -1
      return a.domain.localeCompare(b.domain)
    })

    return Response.json({ sites })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
