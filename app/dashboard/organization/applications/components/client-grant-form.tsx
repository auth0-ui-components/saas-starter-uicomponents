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
  clientId: string
  existingGrant?: ClientGrant
  onSuccess: (grant: ClientGrant) => void
}

export function ClientGrantForm({
  open,
  onOpenChange,
  api,
  clientId,
  existingGrant,
  onSuccess,
}: ClientGrantFormProps) {
  const isCreate = !existingGrant
  const [selectedScopes, setSelectedScopes] = useState<string[]>(
    existingGrant?.scope ?? api.scopes.map((s) => s.value)
  )
  const [loading, setLoading] = useState(false)

  function toggleScope(value: string) {
    setSelectedScopes((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      let result: ClientGrant
      if (isCreate) {
        result = await grantsApi.create({
          client_id: clientId,
          audience: api.identifier,
          scope: selectedScopes,
        })
        toast.success("API access authorized")
      } else {
        result = await grantsApi.patch(existingGrant.id, clientId, { scope: selectedScopes })
        toast.success("Grant updated")
      }
      onSuccess(result)
      onOpenChange(false)
    } catch (err: unknown) {
      const apiErr = err as { status?: number }
      if (apiErr?.status === 409) {
        toast.error("A grant already exists for this client and API")
      } else {
        toast.error(isCreate ? "Failed to authorize API access" : "Failed to update grant")
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
            <DialogTitle>{isCreate ? "Authorize API Access" : "Edit API Access"}</DialogTitle>
            <DialogDescription>
              {api.name} — {api.identifier}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Scopes</Label>
            {api.scopes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scopes defined for this API.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg border p-3">
                {api.scopes.map((scope) => (
                  <label key={scope.value} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-mono font-medium">{scope.value}</p>
                      {scope.description && (
                        <p className="text-xs text-muted-foreground">{scope.description}</p>
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
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isCreate ? "Authorize" : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
