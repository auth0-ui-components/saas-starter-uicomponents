import { $, execaSync } from "execa"
import ora from "ora"

import { confirmWithUser } from "./helpers.mjs"

// Timeout for CLI commands (15 seconds)
const CLI_TIMEOUT = 15000

// All scopes needed for bootstrap operations
const BOOTSTRAP_SCOPES = [
  "read:clients",
  "create:clients",
  "update:clients",
  "read:client_keys",
  "read:roles",
  "create:roles",
  "update:roles",
  "read:resource_servers",
  "create:resource_servers",
  "update:resource_servers",
  "read:connections",
  "create:connections",
  "update:connections",
  "read:client_grants",
  "create:client_grants",
  "update:client_grants",
  "delete:client_grants",
  "read:actions",
  "create:actions",
  "update:actions",
  "read:triggers",
  "update:triggers",
  "read:branding",
  "update:branding",
  "read:email_templates",
  "create:email_templates",
  "update:email_templates",
  "read:guardian_factors",
  "update:guardian_factors",
  "update:tenant_settings",
  "read:connection_profiles",
  "create:connection_profiles",
  "update:connection_profiles",
  "read:user_attribute_profiles",
  "create:user_attribute_profiles",
  "update:user_attribute_profiles",
]

/**
 * Check Node.js version
 */
export function checkNodeVersion() {
  if (process.version.replace("v", "").split(".")[0] < 20) {
    console.error(
      "❌ Node.js version 20 or later is required to run this script."
    )
    process.exit(1)
  }
}

/**
 * Check Auth0 CLI is installed
 */
export async function checkAuth0CLI() {
  const cliCheck = ora({
    text: `Checking that the Auth0 CLI has been installed`,
  }).start()

  try {
    await $({ timeout: CLI_TIMEOUT })`auth0 --version`
    cliCheck.succeed()
  } catch {
    cliCheck.fail(
      "The Auth0 CLI must be installed: https://github.com/auth0/auth0-cli"
    )
    process.exit(1)
  }
}

/**
 * Run Auth0 CLI login interactively with required scopes
 * @param {string} domain - Optional tenant domain to login to
 * @returns {Promise<boolean>} True if login was successful
 */
async function runAuth0Login(domain = null) {
  console.log("\n🔐 Starting Auth0 CLI login...\n")
  console.log("   A browser window will open for authentication.")
  console.log("   Please complete the login process.\n")

  try {
    // Build login args with required scopes
    const scopesArg = BOOTSTRAP_SCOPES.join(",")
    const args = ["login", "--scopes", scopesArg]

    // Add domain if specified
    if (domain) {
      args.push("--domain", domain)
    }

    // Run login in interactive mode (no --no-input flag)
    // Use stdio: 'inherit' to allow interactive browser-based login
    execaSync("auth0", args, {
      stdio: "inherit",
      timeout: 120000, // 2 minute timeout for login process
    })
    return true
  } catch (e) {
    if (e.timedOut) {
      console.error("\n❌ Login timed out. Please try again.")
    } else {
      console.error(`\n❌ Login failed: ${e.message}`)
    }
    return false
  }
}

/**
 * Switch to a different tenant using auth0 tenants use
 * @param {string} tenantName - Tenant domain to switch to
 * @returns {Promise<boolean>} True if switch was successful
 */
async function switchToTenant(tenantName) {
  const spinner = ora({
    text: `Switching to tenant: ${tenantName}`,
  }).start()

  try {
    await $({
      timeout: CLI_TIMEOUT,
    })`auth0 tenants use ${tenantName} --no-input`
    spinner.succeed(`Switched to tenant: ${tenantName}`)
    return true
  } catch {
    spinner.fail(`Failed to switch to tenant: ${tenantName}`)
    return false
  }
}

/**
 * Validate tenant configuration
 * @param {string} tenantName - Required tenant name from command line argument
 */
export async function validateTenant(tenantName) {
  if (!tenantName) {
    console.error("\n❌ Error: Tenant name is required")
    console.error("\nUsage: node scripts/bootstrap.mjs <tenant-domain>")
    console.error("\nExample:")
    console.error("   node scripts/bootstrap.mjs my-tenant.us.auth0.com")
    console.error(
      "\nThis is a safety measure to prevent accidentally configuring the wrong tenant."
    )
    process.exit(1)
  }

  const spinner = ora({
    text: `Validating tenant: ${tenantName}`,
  }).start()

  try {
    // Get current tenant from CLI
    // NOTE: we're outputting as CSV here due to a bug in the Auth0 CLI that doesn't respect the --json flag
    // https://github.com/auth0/auth0-cli/pull/1002
    const tenantSettingsArgs = ["tenants", "list", "--csv", "--no-input"]
    const { stdout } = await $({
      timeout: CLI_TIMEOUT,
    })`auth0 ${tenantSettingsArgs}`

    // Parse all available tenants and find the active one
    const tenantLines = stdout
      .split("\n")
      .slice(1)
      .filter((line) => line.trim())
    const availableTenants = tenantLines
      .map((line) => line.split(",")[1]?.trim())
      .filter(Boolean)

    // Get the active tenant (marked with →)
    const cliDomain = tenantLines
      .find((line) => line.includes("→"))
      ?.split(",")[1]
      ?.trim()

    if (!cliDomain) {
      spinner.fail("No active tenant found in Auth0 CLI")
      console.error("\n❌ No active tenant configured.")

      const shouldLogin = await confirmWithUser(
        `Would you like to login to ${tenantName}?`
      )

      if (shouldLogin) {
        const loginSuccess = await runAuth0Login(tenantName)
        if (loginSuccess) {
          // Retry tenant validation after login
          return validateTenant(tenantName)
        }
      }

      console.error("\n❌ Cannot proceed without an active tenant.")
      console.error("   Please run 'auth0 login' and try again.\n")
      process.exit(1)
    }

    // Verify the provided tenant name matches the CLI active tenant
    if (tenantName !== cliDomain) {
      spinner.fail("Tenant mismatch detected")
      console.error(`\n❌ Tenant mismatch:`)
      console.error(`   Requested tenant: ${tenantName}`)
      console.error(`   CLI is using:     ${cliDomain}`)

      // Check if the requested tenant is in the list of available tenants
      const tenantAvailable = availableTenants.includes(tenantName)

      if (tenantAvailable) {
        // Tenant exists, offer to switch
        console.error(`\n   The tenant "${tenantName}" is available in your CLI.`)
        const shouldSwitch = await confirmWithUser(
          `Would you like to switch to ${tenantName}?`
        )

        if (shouldSwitch) {
          const switchSuccess = await switchToTenant(tenantName)
          if (switchSuccess) {
            // Retry tenant validation after switching
            return validateTenant(tenantName)
          }
        }
      } else {
        // Tenant not in list, offer to login
        console.error(
          `\n   The tenant "${tenantName}" is not in your CLI's tenant list.`
        )
        console.error(`   You may need to login to this tenant.`)
        const shouldLogin = await confirmWithUser(
          `Would you like to login to ${tenantName}?`
        )

        if (shouldLogin) {
          const loginSuccess = await runAuth0Login(tenantName)
          if (loginSuccess) {
            // Retry tenant validation after login
            return validateTenant(tenantName)
          }
        }
      }

      console.error("\n❌ Cannot proceed with mismatched tenant.")
      console.error(
        "\nThis is a safety measure to prevent accidentally configuring the wrong tenant."
      )
      process.exit(1)
    }

    spinner.succeed(`Validated tenant: ${cliDomain}`)
    return cliDomain
  } catch (e) {
    // Handle timeout errors specifically
    if (e.timedOut) {
      spinner.fail("Auth0 CLI command timed out")
      console.error("\n❌ The Auth0 CLI is not responding.")
      console.error("   This usually means your session has expired.\n")

      const shouldLogin = await confirmWithUser(
        `Would you like to login to ${tenantName}?`
      )

      if (shouldLogin) {
        const loginSuccess = await runAuth0Login(tenantName)
        if (loginSuccess) {
          // Retry tenant validation after login
          return validateTenant(tenantName)
        }
      }

      console.error("\n❌ Cannot proceed without a valid session.")
      console.error("   Please run 'auth0 login' and try again.\n")
      process.exit(1)
    }

    spinner.fail("Failed to validate tenant")
    console.error(e)
    process.exit(1)
  }
}
