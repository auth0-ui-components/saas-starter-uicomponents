import { NextRequest, NextResponse } from "next/server"

import { appClient, managementClient } from "@/lib/auth0"
import type { ClientCredential } from "@/types/applications"

interface RouteParams {
  params: Promise<{ client_id: string }>
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

  const { client_id } = await params
  const orgId = session.user.org_id as string

  if (!(await verifyOwnership(client_id, orgId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const { data: credentials } = await managementClient.clients.getCredentials({ client_id })
    return NextResponse.json({ credentials: credentials as unknown as ClientCredential[] })
  } catch (err) {
    console.error("[GET /clients/:id/credentials]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await appClient.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { client_id } = await params
  const orgId = session.user.org_id as string

  if (!(await verifyOwnership(client_id, orgId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { algorithm, ...rest } = await req.json()

  try {
    const { data: credential } = await managementClient.clients.createCredential(
      { client_id },
      { ...rest, ...(algorithm ? { alg: algorithm } : {}) }
    )
    return NextResponse.json(credential as unknown as ClientCredential, { status: 201 })
  } catch (err) {
    console.error("[POST /clients/:id/credentials]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
