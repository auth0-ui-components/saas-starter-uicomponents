import { NextRequest, NextResponse } from "next/server"

import { appClient, managementClient } from "@/lib/auth0"
import type { ClientGrant } from "@/types/applications"

interface RouteParams {
  params: Promise<{ grant_id: string }>
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
    // Run org check and first page of grants in parallel
    const [{ data: client }, { data: firstPage }] = await Promise.all([
      managementClient.clients.get({ client_id }),
      managementClient.clientGrants.getAll({ client_id, per_page: 100, page: 0 }),
    ])

    const meta = client.client_metadata as Record<string, string> | undefined
    if (meta?.org_id !== orgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    let grantFound = firstPage.some((g) => g.id === grant_id)
    let page = 1
    let current = firstPage
    while (!grantFound && current.length === 100) {
      const { data: next } = await managementClient.clientGrants.getAll({ client_id, per_page: 100, page })
      grantFound = next.some((g) => g.id === grant_id)
      current = next
      page++
    }

    if (!grantFound) {
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
