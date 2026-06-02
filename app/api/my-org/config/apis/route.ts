import { NextResponse } from "next/server"

import { appClient, managementClient } from "@/lib/auth0"
import { getDefaultProfile } from "@/lib/app-profile"

/*
 * Returns the APIs available for partner orgs to create grants against.
 * Filtered to identifiers configured in config/app-profiles.json client_grant_configuration.resource_servers.
 */
export async function GET() {
  const session = await appClient.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const profile = getDefaultProfile()
    const allowedIdentifiers = new Set(
      profile.client_grant_configuration.resource_servers.map((rs) =>
        rs.identifier.toLowerCase().replace(/\/$/, "")
      )
    )

    if (allowedIdentifiers.size === 0) {
      return NextResponse.json({ apis: [] })
    }

    const { data: resourceServers } = await managementClient.resourceServers.getAll({ per_page: 50 })

    const profileServers = profile.client_grant_configuration.resource_servers

    const apis = resourceServers
      .filter((rs) => !rs.is_system)
      .filter((rs) => allowedIdentifiers.has(rs.identifier!.toLowerCase().replace(/\/$/, "")))
      .map((rs) => {
        const profileRs = profileServers.find(
          (p) => p.identifier.toLowerCase().replace(/\/$/, "") === rs.identifier!.toLowerCase().replace(/\/$/, "")
        )
        const allowedScopes = profileRs?.scopes !== undefined ? new Set(profileRs.scopes) : null
        const allScopes = (rs.scopes || []).map((s) => ({
          value: s.value,
          description: s.description || "",
        }))

        return {
          identifier: rs.identifier,
          name: rs.name,
          description: undefined,
          allowed_subject_types: ["client", "user"] as ("user" | "client")[],
          scopes: allowedScopes
            ? allScopes.filter((s) => allowedScopes.has(s.value))
            : allScopes,
        }
      })

    return NextResponse.json({ apis })
  } catch (err) {
    console.error("[GET /config/apis]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
