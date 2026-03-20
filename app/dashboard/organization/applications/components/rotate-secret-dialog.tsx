"use client"
import { useState } from "react"
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react"
import { toast } from "sonner"
import { clientsApi } from "@/lib/my-org-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface RotateSecretDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  onSuccess: () => void
}

export function RotateSecretDialog({
  open,
  onOpenChange,
  clientId,
  onSuccess,
}: RotateSecretDialogProps) {
  const [confirmText, setConfirmText] = useState("")
  const [loading, setLoading] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleRotate() {
    if (confirmText !== "ROTATE") return

    setLoading(true)
    try {
      const result = await clientsApi.rotateSecret(clientId)
      setNewSecret(result.client_secret)
    } catch {
      toast.error("Failed to rotate secret")
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  async function copySecret() {
    if (!newSecret) return
    await navigator.clipboard.writeText(newSecret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    if (!newSecret) {
      onOpenChange(false)
      setConfirmText("")
    }
  }

  function handleDone() {
    onOpenChange(false)
    setConfirmText("")
    setNewSecret(null)
    setShowSecret(false)
    onSuccess()
  }

  if (newSecret) {
    return (
      <Dialog open={open} onOpenChange={handleDone}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Client Secret</DialogTitle>
            <DialogDescription>
              Save your new secret now. You won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-900">
                This is the only time your secret will be visible. Store it securely.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-secret">Client Secret</Label>
              <div className="relative flex items-center">
                <Input
                  autoComplete="off"
                  id="new-secret"
                  type={showSecret ? "text" : "password"}
                  value={newSecret}
                  readOnly
                  className="pr-20 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-10 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSecret ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={copySecret}
                  className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? (
                    <CheckIcon className="h-4 w-4 text-green-600" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleDone}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Rotate Client Secret</DialogTitle>
          <DialogDescription>
            A new secret will be generated. Your old secret will stop working immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-900">
              This action cannot be undone. Any applications using the old secret will stop working.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rotate-confirm">
              Type <strong>ROTATE</strong> to confirm
            </Label>
            <Input
              autoComplete="off"
              id="rotate-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type ROTATE..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setConfirmText("")
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRotate}
            disabled={confirmText !== "ROTATE" || loading}
            className="bg-[#C32F26] text-white hover:bg-[#9C261E]"
          >
            {loading ? "Rotating..." : "Rotate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
