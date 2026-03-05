import type { NetlifySite, NetlifyDnsZone } from './types.js'

/**
 * Extract the root domain from a hostname.
 * e.g. "www.example.com" -> "example.com"
 *      "blog.sub.example.co.uk" -> "example.co.uk" (simplified — works for most TLDs)
 */
export function getRootDomain(hostname: string): string {
  const parts = hostname.split('.')
  // Handle common two-part TLDs like co.uk, com.au
  const twoPartTlds = ['co.uk', 'com.au', 'co.nz', 'co.za', 'com.br', 'co.jp']
  const lastTwo = parts.slice(-2).join('.')
  if (twoPartTlds.includes(lastTwo) && parts.length > 2) {
    return parts.slice(-3).join('.')
  }
  return parts.slice(-2).join('.')
}

/**
 * Filter Netlify sites to those with custom domains and deduplicate by root domain.
 * Returns a map of rootDomain -> first site that uses it.
 */
export function getUniqueDomains(sites: NetlifySite[]): Map<string, NetlifySite> {
  const domainMap = new Map<string, NetlifySite>()

  for (const site of sites) {
    if (!site.custom_domain) continue

    const root = getRootDomain(site.custom_domain)
    // Keep the first site per domain
    if (!domainMap.has(root)) {
      domainMap.set(root, site)
    }
  }

  return domainMap
}

/**
 * Find the DNS zone for a domain from a list of zones.
 */
export function findDnsZone(domain: string, zones: NetlifyDnsZone[]): NetlifyDnsZone | undefined {
  return zones.find(z => z.name === domain || z.domain === domain)
}
