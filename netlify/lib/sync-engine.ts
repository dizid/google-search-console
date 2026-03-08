import { addGscSite, getVerificationToken, verifyDomain, listGscSites, listVerifiedSites } from './google.js'
import { listSites, listDnsZones, getDnsRecords, createTxtRecord } from './netlify-api.js'
import { getUniqueDomains, findDnsZone } from './domain-utils.js'
import { processSitemap } from './sitemap-engine.js'
import type { SyncResult } from '../../src/types/index.js'

const VERIFY_DELAYS = [30_000, 60_000, 120_000] // Retry delays in ms

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Run the full sync: discover Netlify sites → add to GSC → verify via DNS.
 * Designed to run in a background function (up to 15 min timeout).
 */
export async function runSync(targetDomains?: string[]): Promise<SyncResult> {
  const result: SyncResult = { total: 0, added: 0, verified: 0, skipped: 0, errors: [] }

  // 1. Discover sites
  const [netlifySites, dnsZones, gscSites] = await Promise.all([
    listSites(),
    listDnsZones(),
    listGscSites().catch(() => [])
  ])

  const gscExisting = new Set(gscSites.map(s => s.siteUrl))
  const domainMap = getUniqueDomains(netlifySites)

  // Filter to target domains if specified
  const domains = targetDomains
    ? [...domainMap.entries()].filter(([d]) => targetDomains.includes(d))
    : [...domainMap.entries()]

  result.total = domains.length

  for (const [domain] of domains) {
    try {
      const zone = findDnsZone(domain, dnsZones)

      // Skip if DNS not managed by Netlify
      if (!zone) {
        result.skipped++
        result.errors.push({ domain, error: 'DNS not managed by Netlify — manual verification required' })
        continue
      }

      const gscPropertyUrl = `sc-domain:${domain}`

      // 2. Add to GSC (idempotent)
      if (!gscExisting.has(gscPropertyUrl)) {
        await addGscSite(domain)
        result.added++
      }

      // 3. Get verification token
      const tokenResult = await getVerificationToken(domain)
      const verificationValue = tokenResult.token

      // 4. Check if TXT record already exists
      const records = await getDnsRecords(zone.id)
      const existingTxt = records.find(
        r => r.type === 'TXT' && r.value === verificationValue
      )

      // 5. Add TXT record if needed
      if (!existingTxt) {
        await createTxtRecord(zone.id, domain, verificationValue)
      }

      // 6. Attempt verification with retries
      let verified = false
      let lastVerifyError = ''
      for (const delay of VERIFY_DELAYS) {
        await sleep(delay)
        try {
          await verifyDomain(domain)
          verified = true
          break
        } catch (verifyErr) {
          lastVerifyError = verifyErr instanceof Error ? verifyErr.message : 'Unknown error'
          // Only retry on verification-pending type errors; break on permission/auth errors
          if (lastVerifyError.includes('403') || lastVerifyError.includes('401') || lastVerifyError.includes('permission')) {
            break
          }
        }
      }

      if (verified) {
        result.verified++
      } else {
        result.errors.push({ domain, error: `Verification failed: ${lastVerifyError || 'timed out'} — DNS TXT record added, will auto-verify once DNS propagates` })
      }

      // Small delay between domains to respect rate limits
      await sleep(200)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      result.errors.push({ domain, error: message })
    }
  }

  // 7. Process sitemaps + indexing for all verified sites
  const verifiedSites = await listVerifiedSites().catch(() => [])
  const verifiedDomains = new Set(verifiedSites.filter(v => v.site.type === 'INET_DOMAIN').map(v => v.site.identifier))

  for (const [domain, site] of domains) {
    if (!verifiedDomains.has(domain)) continue
    try {
      const sitemapResult = await processSitemap(domain, site.id)
      if (sitemapResult.status === 'failed' && sitemapResult.error) {
        result.errors.push({ domain, error: `Sitemap: ${sitemapResult.error}` })
      }
      await sleep(200)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      result.errors.push({ domain, error: `Sitemap: ${message}` })
    }
  }

  return result
}
