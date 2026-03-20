import { NextRequest, NextResponse } from "next/server"

import { appClient, managementClient } from "@/lib/auth0"

interface RouteParams {
  params: Promise<{ client_id: string }>
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await appClient.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { client_id } = await params
  const orgId = session.user.org_id as string

  // Verify ownership
  try {
    const { data: client } = await managementClient.clients.get({ client_id })
    const meta = client.client_metadata as Record<string, string> | undefined
    if (meta?.org_id !== orgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const { data: result } = await managementClient.clients.rotateClientSecret({ client_id })
    return NextResponse.json({ client_secret: (result as unknown as Record<string, string>).client_secret })
  } catch (err) {
    console.error("[POST /clients/:id/rotate-secret]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
