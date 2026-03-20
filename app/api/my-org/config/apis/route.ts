import { NextResponse } from "next/server"

import { appClient, managementClient } from "@/lib/auth0"

export async function GET() {
  const session = await appClient.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { data: resourceServers } = await managementClient.resourceServers.getAll({ per_page: 50 })

    const filtered = resourceServers.filter((rs) => !rs.is_system)

    const apis = filtered.map((rs) => ({
      identifier: rs.identifier,
      name: rs.name,
      description: undefined,
      allowed_subject_types: ["client", "user"] as ("user" | "client")[],
      scopes: (rs.scopes || []).map((s) => ({
        value: s.value,
        description: s.description || "",
      })),
    }))

    return NextResponse.json({ apis })
  } catch (err) {
    console.error("[GET /config/apis]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
