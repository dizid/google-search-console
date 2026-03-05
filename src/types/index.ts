export type SiteStatus =
  | 'discovered'
  | 'adding'
  | 'pending_verification'
  | 'verifying'
  | 'verified'
  | 'error'
  | 'manual_required'

export interface ManagedSite {
  domain: string
  netlifySiteId: string
  netlifySiteName: string
  netlifyUrl: string
  customDomain: string
  hasManagedDns: boolean
  dnsZoneId: string | null
  gscPropertyUrl: string
  gscExists: boolean
  gscPermissionLevel: string | null
  verificationStatus: SiteStatus
  verificationToken: string | null
  error: string | null
}

export interface SyncResult {
  total: number
  added: number
  verified: number
  skipped: number
  errors: Array<{ domain: string; error: string }>
}
