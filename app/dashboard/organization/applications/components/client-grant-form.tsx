"use client"

import { useState } from "react"
import { toast } from "sonner"

import { grantsApi } from "@/lib/my-org-api"
import type { ClientGrant, ConfigApi } from "@/types/applications"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ClientGrantFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  api: ConfigApi
  existingGrant: ClientGrant
  onSuccess: (grant: ClientGrant) => void
}

export function ClientGrantForm({
  open,
  onOpenChange,
  api,
  existingGrant,
  onSuccess,
}: ClientGrantFormProps) {
  const displayScopes = api.scopes.filter((s) => existingGrant.scope.includes(s.value))
  const [selectedScopes, setSelectedScopes] = useState<string[]>(existingGrant.scope)
  const [loading, setLoading] = useState(false)

  function toggleScope(value: string) {
    setSelectedScopes((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const scopesToSend = selectedScopes.filter((s) => displayScopes.some((d) => d.value === s))

    if (scopesToSend.length === 0) {
      toast.error("Select at least one scope")
      return
    }
    setLoading(true)

    try {
      const updated = await grantsApi.patch(existingGrant.id, existingGrant.client_id, { scope: scopesToSend })
      onSuccess(updated)
      toast.success("Grant updated")
      onOpenChange(false)
    } catch (err: unknown) {
      const apiErr = err as { status?: number }
      if (apiErr?.status === 409) {
        toast.error("A grant already exists for this client and API")
      } else {
        toast.error("Failed to update grant")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit API Access</DialogTitle>
            <DialogDescription>
              {api.name} — {api.identifier}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Scopes</Label>
            {displayScopes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No scopes defined for this API.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg border p-3">
                {displayScopes.map((scope) => (
                  <label
                    key={scope.value}
                    className="flex items-start gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-mono font-medium">{scope.value}</p>
                      {scope.description && (
                        <p className="text-xs text-muted-foreground">
                          {scope.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || displayScopes.length === 0}>
              {loading ? "Saving..." : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
