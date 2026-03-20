import { NextRequest, NextResponse } from "next/server"

import { appClient, managementClient } from "@/lib/auth0"
import type { ClientCredential } from "@/types/applications"

interface RouteParams {
  params: Promise<{ client_id: string; credential_id: string }>
}

async function verifyOwnership(clientId: string, orgId: string): Promise<boolean> {
  try {
    const { data: client } = await managementClient.clients.get({ client_id: clientId })
    const meta = client.client_metadata as Record<string, string> | undefined
    return meta?.org_id === orgId
  } catch {
    return false
  }
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await appClient.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { client_id, credential_id } = await params
  const orgId = session.user.org_id as string

  if (!(await verifyOwnership(client_id, orgId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const { data: credential } = await managementClient.clients.getCredential({
      client_id,
      credential_id,
    })
    return NextResponse.json(credential as unknown as ClientCredential)
  } catch (err) {
    console.error("[GET /clients/:id/credentials/:cid]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await appClient.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { client_id, credential_id } = await params
  const orgId = session.user.org_id as string

  if (!(await verifyOwnership(client_id, orgId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json()

  try {
    const { data: updated } = await managementClient.clients.updateCredential(
      { client_id, credential_id },
      body
    )
    return NextResponse.json(updated as unknown as ClientCredential)
  } catch (err) {
    console.error("[PATCH /clients/:id/credentials/:cid]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await appClient.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { client_id, credential_id } = await params
  const orgId = session.user.org_id as string

  if (!(await verifyOwnership(client_id, orgId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    await managementClient.clients.deleteCredential({ client_id, credential_id })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error("[DELETE /clients/:id/credentials/:cid]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
