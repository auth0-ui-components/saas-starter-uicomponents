"use client"

import { useState, useRef } from "react"
import { ChevronDownIcon } from "lucide-react"
import { toast } from "sonner"

import { credentialsApi } from "@/lib/my-org-api"
import { CredentialType, SigningAlgorithm } from "@/types/applications"
import type { ClientCredential } from "@/types/applications"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const ALGORITHMS = [SigningAlgorithm.RS256, SigningAlgorithm.RS384, SigningAlgorithm.PS256]

interface UploadCredentialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  onSuccess: (credential: ClientCredential) => void
}

export function UploadCredentialDialog({
  open,
  onOpenChange,
  clientId,
  onSuccess,
}: UploadCredentialDialogProps) {
  const [name, setName] = useState("")
  const [pem, setPem] = useState("")
  const [fileName, setFileName] = useState("")
  const [algorithm, setAlgorithm] = useState<SigningAlgorithm>(SigningAlgorithm.RS256)
  const [expiry, setExpiry] = useState<"never" | "cert" | "custom">("never")
  const [customDate, setCustomDate] = useState("")
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleClose() {
    onOpenChange(false)
    setName("")
    setPem("")
    setFileName("")
    if (fileRef.current) fileRef.current.value = ""
    setAlgorithm(SigningAlgorithm.RS256)
    setExpiry("never")
    setCustomDate("")
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const text = await file.text()
    setPem(text)
    if (expiry === "cert" && !text.includes("CERTIFICATE")) setExpiry("never")
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!pem) return
    setLoading(true)

    // Auto-detect credential type from PEM header
    const credType = pem.includes("CERTIFICATE")
      ? CredentialType.Cert
      : CredentialType.PublicKey

    // Compute expires_at:
    // "never"  → omit (no expiry)
    // "cert"   → omit (Auth0 reads notAfter from the X.509 certificate automatically)
    // "custom" → ISO string from the chosen date
    // Use local noon to avoid UTC midnight shifting the date back by a day
    // in timezones behind UTC (e.g. US/Pacific)
    const expires_at =
      expiry === "custom" && customDate
        ? new Date(customDate + "T12:00:00").toISOString()
        : undefined

    try {
      const cred = await credentialsApi.create(clientId, {
        credential_type: credType,
        pem,
        algorithm,
        name: name || undefined,
        ...(expires_at ? { expires_at } : {}),
      })
      onSuccess(cred)
      handleClose()
    } catch {
      toast.error("Failed to add credential")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(true) }}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-7">
          <DialogHeader>
            <DialogTitle>Add New Credential</DialogTitle>
          </DialogHeader>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Type</Label>
            <div className="relative">
              <select disabled className="w-full appearance-none rounded-md border bg-muted pl-3 pr-10 py-2 text-sm text-muted-foreground cursor-not-allowed">
                <option>Public Key</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Public keys can be assigned to{" "}
              <strong>Private Key JWT</strong> client authentication and{" "}
              <strong>JAR</strong>.
            </p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="cred-name" className="text-sm font-semibold">Name</Label>
            <Input autoComplete="off"
              id="cred-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional friendly name"
              maxLength={128}
            />
          </div>

          {/* Public Key file chooser */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Public Key <span className="text-[#C32F26]">*</span>
            </Label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 text-center hover:border-gray-400 hover:bg-muted/30 transition-colors cursor-pointer"
            >
              {fileName ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">{fileName}</p>
                  <p className="text-xs text-muted-foreground">Click to change file</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Click to choose a file</p>
                  <p className="text-xs text-muted-foreground">.pem, .crt, .cer, .key, .pub</p>
                </div>
              )}
            </button>
            <input autoComplete="off"
              ref={fileRef}
              type="file"
              accept=".pem,.crt,.cer,.key,.pub"
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-xs text-muted-foreground">
              Public key or X.509 certificate encoded in PEM format.
            </p>
          </div>

          {/* Algorithm */}
          <div className="space-y-2">
            <Label htmlFor="algorithm" className="text-sm font-semibold">Algorithm</Label>
            <div className="relative">
              <select
                id="algorithm"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as SigningAlgorithm)}
                className="w-full appearance-none rounded-md border bg-background pl-3 pr-10 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ALGORITHMS.map((alg) => (
                  <option key={alg} value={alg}>{alg}</option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Expiration Date */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Expiration Date</Label>
            <div className="flex flex-col gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input autoComplete="off"
                  type="radio"
                  name="expiry"
                  checked={expiry === "never"}
                  onChange={() => setExpiry("never")}
                  className="accent-primary"
                />
                <span className="text-sm">Never</span>
              </label>
              {pem.includes("CERTIFICATE") && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input autoComplete="off"
                    type="radio"
                    name="expiry"
                    checked={expiry === "cert"}
                    onChange={() => setExpiry("cert")}
                    className="accent-primary"
                  />
                  <span className="text-sm">Use date from certificate</span>
                </label>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input autoComplete="off"
                  type="radio"
                  name="expiry"
                  checked={expiry === "custom"}
                  onChange={() => setExpiry("custom")}
                  className="accent-primary"
                />
                <span className="text-sm">Set a custom date</span>
              </label>
              {expiry === "custom" && (
                <Input autoComplete="off"
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="ml-6 w-48"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!pem || (expiry === "custom" && !customDate) || loading}>
              {loading ? "Adding..." : "Add Credential"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
