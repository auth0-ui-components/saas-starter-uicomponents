import { redirect } from "next/navigation"

import { appClient, managementClient } from "@/lib/auth0"
import { getDefaultProfile } from "@/lib/app-profile"
import type { ClientGrant, ConfigApi } from "@/types/applications"

import { ClientApis } from "../../components/client-apis"

interface ApisPageProps {
  params: Promise<{ client_id: string }>
}

export default async function ApisPage({ params }: ApisPageProps) {
  const { client_id } = await params
  const session = await appClient.getSession()
  const orgId = session!.user.org_id as string

  const { data: rawClient } = await managementClient.clients.get({ client_id })
  const meta = rawClient.client_metadata as Record<string, string> | undefined
  if (meta?.org_id !== orgId) redirect("/dashboard/organization/applications")

  const profile = getDefaultProfile()
  const allowedIdentifiers = profile.client_grant_configuration.resource_servers.map((rs) =>
    rs.identifier.toLowerCase().replace(/\/$/, "")
  )

  if (allowedIdentifiers.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No APIs are configured. Add resource servers to{" "}
        <code className="font-mono bg-muted px-1 rounded">config/app-profiles.json</code>{" "}
        to enable API access management.
      </div>
    )
  }

  const { data: resourceServers } = await managementClient.resourceServers.getAll({
    per_page: 50,
  })

  const profileServers = profile.client_grant_configuration.resource_servers

  const apis: ConfigApi[] = resourceServers
    .filter((rs) => !rs.is_system)
    .filter((rs) => allowedIdentifiers.includes(rs.identifier!.toLowerCase().replace(/\/$/, "")))
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
        identifier: rs.identifier!,
        name: rs.name!,
        allowed_subject_types: ["client", "user"] as ("user" | "client")[],
        scopes: allowedScopes
          ? allScopes.filter((s) => allowedScopes.has(s.value))
          : allScopes,
      }
    })

  if (apis.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No matching APIs were found. Verify that the identifiers in{" "}
        <code className="font-mono bg-muted px-1 rounded">config/app-profiles.json</code>{" "}
        match the resource server identifiers in your tenant.
      </div>
    )
  }

  const { data: allGrants } = await managementClient.clientGrants.getAll({ client_id })
  const grants = allGrants as unknown as ClientGrant[]

  return <ClientApis availableApis={apis} grants={grants} clientId={client_id} />
}
