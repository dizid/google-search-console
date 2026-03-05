import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Load .env from project root (needed for local dev with Netlify Vite plugin)
const envDir = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(envDir, '../../.env') })
