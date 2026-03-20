import { redirect } from "next/navigation"

import { appClient, managementClient } from "@/lib/auth0"
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

  const allowedAudiences = (process.env.THIRD_PARTY_API_AUDIENCES ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/\/$/, ""))
    .filter(Boolean)

  if (allowedAudiences.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No APIs are configured. Set the{" "}
        <code className="font-mono bg-muted px-1 rounded">THIRD_PARTY_API_AUDIENCES</code>{" "}
        environment variable to enable API access management.
      </div>
    )
  }

  const { data: resourceServers } = await managementClient.resourceServers.getAll({
    per_page: 50,
  })

  const apis: ConfigApi[] = resourceServers
    .filter((rs) => !rs.is_system)
    .filter((rs) =>
      allowedAudiences.includes(rs.identifier!.toLowerCase().replace(/\/$/, ""))
    )
    .map((rs) => ({
      identifier: rs.identifier!,
      name: rs.name!,
      allowed_subject_types: ["client", "user"] as ("user" | "client")[],
      scopes: (rs.scopes || []).map((s) => ({
        value: s.value,
        description: s.description || "",
      })),
    }))

  if (apis.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No matching APIs were found. Verify that the{" "}
        <code className="font-mono bg-muted px-1 rounded">THIRD_PARTY_API_AUDIENCES</code>{" "}
        values match the identifiers of resource servers in your tenant.
      </div>
    )
  }

  const { data: allGrants } = await managementClient.clientGrants.getAll({ client_id })
  const grants = allGrants as unknown as ClientGrant[]

  return <ClientApis availableApis={apis} grants={grants} />
}
