import { NextRequest, NextResponse } from "next/server"

import { appClient, managementClient } from "@/lib/auth0"
import type { ClientGrant } from "@/types/applications"

interface RouteParams {
  params: Promise<{ grant_id: string }>
}

// Used only by GET — Auth0 has no single-grant GET endpoint so a scan is unavoidable there.
// PATCH and DELETE receive client_id from the caller and skip this.
async function findGrantInOrg(
  grantId: string,
  orgId: string
): Promise<ClientGrant | null> {
  const allClients: Awaited<ReturnType<typeof managementClient.clients.getAll>>["data"] = []
  let page = 0
  const PER_PAGE = 100
  while (true) {
    const { data } = await managementClient.clients.getAll({
      per_page: PER_PAGE,
      page,
      fields: "client_id,client_metadata",
      include_fields: true,
    })
    allClients.push(...data)
    if (data.length < PER_PAGE) break
    page++
  }

  const orgClientIds = allClients
    .filter((c) => (c.client_metadata as Record<string, string> | undefined)?.org_id === orgId)
    .map((c) => c.client_id!)

  for (const clientId of orgClientIds) {
    const { data: grants } = await managementClient.clientGrants.getAll({ client_id: clientId })
    const match = grants.find((g) => g.id === grantId)
    if (match) return match as unknown as ClientGrant
  }

  return null
}

async function verifyGrantOwnership(
  clientId: string,
  grantId: string,
  orgId: string
): Promise<boolean> {
  const { data: client } = await managementClient.clients.get({ client_id: clientId })
  const meta = client.client_metadata as Record<string, string> | undefined
  if (meta?.org_id !== orgId) return false

  const { data: grants } = await managementClient.clientGrants.getAll({ client_id: clientId })
  return grants.some((g) => g.id === grantId)
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await appClient.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { grant_id } = await params
  const orgId = session.user.org_id as string

  try {
    const grant = await findGrantInOrg(grant_id, orgId)
    if (!grant) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(grant)
  } catch (err) {
    console.error("[GET /client-grants/:id]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await appClient.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { grant_id } = await params
  const orgId = session.user.org_id as string
  const body = await req.json()
  // Auth0 Management API only accepts `scope` on grant updates — subject_type is not mutable
  const { scope, client_id } = body

  if (!client_id) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 })
  }

  try {
    if (!await verifyGrantOwnership(client_id, grant_id, orgId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { data: updated } = await managementClient.clientGrants.update(
      { id: grant_id },
      { scope }
    )
    return NextResponse.json(updated as unknown as ClientGrant)
  } catch (err) {
    console.error("[PATCH /client-grants/:id]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await appClient.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { grant_id } = await params
  const orgId = session.user.org_id as string
  const client_id = new URL(req.url).searchParams.get("client_id")

  if (!client_id) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 })
  }

  try {
    if (!await verifyGrantOwnership(client_id, grant_id, orgId)) {
      // Idempotent — grant doesn't exist or doesn't belong to this org
      return new NextResponse(null, { status: 204 })
    }

    await managementClient.clientGrants.delete({ id: grant_id })
  } catch (err: unknown) {
    const apiErr = err as { statusCode?: number }
    if (apiErr?.statusCode === 404) {
      return new NextResponse(null, { status: 204 })
    }
    console.error("[DELETE /client-grants/:id]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
