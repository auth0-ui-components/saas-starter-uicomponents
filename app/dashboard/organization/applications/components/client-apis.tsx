"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PencilIcon } from "lucide-react"

import type { ClientGrant, ConfigApi } from "@/types/applications"
import { Button } from "@/components/ui/button"
import { ClientGrantForm } from "./client-grant-form"

interface ClientApisProps {
  availableApis: ConfigApi[]
  grants: ClientGrant[]
}

export function ClientApis({ availableApis, grants: initialGrants }: ClientApisProps) {
  const router = useRouter()
  const [grants, setGrants] = useState<ClientGrant[]>(initialGrants)
  const [grantFormOpen, setGrantFormOpen] = useState(false)
  const [formApi, setFormApi] = useState<ConfigApi | null>(null)
  const [formGrant, setFormGrant] = useState<ClientGrant | null>(null)

  function normalizeAudience(s: string) {
    return s.toLowerCase().replace(/\/$/, "")
  }

  const authorizedApis = availableApis
    .map((api) => ({
      api,
      grant: grants.find(
        (g) => normalizeAudience(g.audience) === normalizeAudience(api.identifier)
      ),
    }))
    .filter(({ grant }) => !!grant)

  function openEdit(api: ConfigApi, grant: ClientGrant) {
    setFormApi(api)
    setFormGrant(grant)
    setGrantFormOpen(true)
  }

  function handleGrantSuccess(grant: ClientGrant) {
    setGrants((prev) => {
      const idx = prev.findIndex((g) => g.id === grant.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = grant
        return next
      }
      return [...prev, grant]
    })
    router.refresh()
  }

  return (
    <div className="space-y-4 p-6">
      {authorizedApis.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          No API access has been granted for this application.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-300">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-300 bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-1/4">API Name</th>
                <th className="px-4 py-3 text-left font-medium w-1/3">API Audience</th>
                <th className="px-4 py-3 text-left font-medium">Permitted Scopes</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {authorizedApis.map(({ api, grant }) => (
                <tr key={api.identifier} className="border-b border-gray-300 last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{api.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {api.identifier}
                  </td>
                  <td className="px-4 py-3">
                    {grant!.scope.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {grant!.scope.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs font-mono"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(api, grant!)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formApi && formGrant && (
        <ClientGrantForm
          key={formGrant.id}
          open={grantFormOpen}
          onOpenChange={setGrantFormOpen}
          api={formApi}
          existingGrant={formGrant}
          onSuccess={handleGrantSuccess}
        />
      )}
    </div>
  )
}
