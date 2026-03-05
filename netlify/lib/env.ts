// Load .env for local dev. In production, Netlify injects env vars natively.
try {
  const { config } = await import('dotenv')
  const { fileURLToPath } = await import('node:url')
  const { dirname, resolve } = await import('node:path')
  const envDir = dirname(fileURLToPath(import.meta.url))
  config({ path: resolve(envDir, '../../.env') })
} catch {
  // dotenv not available or .env not found — fine in production
}
