import { redirect } from "next/navigation"

import { appClient, managementClient } from "@/lib/auth0"
import { getDefaultProfile } from "@/lib/app-profile"
import type { ApiClient } from "@/types/applications"

import { ClientSettings } from "../../components/client-settings"

interface SettingsPageProps {
  params: Promise<{ client_id: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { client_id } = await params
  const session = await appClient.getSession()
  if (!session?.user?.org_id) redirect("/auth/login")
  const orgId = session.user.org_id as string

  const { data: rawClient } = await managementClient.clients.get({ client_id })
  const meta = rawClient.client_metadata as Record<string, string> | undefined
  if (meta?.org_id !== orgId) redirect("/dashboard/organization/applications")

  const domain = process.env.AUTH0_MANAGEMENT_API_DOMAIN ?? ""
  const profile = getDefaultProfile()
  const tokenLifetimeConfig = profile.client_configuration.refresh_token?.token_lifetime
  const allowedTokenLifetimes = typeof tokenLifetimeConfig === "object"
    ? tokenLifetimeConfig.allowed_values
    : undefined

  return (
    <ClientSettings
      client={rawClient as unknown as ApiClient}
      domain={domain}
      allowedTokenLifetimes={allowedTokenLifetimes}
    />
  )
}
