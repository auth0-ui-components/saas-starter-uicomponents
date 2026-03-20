"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { clientsApi } from "@/lib/my-org-api"
import type { ApiClient } from "@/types/applications"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ClientSettingsProps {
  client: ApiClient
  domain: string
}

export function ClientSettings({ client, domain }: ClientSettingsProps) {
  const router = useRouter()
  const [name, setName] = useState(client.name)
  const [description, setDescription] = useState(client.description ?? "")
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmName, setConfirmName] = useState("")
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const isDirty =
    name !== client.name || description !== (client.description ?? "")

  async function copyToClipboard(value: string, field: string) {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await clientsApi.patch(client.client_id, {
        name: name.trim(),
        description: description.trim() || undefined,
      })
      toast.success("Settings saved")
      router.refresh()
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setName(client.name)
    setDescription(client.description ?? "")
  }

  async function handleDeleteClient() {
    try {
      await clientsApi.delete(client.client_id)
      toast.success("Application deleted")
      router.push("/dashboard/organization/applications")
    } catch (err: unknown) {
      const apiErr = err as { status?: number; body?: { error?: string } }
      if (apiErr?.status === 409) {
        toast.error(apiErr.body?.error || "Cannot delete: remove all API grants first.")
      } else {
        toast.error("Failed to delete application")
      }
    }
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="app-name">Name</Label>
              <div className="relative">
                <Input autoComplete="off"
                  id="app-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={128}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(name, "name")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedField === "name" ? (
                    <CheckIcon className="h-4 w-4 text-green-600" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Domain</Label>
              <div className="relative">
                <Input autoComplete="off"
                  value={domain}
                  readOnly
                  className="bg-muted text-muted-foreground cursor-default pr-10"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(domain, "domain")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedField === "domain" ? (
                    <CheckIcon className="h-4 w-4 text-green-600" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Client ID</Label>
              <div className="relative">
                <Input autoComplete="off"
                  value={client.client_id}
                  readOnly
                  className="bg-muted font-mono text-sm text-muted-foreground cursor-default pr-10"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(client.client_id, "clientId")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedField === "clientId" ? (
                    <CheckIcon className="h-4 w-4 text-green-600" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="app-description">Description</Label>
              <textarea
                id="app-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={512}
                rows={4}
                placeholder="A free text description of the application."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Max character count is 512.
              </p>
            </div>

            {isDirty && (
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" disabled={saving || !name.trim()}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Delete this application</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this application. This action cannot be undone.
              </p>
            </div>
            <AlertDialog open={deleteOpen} onOpenChange={(v) => { setDeleteOpen(v); if (!v) setConfirmName("") }}>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="bg-[#C32F26] text-white hover:bg-[#9C261E]">Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <p className="text-sm text-muted-foreground">
                    This action cannot be undone. This will permanently delete the{" "}
                    <strong>{client.name}</strong> application.
                  </p>
                </AlertDialogHeader>
                <p className="text-sm">Please type in the name of the application to confirm.</p>
                <div className="mb-4">
                  <Label htmlFor="delete-confirm" className="block mb-4">
                    Name <span className="text-[#C32F26]">*</span>
                  </Label>
                  <Input autoComplete="off"
                    id="delete-confirm"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-[#C32F26] text-white hover:bg-[#9C261E]"
                    disabled={confirmName !== client.name}
                    onClick={handleDeleteClient}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
