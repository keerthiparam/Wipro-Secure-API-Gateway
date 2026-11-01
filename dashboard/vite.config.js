
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dashboardDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(dashboardDir, '..')
const secretsFile = path.join(projectRoot, 'scripts', '.gateway-secrets')

const backend = 'http://127.0.0.1:5000'
const gateway = 'http://127.0.0.1:8080'

function loadSecrets() {
  if (!fs.existsSync(secretsFile)) {
    throw new Error(`Secrets file not found: ${secretsFile}`)
  }

  const values = {}

  for (const line of fs.readFileSync(secretsFile, 'utf8').split(/\r?\n/)) {
    const index = line.indexOf('=')
    if (index === -1) continue

    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim()
    values[key] = value
  }

  return values
}

function dashboardAuthProxy() {
  let cachedToken = null
  let tokenExpiry = 0
  let tokenPromise = null

  async function getAccessToken() {
    if (cachedToken && Date.now() < tokenExpiry - 30000) {
      return cachedToken
    }

    // Prevent simultaneous requests from generating multiple tokens.
    if (tokenPromise) return tokenPromise

    tokenPromise = (async () => {
      const secrets = loadSecrets()

      if (!secrets.OAUTH_CLIENT_ID || !secrets.OAUTH_CLIENT_SECRET) {
        throw new Error('OAuth client credentials are missing')
      }

      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: secrets.OAUTH_CLIENT_ID,
        client_secret: secrets.OAUTH_CLIENT_SECRET,
      })

      const response = await fetch(`${backend}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      })

      if (!response.ok) {
        throw new Error(`OAuth token request failed: ${response.status}`)
      }

      const data = await response.json()

      cachedToken = data.access_token
      tokenExpiry = Date.now() + data.expires_in * 1000

      return cachedToken
    })()

    try {
      return await tokenPromise
    } finally {
      tokenPromise = null
    }
  }

  return {
    name: 'dashboard-auth-proxy',

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next()
        }

        try {
          const apiUrl = new URL(req.url, gateway)
          const isHealthCheck = apiUrl.pathname === '/api/health'

          // These dashboard endpoints currently use GET/HEAD only.
          if (!['GET', 'HEAD'].includes(req.method)) {
            res.statusCode = 405
            res.end('Method not allowed')
            return
          }

          const headers = new Headers()

          if (req.headers.accept) {
            headers.set('Accept', req.headers.accept)
          }

          // Attach JWT to protected APIs only.
          if (!isHealthCheck) {
            const token = await getAccessToken()
            headers.set('Authorization', `Bearer ${token}`)
          }

          const upstream = await fetch(apiUrl, {
            method: req.method,
            headers,
          })

          res.statusCode = upstream.status

          // Forward response headers, excluding hop-by-hop headers.
          for (const [key, value] of upstream.headers.entries()) {
            if (
              ![
                'connection',
                'keep-alive',
                'transfer-encoding',
                'content-length',
                'content-encoding',
              ].includes(key.toLowerCase())
            ) {
              res.setHeader(key, value)
            }
          }

          if (req.method === 'HEAD') {
            res.end()
          } else {
            const responseBody = Buffer.from(await upstream.arrayBuffer())
            res.end(responseBody)
          }
        } catch (error) {
          console.error('[Dashboard API Proxy]', error.message)

          if (!res.headersSent) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: 'Gateway authentication or proxy failed',
            }))
          }
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    dashboardAuthProxy(),
  ],

  server: {
    port: 3000,
    proxy: {
      // No /api proxy here: dashboardAuthProxy handles these requests.
    },
  },
})
