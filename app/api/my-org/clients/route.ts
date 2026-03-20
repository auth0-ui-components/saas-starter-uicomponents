import { NextRequest, NextResponse } from "next/server"

import { appClient, managementClient } from "@/lib/auth0"
import type { ApiClient } from "@/types/applications"

function stripSecret(client: Record<string, unknown>) {
  const { client_secret: _, ...rest } = client
  return rest
}

export async function GET() {
  const session = await appClient.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = session.user.org_id as string

  try {
    const allClients: Awaited<ReturnType<typeof managementClient.clients.getAll>>["data"] = []
    let page = 0
    const PER_PAGE = 100
    while (true) {
      const { data } = await managementClient.clients.getAll({ per_page: PER_PAGE, page })
      allClients.push(...data)
      if (data.length < PER_PAGE) break
      page++
    }

    const orgClients = allClients
      .filter((c) => (c.client_metadata as Record<string, string> | undefined)?.org_id === orgId)
      .map((c) => stripSecret(c as unknown as Record<string, unknown>))

    return NextResponse.json({ clients: orgClients as unknown as ApiClient[] })
  } catch (err) {
    console.error("[GET /clients]", err)
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

  try {
    const { data: created } = await managementClient.clients.create({
      ...body,
      client_metadata: { org_id: orgId },
      is_first_party: false,
    })

    return NextResponse.json(created as unknown as ApiClient, { status: 201 })
  } catch (err: unknown) {
    const apiErr = err as { statusCode?: number; body?: string; message?: string }
    console.error("[POST /clients]", err)
    if (apiErr?.statusCode && apiErr.statusCode < 500) {
      try {
        const parsed = typeof apiErr.body === "string" ? JSON.parse(apiErr.body) : {}
        return NextResponse.json({ error: parsed?.message || apiErr.message || "Bad request" }, { status: apiErr.statusCode })
      } catch {
        return NextResponse.json({ error: apiErr.message || "Bad request" }, { status: apiErr.statusCode })
      }
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
