import { appClient, managementClient } from "@/lib/auth0"
import type { ApiClient } from "@/types/applications"
import { ClientList } from "./components/client-list"

export default async function ApplicationsPage() {
  const session = await appClient.getSession()
  const orgId = session!.user.org_id as string

  const allClients: ApiClient[] = []
  let page = 0
  const per_page = 100
  while (true) {
    const { data: batch } = await managementClient.clients.getAll({ page, per_page })
    allClients.push(...(batch as unknown as ApiClient[]))
    if (batch.length < per_page) break
    page++
  }

  const orgClients = allClients.filter(
    (c) => (c as unknown as Record<string, Record<string, string>>).client_metadata?.org_id === orgId
  )

  return <ClientList clients={orgClients} />
}
