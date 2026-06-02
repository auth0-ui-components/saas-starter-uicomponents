import { NextRequest, NextResponse } from "next/server"

import { appClient, managementClient } from "@/lib/auth0"
import { verifyGrantOwnership } from "@/lib/my-org-ownership"
import type { ClientGrant } from "@/types/applications"

interface RouteParams {
  params: Promise<{ grant_id: string }>
}

/*
 * Updates the scopes on an existing grant. The scope array is fully replaced, not merged.
 * Auth0's Management API only accepts `scope` on grant updates — subject_type is set at creation and is not mutable.
 * Auth0's SDK has no single-grant GET by ID, so ownership is verified by fetching grants for the
 * provided client_id and confirming grant_id appears among them. The org ownership check and
 * first grants page are fetched in parallel to reduce round-trips.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await appClient.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { grant_id } = await params
  const orgId = session.user.org_id as string
  const body = await req.json()
  const { scope, client_id } = body

  if (!client_id) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 })
  }

  try {
    if (!(await verifyGrantOwnership(client_id, grant_id, orgId))) {
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

/*
 * Revokes a client grant after verifying the grant belongs to an org-owned client.
 * client_id is required as a query param for ownership verification.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await appClient.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { grant_id } = await params
  const orgId = session.user.org_id as string
  const client_id = req.nextUrl.searchParams.get("client_id")

  if (!client_id) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 })
  }

  try {
    if (!(await verifyGrantOwnership(client_id, grant_id, orgId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await managementClient.clientGrants.delete({ id: grant_id })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error("[DELETE /client-grants/:id]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
