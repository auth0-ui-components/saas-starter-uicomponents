"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, CopyIcon, InfoIcon } from "lucide-react"
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
  allowedTokenLifetimes?: number[]
}

const APP_TYPE_LABELS: Record<string, string> = {
  native: "Native",
  regular_web: "Regular Web Application",
  spa: "Single Page Web Application",
  non_interactive: "Machine to Machine",
}

function toLines(arr?: string[]) {
  return (arr ?? []).join("\n")
}

function fromLines(str: string) {
  return str.split("\n").map((s) => s.trim()).filter(Boolean)
}

function formatDuration(seconds: number) {
  const days = Math.floor(seconds / 86400)
  if (days > 0) return `${days} day${days !== 1 ? "s" : ""}`
  const hours = Math.floor(seconds / 3600)
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""}`
  return `${seconds} seconds`
}

export function ClientSettings({ client, domain, allowedTokenLifetimes }: ClientSettingsProps) {
  const router = useRouter()

  // Basic info
  const [name, setName] = useState(client.name)
  const [description, setDescription] = useState(client.description ?? "")

  // Application Properties
  const [logoUri, setLogoUri] = useState(client.logo_uri ?? "")

  // Token lifetime
  const [tokenLifetime, setTokenLifetime] = useState(
    client.refresh_token?.token_lifetime ?? 0
  )

  // Application URIs
  const [callbacks, setCallbacks] = useState(toLines(client.callbacks))
  const [webOrigins, setWebOrigins] = useState(toLines(client.web_origins))
  const [allowedOrigins, setAllowedOrigins] = useState(toLines(client.allowed_origins))

  // Save state
  const [saving, setSaving] = useState(false)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmName, setConfirmName] = useState("")

  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  const isDirty =
    name !== client.name ||
    description !== (client.description ?? "") ||
    logoUri !== (client.logo_uri ?? "") ||
    tokenLifetime !== (client.refresh_token?.token_lifetime ?? 0) ||
    callbacks !== toLines(client.callbacks) ||
    webOrigins !== toLines(client.web_origins) ||
    allowedOrigins !== toLines(client.allowed_origins)

  useEffect(() => {
    if (!isDirty) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    const handleLinkClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a")
      if (anchor?.href && !anchor.href.startsWith("javascript")) {
        e.preventDefault()
        e.stopPropagation()
        setPendingHref(anchor.href)
        setLeaveDialogOpen(true)
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("click", handleLinkClick, true)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("click", handleLinkClick, true)
    }
  }, [isDirty])

  function confirmLeave() {
    setLeaveDialogOpen(false)
    if (pendingHref) {
      router.push(pendingHref)
    }
  }

  async function copyToClipboard(value: string, field: string) {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  async function handleSave() {
    if (!name.trim()) return
    if (
      tokenLifetime !== (client.refresh_token?.token_lifetime ?? 0) &&
      allowedTokenLifetimes &&
      allowedTokenLifetimes.length >= 2
    ) {
      const [min, max] = allowedTokenLifetimes
      if (tokenLifetime < min || tokenLifetime > max) {
        toast.error(`Maximum Refresh Token Lifetime must be between ${min} and ${max} seconds.`)
        return
      }
    }
    setSaving(true)
    try {
      await clientsApi.patch(client.client_id, {
        name: name.trim(),
        description: description.trim() || undefined,
        logo_uri: logoUri.trim() || undefined,
        callbacks: fromLines(callbacks),
        web_origins: fromLines(webOrigins),
        allowed_origins: fromLines(allowedOrigins),
        ...(tokenLifetime !== (client.refresh_token?.token_lifetime ?? 0) && {
          refresh_token: {
            ...client.refresh_token,
            token_lifetime: tokenLifetime,
          },
        }),
      })
      toast.success("Settings saved")
      router.refresh()
    } catch (err: unknown) {
      const apiErr = err as { body?: { error?: string } }
      toast.error(apiErr?.body?.error || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    setName(client.name)
    setDescription(client.description ?? "")
    setLogoUri(client.logo_uri ?? "")
    setTokenLifetime(client.refresh_token?.token_lifetime ?? 0)
    setCallbacks(toLines(client.callbacks))
    setWebOrigins(toLines(client.web_origins))
    setAllowedOrigins(toLines(client.allowed_origins))
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
    <div className="space-y-6 p-6 pb-24">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="app-name">Name</Label>
            <div className="relative">
              <Input
                autoComplete="off"
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
              <Input
                autoComplete="off"
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
              <Input
                autoComplete="off"
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
            <p className="text-xs text-muted-foreground">Max character count is 512.</p>
          </div>

          {allowedTokenLifetimes && allowedTokenLifetimes.length >= 2 && (
            <div className="space-y-2">
              <Label htmlFor="token-lifetime">Maximum Refresh Token Lifetime</Label>
              <Input
                autoComplete="off"
                id="token-lifetime"
                value={tokenLifetime}
                onChange={(e) => setTokenLifetime(Number(e.target.value.replace(/\D/g, "")) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Value in seconds. Range: {allowedTokenLifetimes[0]} – {allowedTokenLifetimes[1]}.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Properties */}
      <Card>
        <CardHeader>
          <CardTitle>Application Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Application Ownership</Label>
            <Input
              value="Third-party"
              readOnly
              className="bg-muted text-muted-foreground cursor-default"
            />
          </div>

          <div className="space-y-2">
            <Label>Application Type</Label>
            <Input
              value={APP_TYPE_LABELS[client.app_type] ?? client.app_type}
              readOnly
              className="bg-muted text-muted-foreground cursor-default"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-logo">Application Logo URL</Label>
            <Input
              autoComplete="off"
              id="app-logo"
              value={logoUri}
              onChange={(e) => setLogoUri(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              Displayed in login pages and consent screens.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Application URIs */}
      <Card>
        <CardHeader>
          <CardTitle>Application URIs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="app-callbacks">Allowed Callback URLs</Label>
            <textarea
              id="app-callbacks"
              value={callbacks}
              onChange={(e) => setCallbacks(e.target.value)}
              rows={3}
              placeholder="https://example.com/callback"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              After the user authenticates, Auth0 will only call back to these URLs. One per line or comma-separated.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-web-origins">Allowed Web Origins</Label>
            <textarea
              id="app-web-origins"
              value={webOrigins}
              onChange={(e) => setWebOrigins(e.target.value)}
              rows={3}
              placeholder="https://example.com"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Allowed origins for Cross-Origin Authentication, Device Flow, and web message response mode.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-allowed-origins">Allowed Origins (CORS)</Label>
            <textarea
              id="app-allowed-origins"
              value={allowedOrigins}
              onChange={(e) => setAllowedOrigins(e.target.value)}
              rows={3}
              placeholder="https://example.com"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Origins allowed to make CORS requests. One per line or comma-separated.
            </p>
          </div>
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
                  <Input
                    autoComplete="off"
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

      {/* Sticky unsaved changes bar */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-border bg-background shadow-[0_-4px_12px_rgba(0,0,0,0.1)] px-6 py-4">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <InfoIcon className="h-4 w-4" />
              You have unsaved changes
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleDiscard}>
                Discard
              </Button>
              <Button disabled={saving || !name.trim()} onClick={handleSave}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Leave page confirmation dialog */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
            <p className="text-sm text-muted-foreground">
              If you leave this page now, your unsaved changes will be lost.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingHref(null)}>
              Stay &amp; Review
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave}>
              Leave &amp; Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
