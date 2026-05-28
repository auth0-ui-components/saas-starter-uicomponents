import { managementClient } from "@/lib/auth0"

export async function verifyClientOwnership(clientId: string, orgId: string): Promise<boolean> {
  try {
    const { data: client } = await managementClient.clients.get({ client_id: clientId })
    const meta = client.client_metadata as Record<string, string> | undefined
    return meta?.org_id === orgId
  } catch {
    return false
  }
}

export async function verifyGrantOwnership(
  clientId: string,
  grantId: string,
  orgId: string
): Promise<boolean> {
  const [{ data: client }, { data: firstPage }] = await Promise.all([
    managementClient.clients.get({ client_id: clientId }),
    managementClient.clientGrants.getAll({ client_id: clientId, per_page: 100, page: 0 }),
  ])

  const meta = client.client_metadata as Record<string, string> | undefined
  if (meta?.org_id !== orgId) return false

  let grantFound = firstPage.some((g) => g.id === grantId)
  let page = 1
  let current = firstPage
  while (!grantFound && current.length === 100) {
    const { data: next } = await managementClient.clientGrants.getAll({ client_id: clientId, per_page: 100, page })
    grantFound = next.some((g) => g.id === grantId)
    current = next
    page++
  }

  return grantFound
}
