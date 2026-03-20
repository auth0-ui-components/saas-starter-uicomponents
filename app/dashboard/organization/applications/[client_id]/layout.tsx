import { redirect } from "next/navigation"

import { appClient, managementClient } from "@/lib/auth0"
import { AppBreadcrumb } from "@/components/app-breadcrumb"
import { AppType } from "@/types/applications"

import AppNavLink from "../components/app-nav-link"

const APP_TYPE_LABELS: Record<string, string> = {
  [AppType.NonInteractive]: "Machine to Machine Application",
  [AppType.Web]: "Regular Web Application",
  [AppType.SPA]: "Single Page Web Application",
  [AppType.Native]: "Native",
}

interface ClientDetailLayoutProps {
  children: React.ReactNode
  params: Promise<{ client_id: string }>
}

export default async function ClientDetailLayout({
  children,
  params,
}: ClientDetailLayoutProps) {
  const { client_id } = await params
  const session = await appClient.getSession()
  const orgId = session!.user.org_id as string

  let clientName = "Application"
  let appType = ""
  let isFirstParty = true

  try {
    const { data: client } = await managementClient.clients.get({ client_id })
    const meta = client.client_metadata as Record<string, string> | undefined
    if (meta?.org_id !== orgId) redirect("/dashboard/organization/applications")
    clientName = client.name || "Application"
    appType = (client.app_type as string) || ""
    isFirstParty = (client as unknown as Record<string, unknown>).is_first_party !== false
  } catch {
    redirect("/dashboard/organization/applications")
  }

  return (
    <div className="space-y-2">
      <div className="px-2 py-3">
        <AppBreadcrumb title="Back to Applications" href="/dashboard/organization/applications" />
      </div>

      <div className="space-y-4">
        <div className="px-6 space-y-1">
          <h2 className="text-2xl font-semibold">{clientName}</h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            {appType && <span>{APP_TYPE_LABELS[appType] ?? appType}</span>}
            <span className="text-muted-foreground/40">·</span>
            <span>
              Client ID{" "}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                {client_id}
              </code>
            </span>
            {!isFirstParty && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="rounded border px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
                  Third-Party
                </span>
              </>
            )}
          </div>
        </div>

        <nav className="space-x-6 border-b px-6 pt-4 pb-2 text-sm">
          <AppNavLink slug="settings">Settings</AppNavLink>
          <AppNavLink slug="credentials">Credentials</AppNavLink>
          <AppNavLink slug="apis">APIs</AppNavLink>
        </nav>

        <div>{children}</div>
      </div>
    </div>
  )
}
