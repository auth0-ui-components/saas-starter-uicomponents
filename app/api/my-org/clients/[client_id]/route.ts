import { NextRequest, NextResponse } from "next/server"

import { appClient, managementClient } from "@/lib/auth0"
import type { ApiClient } from "@/types/applications"

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

/*
 * Returns a single client. Verifies org ownership via client_metadata.org_id.
 * Returns 404 (not 403) for clients not owned by this org to avoid leaking their existence.
 * client_secret is stripped from the response.
 */
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
    const { data: client } = await managementClient.clients.get({ client_id })
    const { client_secret: _, ...rest } = client as unknown as Record<string, unknown>
    return NextResponse.json(rest as unknown as ApiClient)
  } catch (err) {
    console.error("[GET /clients/:id]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/*
 * Updates a client's name, description, or token_endpoint_auth_method.
 * Handles an Auth0 quirk: switching to/from private_key_jwt requires mutually nulling
 * token_endpoint_auth_method and client_authentication_methods — sending both causes an error.
 * When enabling PKJ, verifies at least one public key credential exists first.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await appClient.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { client_id } = await params
  const orgId = session.user.org_id as string

  if (!(await verifyOwnership(client_id, orgId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json()

  // Auth0 requires mutual nulling when switching between token_endpoint_auth_method and client_authentication_methods
  let updateBody = { ...body }
  if (body.token_endpoint_auth_method === "private_key_jwt") {
    const { token_endpoint_auth_method: _, ...rest } = body
    const { data: existingCreds } = await managementClient.clients.getCredentials({ client_id })
    const credIds = (existingCreds || []).map((c: { id: string }) => ({ id: c.id }))
    if (credIds.length === 0) {
      return NextResponse.json(
        { error: "Add a public key credential before enabling Private Key JWT authentication." },
        { status: 400 }
      )
    }
    updateBody = { ...rest, token_endpoint_auth_method: null, jwt_configuration: { alg: "RS256" }, client_authentication_methods: { private_key_jwt: { credentials: credIds } } }
  } else if (body.token_endpoint_auth_method) {
    // Switching away from PKJ — must null out client_authentication_methods
    updateBody = { ...body, client_authentication_methods: null }
  }

  try {
    const { data: updated } = await managementClient.clients.update(
      { client_id },
      updateBody as Parameters<typeof managementClient.clients.update>[1]
    )
    const { client_secret: _, ...rest } = updated as unknown as Record<string, unknown>
    return NextResponse.json(rest as unknown as ApiClient)
  } catch (err: unknown) {
    const apiErr = err as { statusCode?: number; body?: string; message?: string }
    console.error("[PATCH /clients/:id]", err)
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

/*
 * Deletes a client after verifying org ownership.
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
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
    await managementClient.clients.delete({ client_id })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error("[DELETE /clients/:id]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
