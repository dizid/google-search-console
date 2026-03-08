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

// Deploy a sitemap.xml file to an existing Netlify site.
// Creates a new deploy with the sitemap merged into the current deploy's files.
export async function deploySitemapFile(siteId: string, sitemapXml: string): Promise<void> {
  // Get the current production deploy to use as base
  const deployRes = await fetch(`${BASE}/sites/${siteId}/deploys?per_page=1`, { headers: headers() })
  if (!deployRes.ok) throw new Error(`Netlify deploys list error: ${deployRes.status}`)
  const deploys = await deployRes.json() as Array<{ id: string }>
  if (deploys.length === 0) throw new Error('No existing deploys found for site')

  const currentDeployId = deploys[0].id

  // Get the file listing from the current deploy
  const filesRes = await fetch(`${BASE}/deploys/${currentDeployId}/files`, { headers: headers() })
  if (!filesRes.ok) throw new Error(`Netlify files list error: ${filesRes.status}`)
  const existingFiles = await filesRes.json() as Array<{ path: string; sha: string }>

  // Build file digest map from existing deploy
  const files: Record<string, string> = {}
  for (const f of existingFiles) {
    files[f.path] = f.sha
  }

  // Compute SHA1 of the new sitemap content
  const encoder = new TextEncoder()
  const data = encoder.encode(sitemapXml)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const sitemapSha = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

  // Add or replace the sitemap file
  files['/sitemap.xml'] = sitemapSha

  // Create a new deploy with the updated file list
  const createRes = await fetch(`${BASE}/sites/${siteId}/deploys`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ files })
  })
  if (!createRes.ok) throw new Error(`Netlify create deploy error: ${createRes.status} ${await createRes.text()}`)
  const newDeploy = await createRes.json() as { id: string; required: string[] }

  // Upload the sitemap file if Netlify doesn't have it cached
  if (newDeploy.required.includes(sitemapSha)) {
    const uploadRes = await fetch(`${BASE}/deploys/${newDeploy.id}/files/sitemap.xml`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.NETLIFY_PAT}`,
        'Content-Type': 'application/octet-stream'
      },
      body: data
    })
    if (!uploadRes.ok) throw new Error(`Netlify file upload error: ${uploadRes.status} ${await uploadRes.text()}`)
  }
}
