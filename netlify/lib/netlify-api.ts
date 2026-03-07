import type { NetlifySite, NetlifyDnsZone, NetlifyDnsRecord } from './types.js'

const BASE = 'https://api.netlify.com/api/v1'

function headers() {
  return {
    'Authorization': `Bearer ${process.env.NETLIFY_PAT}`,
    'Content-Type': 'application/json'
  }
}

export async function listSites(): Promise<NetlifySite[]> {
  const allSites: NetlifySite[] = []
  let page = 1

  // Paginate through all sites
  while (true) {
    const res = await fetch(`${BASE}/sites?per_page=100&page=${page}`, { headers: headers() })
    if (!res.ok) throw new Error(`Netlify API error: ${res.status} ${await res.text()}`)
    const sites = await res.json() as NetlifySite[]
    if (sites.length === 0) break
    allSites.push(...sites)
    if (sites.length < 100) break
    page++
  }

  return allSites
}

export async function listDnsZones(): Promise<NetlifyDnsZone[]> {
  const res = await fetch(`${BASE}/dns_zones`, { headers: headers() })
  if (!res.ok) throw new Error(`Netlify DNS zones error: ${res.status}`)
  return res.json() as Promise<NetlifyDnsZone[]>
}

export async function getDnsRecords(zoneId: string): Promise<NetlifyDnsRecord[]> {
  const res = await fetch(`${BASE}/dns_zones/${zoneId}/dns_records`, { headers: headers() })
  if (!res.ok) throw new Error(`Netlify DNS records error: ${res.status}`)
  return res.json() as Promise<NetlifyDnsRecord[]>
}

export async function createTxtRecord(
  zoneId: string,
  hostname: string,
  value: string
): Promise<NetlifyDnsRecord> {
  const res = await fetch(`${BASE}/dns_zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ type: 'TXT', hostname, value })
  })
  if (!res.ok) throw new Error(`Netlify create TXT error: ${res.status} ${await res.text()}`)
  return res.json() as Promise<NetlifyDnsRecord>
}
