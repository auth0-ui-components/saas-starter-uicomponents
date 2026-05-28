import { redirect } from "next/navigation"

import { appClient, managementClient } from "@/lib/auth0"
import type { ApiClient, ClientCredential } from "@/types/applications"

import { ClientCredentials } from "../../components/client-credentials"

interface CredentialsPageProps {
  params: Promise<{ client_id: string }>
}

export default async function CredentialsPage({ params }: CredentialsPageProps) {
  const { client_id } = await params
  const session = await appClient.getSession()
  if (!session?.user?.org_id) redirect("/auth/login")
  const orgId = session.user.org_id as string

  const { data: rawClient } = await managementClient.clients.get({ client_id })
  const meta = rawClient.client_metadata as Record<string, string> | undefined
  if (meta?.org_id !== orgId) redirect("/dashboard/organization/applications")

  const { client_secret: clientSecret, ...client } = rawClient as unknown as ApiClient & {
    client_secret?: string
  }

  let credentials: ClientCredential[] = []
  try {
    const { data } = await managementClient.clients.getCredentials({ client_id })
    credentials = data as unknown as ClientCredential[]
  } catch (err: unknown) {
    const apiErr = err as { statusCode?: number }
    if (apiErr?.statusCode && apiErr.statusCode >= 500) {
      throw new Error("Failed to load credentials")
    }
  }

  return (
    <ClientCredentials
      client={client as ApiClient}
      credentials={credentials}
      clientSecret={clientSecret}
    />
  )
}
