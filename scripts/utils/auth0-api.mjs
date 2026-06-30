import { $ } from "execa"

// Default timeout for API calls (30 seconds)
const DEFAULT_API_TIMEOUT = 30000

/**
 * Make a generic API call using auth0 CLI
 * @param {string} method - HTTP method (get, post, patch, delete)
 * @param {string} endpoint - API endpoint
 * @param {object} data - Optional data payload
 * @param {number} timeout - Optional timeout in ms (default 30s)
 */
export async function auth0ApiCall(method, endpoint, data = null, timeout = DEFAULT_API_TIMEOUT) {
  const args = ["api", method, endpoint, "--no-input"]

  if (data) {
    args.push("--data", JSON.stringify(data))
  }

  try {
    const { stdout } = await $({ timeout })`auth0 ${args}`
    return stdout ? JSON.parse(stdout) : null
  } catch (e) {
    if (e.timedOut) {
      throw new Error(`API call timed out after ${timeout}ms. Your Auth0 session may have expired.`)
    }
    console.warn(`⚠️  Warning: API Call failed: ${e.message}`)
    throw e
  }
}

/**
 * Check if the Auth0 CLI session is valid by making a simple API call
 * Uses `read:clients` scope which is in BOOTSTRAP_SCOPES
 * @param {number} timeout - Timeout in ms (default 10s for quick check)
 * @returns {Promise<boolean>} True if session is valid
 */
export async function isSessionValid(timeout = 10000) {
  try {
    await $({ timeout })`auth0 api get clients?per_page=1 --no-input`
    return true
  } catch (e) {
    return false
  }
}
