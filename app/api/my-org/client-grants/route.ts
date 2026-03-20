import { NextRequest, NextResponse } from "next/server"

import { appClient, managementClient } from "@/lib/auth0"
import type { ClientGrant } from "@/types/applications"

export async function GET(req: NextRequest) {
  const session = await appClient.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = session.user.org_id as string
  const { searchParams } = new URL(req.url)
  const filterClientId = searchParams.get("client_id")
  const filterAudience = searchParams.get("audience")

  try {
    if (filterClientId) {
      // Verify this specific client belongs to the org, then fetch its grants directly
      const { data: client } = await managementClient.clients.get({ client_id: filterClientId })
      const meta = client.client_metadata as Record<string, string> | undefined
      if (meta?.org_id !== orgId) {
        return NextResponse.json({ grants: [] })
      }
      const params: { client_id: string; audience?: string } = { client_id: filterClientId }
      if (filterAudience) params.audience = filterAudience
      const { data } = await managementClient.clientGrants.getAll(params)
      return NextResponse.json({ grants: data as unknown as ClientGrant[] })
    }

    // No client_id filter — fetch all org clients then aggregate their grants
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

    if (orgClientIds.length === 0) {
      return NextResponse.json({ grants: [] })
    }

    const grantsArrays = await Promise.all(
      orgClientIds.map(async (cid) => {
        const params: { client_id: string; audience?: string } = { client_id: cid }
        if (filterAudience) params.audience = filterAudience
        const { data } = await managementClient.clientGrants.getAll(params)
        return data
      })
    )

    const grants = grantsArrays.flat() as unknown as ClientGrant[]
    return NextResponse.json({ grants })
  } catch (err) {
    console.error("[GET /client-grants]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await appClient.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = session.user.org_id as string
  const body = await req.json()
  const { client_id, audience, scope } = body

  try {
    // Verify client belongs to org
    const { data: client } = await managementClient.clients.get({ client_id })
    const meta = client.client_metadata as Record<string, string> | undefined
    if (meta?.org_id !== orgId) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Do not send subject_type — Auth0 infers it from the client's app_type.
    // Sending it explicitly causes grants to be created in a hidden state not visible in the Dashboard.
    const { data: grant } = await managementClient.clientGrants.create({
      client_id,
      audience,
      scope,
    } as Parameters<typeof managementClient.clientGrants.create>[0])

    return NextResponse.json(grant as unknown as ClientGrant, { status: 201 })
  } catch (err: unknown) {
    const apiErr = err as { statusCode?: number }
    if (apiErr?.statusCode === 409) {
      return NextResponse.json({ error: "Grant already exists for this client and audience" }, { status: 409 })
    }
    console.error("[POST /client-grants]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
