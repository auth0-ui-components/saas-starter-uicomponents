"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Trash2Icon, PlusIcon, CheckIcon, CopyIcon, EyeIcon, EyeOffIcon, ChevronDownIcon, ExternalLinkIcon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"

import { clientsApi, credentialsApi } from "@/lib/my-org-api"
import { TokenEndpointAuthMethod } from "@/types/applications"
import type { ApiClient, ClientCredential } from "@/types/applications"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { RotateSecretDialog } from "./rotate-secret-dialog"
import { UploadCredentialDialog } from "./upload-credential-dialog"

const AUTH_METHOD_TILES = [
  { value: TokenEndpointAuthMethod.PrivateKeyJWT, label: "Private Key JWT" },
  { value: TokenEndpointAuthMethod.ClientSecretPost, label: "Client Secret (Post)" },
]

const ADDON_TILES = [
  { label: "mTLS (CA-signed)" },
  { label: "mTLS (self-signed)" },
]

interface ClientCredentialsProps {
  client: ApiClient
  credentials: ClientCredential[]
  clientSecret?: string
}

export function ClientCredentials({
  client,
  credentials: initialCreds,
  clientSecret,
}: ClientCredentialsProps) {
  const router = useRouter()
  const [credentials, setCredentials] = useState(initialCreds)
  const [secretVisible, setSecretVisible] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  async function copyToClipboard(value: string, field: string) {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const currentMethod: TokenEndpointAuthMethod =
    (client as unknown as Record<string, unknown>).client_authentication_methods
      ? TokenEndpointAuthMethod.PrivateKeyJWT
      : (client.token_endpoint_auth_method as TokenEndpointAuthMethod) ?? TokenEndpointAuthMethod.ClientSecretPost
  const [selectedMethod, setSelectedMethod] = useState<TokenEndpointAuthMethod>(currentMethod)
  const [saving, setSaving] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [pendingPKJActivation, setPendingPKJActivation] = useState(false)
  const [pkjModalOpen, setPkjModalOpen] = useState(false)
  const [rotateOpen, setRotateOpen] = useState(false)
  const [algDialogOpen, setAlgDialogOpen] = useState(false)
  const pkjCompatibleAlgs = ["RS256", "RS384", "RS512", "PS256", "PS384", "PS512"]
  const isAlgIncompatible = !pkjCompatibleAlgs.includes(client.jwt_configuration?.alg ?? "")
  const [assignSource, setAssignSource] = useState<"existing" | "new">("existing")
  const [assignCredentialId, setAssignCredentialId] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  // After router.refresh() delivers new props, sync selectedMethod and clear justSaved
  useEffect(() => {
    setSelectedMethod(currentMethod)
    setJustSaved(false)
  }, [currentMethod])

  const isDirty = selectedMethod !== currentMethod
  const hasSecret =
    selectedMethod === TokenEndpointAuthMethod.ClientSecretPost ||
    selectedMethod === TokenEndpointAuthMethod.ClientSecretBasic

  async function handleSaveMethod(methodOverride?: TokenEndpointAuthMethod) {
    const method = methodOverride ?? selectedMethod
    setSaving(true)
    setJustSaved(true)
    try {
      await clientsApi.patch(client.client_id, {
        token_endpoint_auth_method: method as unknown as TokenEndpointAuthMethod,
      })
      toast.success("Authentication method updated")
      router.refresh()
    } catch (err: unknown) {
      const apiErr = err as { body?: { error?: string } }
      toast.error(apiErr?.body?.error || "Failed to update authentication method")
    } finally {
      setSaving(false)
    }
  }


  async function handleDeleteCredential(credentialId: string) {
    if (credentials.length === 1) {
      toast.warning("Deleting the last credential will break authentication for this client.")
    }
    try {
      await credentialsApi.delete(client.client_id, credentialId)
      setCredentials((prev) => prev.filter((c) => c.id !== credentialId))
      toast.success("Credential deleted")
      router.refresh()
    } catch {
      toast.error("Failed to delete credential")
    }
  }


  async function handleCredentialAdded(cred: ClientCredential) {
    setCredentials((prev) => [...prev, cred])
    setUploadOpen(false)
    toast.success("Credential added")
    if (pendingPKJActivation) {
      setPendingPKJActivation(false)
      await handleSaveMethod(TokenEndpointAuthMethod.PrivateKeyJWT)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Application Authentication */}
      <Card>
        <CardHeader>
          <CardTitle>Application Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

        <div className="space-y-3">
          <p className="text-sm font-medium">Authentication Method</p>

          {/* Add-on tiles (disabled) */}
          <div className="grid grid-cols-2 gap-2">
            {ADDON_TILES.map((m) => (
              <div
                key={m.label}
                className="rounded-md border border-gray-300 bg-background p-3 opacity-40 cursor-not-allowed space-y-1"
              >
                <p className="text-sm font-medium">{m.label}</p>
                <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Add-On
                </span>
              </div>
            ))}
          </div>

          {/* Selectable tiles */}
          <div className="grid grid-cols-2 gap-2">
            {AUTH_METHOD_TILES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  if (m.value === TokenEndpointAuthMethod.PrivateKeyJWT && currentMethod !== TokenEndpointAuthMethod.PrivateKeyJWT) {
                    if (isAlgIncompatible) {
                      setAlgDialogOpen(true)
                    } else if (credentials.length > 0) {
                      setPkjModalOpen(true)
                    } else {
                      setPendingPKJActivation(true)
                      setUploadOpen(true)
                    }
                  } else {
                    setSelectedMethod(m.value)
                  }
                }}
                className={`rounded-md border p-3 text-left text-sm transition-colors ${
                  selectedMethod === m.value
                    ? "border-primary ring-1 ring-primary bg-primary/10 font-medium"
                    : "border-gray-300 bg-background hover:bg-muted/30"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Save / Cancel for non-PKJ method changes */}
          {isDirty && !saving && !justSaved && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" disabled={saving} onClick={() => void handleSaveMethod()}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedMethod(currentMethod)}>
                Cancel
              </Button>
            </div>
          )}

          {/* Client Secret (shown when secret method is current and no pending change) */}
          {hasSecret && !isDirty && (
            <div className="space-y-2 pt-1">
              <p className="text-sm font-medium">Client Secret</p>
              <div className="relative">
                <Input autoComplete="off"
                  type={secretVisible ? "text" : "password"}
                  value={clientSecret ?? ""}
                  readOnly
                  className="bg-muted font-mono text-sm text-muted-foreground cursor-default pr-20"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSecretVisible((v) => !v)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {secretVisible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                  {clientSecret && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(clientSecret, "secret")}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copiedField === "secret" ? <CheckIcon className="h-4 w-4 text-green-600" /> : <CopyIcon className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        </CardContent>
      </Card>

      {/* Credentials */}
      <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Credentials</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage credential assignment and rotation for your application.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Credential
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">

          <div className="overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-300 dark:border-gray-700 bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Credential</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Assigned To</th>
                  <th className="px-4 py-3 text-left font-medium">Expires At</th>
                  <th className="w-px py-3" />
                </tr>
              </thead>
              <tbody>
                {credentials.length === 0 ? (
                  <tr className="bg-background">
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      There are no items to display.
                    </td>
                  </tr>
                ) : (
                  credentials.map((cred) => (
                    <tr key={cred.id} className="border-b border-gray-300 dark:border-gray-700 last:border-0 bg-background">
                      <td className="px-4 py-3 font-medium">{cred.name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">
                        {cred.credential_type.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {"None"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {(cred as any).expires_at
                          ? new Date((cred as any).expires_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              timeZone: "UTC",
                            })
                          : "Never"}
                      </td>
                      <td className="w-px py-3 pr-4">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#C32F26]/15">
                              <Trash2Icon className="h-4 w-4 text-[#C32F26]" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Credential</AlertDialogTitle>
                              <AlertDialogDescription>
                                {credentials.length === 1
                                  ? "Warning: this is the last credential on this client. Deleting it will break authentication."
                                  : "Are you sure you want to delete this credential? This action cannot be undone."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-[#C32F26] text-white hover:bg-[#9C261E]"
                                onClick={() => handleDeleteCredential(cred.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground text-right">Limit of 2 credentials</p>

          <UploadCredentialDialog
            open={uploadOpen}
            onOpenChange={setUploadOpen}
            clientId={client.client_id}
            onSuccess={handleCredentialAdded}
          />
        </CardContent>
      </Card>

      {/* Danger Zone — rotate secret only */}
      {hasSecret && !isDirty && (
        <Card>
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Rotate secret</p>
                <p className="text-sm text-muted-foreground">
                  All authorized apps will need to be updated with the new client secret.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setRotateOpen(true)}>
                <RefreshCwIcon className="mr-2 h-4 w-4" />
                Rotate
              </Button>
              <RotateSecretDialog
                open={rotateOpen}
                onOpenChange={setRotateOpen}
                clientId={client.client_id}
                onSuccess={router.refresh}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Signing Algorithm dialog — only shown when app uses HS256 */}
      <Dialog open={algDialogOpen} onOpenChange={setAlgDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Signing Algorithm</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Your application&apos;s signing algorithm (HS256) is not compatible with Private Key
              JWT client authentication.
            </p>
            <p className="text-sm">Select a compatible signing algorithm to continue:</p>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">JSON Web Token (JWT) Signing Algorithm</p>
              <div className="relative">
                <select
                  disabled
                  className="w-full appearance-none rounded-md border bg-muted px-3 py-2 pr-8 text-sm text-muted-foreground cursor-not-allowed"
                >
                  <option>RS256</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <a
                href="https://auth0.com/docs/get-started/applications/signing-algorithms"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Learn more about signing algorithms
                <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlgDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setAlgDialogOpen(false)
                if (credentials.length > 0) {
                  setPkjModalOpen(true)
                } else {
                  setPendingPKJActivation(true)
                  setUploadOpen(true)
                }
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Credential modal */}
      <Dialog
        open={pkjModalOpen}
        onOpenChange={(open) => {
          setPkjModalOpen(open)
          if (open) {
            setAssignSource(credentials.length > 0 ? "existing" : "new")
            setAssignCredentialId(credentials[0]?.id ?? null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Credential</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-semibold">Source</p>
              <div className="flex flex-col gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input autoComplete="off"
                    type="radio"
                    name="assign-source"
                    checked={assignSource === "existing"}
                    onChange={() => setAssignSource("existing")}
                    className="accent-primary"
                  />
                  <span className="text-sm">Existing</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input autoComplete="off"
                    type="radio"
                    name="assign-source"
                    checked={assignSource === "new"}
                    onChange={() => setAssignSource("new")}
                    className="accent-primary"
                  />
                  <span className="text-sm">New</span>
                </label>
              </div>
            </div>

            {assignSource === "existing" && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Credential</p>
                {credentials.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No credentials available. Select New to create one.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {credentials.map((cred) => (
                      <label
                        key={cred.id}
                        className={`flex items-start gap-3 cursor-pointer rounded-lg border p-4 transition-colors ${
                          assignCredentialId === cred.id
                            ? "border-primary ring-1 ring-primary"
                            : "border-gray-300"
                        }`}
                      >
                        <input autoComplete="off"
                          type="radio"
                          name="assign-credential"
                          checked={assignCredentialId === cred.id}
                          onChange={() => setAssignCredentialId(cred.id)}
                          className="accent-primary mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium">{cred.name || "No name specified"}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            Key ID: {cred.thumbprint_sha256 ?? cred.id}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPkjModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setPkjModalOpen(false)
                if (assignSource === "new") {
                  setPendingPKJActivation(true)
                  setUploadOpen(true)
                } else {
                  await handleSaveMethod(TokenEndpointAuthMethod.PrivateKeyJWT)
                }
              }}
              disabled={saving || (assignSource === "existing" && credentials.length === 0)}
            >
              {saving ? "Saving…" : assignSource === "new" ? "Continue" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
