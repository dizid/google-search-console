// Netlify API response types

export interface NetlifySite {
  id: string
  name: string
  url: string
  ssl_url: string
  custom_domain: string | null
  default_domain: string
  managed_dns: boolean
  created_at: string
}

export interface NetlifyDnsZone {
  id: string
  name: string
  domain: string
  records: number
}

export interface NetlifyDnsRecord {
  id: string
  hostname: string
  type: string
  value: string
  ttl: number | null
}

// Google API response types

export interface GscSiteEntry {
  siteUrl: string
  permissionLevel: string
}

export interface VerificationToken {
  method: string
  token: string
}

export interface VerifiedResource {
  id: string
  owners: string[]
  site: {
    identifier: string
    type: string
  }
}
