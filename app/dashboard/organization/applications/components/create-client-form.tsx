"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { clientsApi } from "@/lib/my-org-api"
import {
  AppType,
  type ApiClientWithSecret,
  type CreateInteractiveClientRequest,
} from "@/types/applications"
import { AppBreadcrumb } from "@/components/app-breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"


const APP_TYPES = [
  {
    type: AppType.Native,
    label: "Native",
    description:
      "Mobile, desktop, CLI and smart device apps running natively. e.g.: iOS, Electron, Apple TV apps",
  },
  {
    type: AppType.SPA,
    label: "Single Page Web Application",
    description:
      "A JavaScript front-end app that uses an API. e.g.: Angular, React, Vue",
  },
  {
    type: AppType.Web,
    label: "Regular Web Application",
    description:
      "Traditional web app using redirects. e.g.: Node.js Express, ASP.NET, Java, PHP",
  },
]

export function CreateClientForm() {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<AppType | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [callbacks, setCallbacks] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !selectedType) return

    setLoading(true)
    try {
      const callbackList = callbacks
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)

      const createReq: CreateInteractiveClientRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        app_type: selectedType,
        callbacks: callbackList.length ? callbackList : undefined,
      }

      const created: ApiClientWithSecret = await clientsApi.create(createReq)
      router.push(
        `/dashboard/organization/applications/${created.client_id}/settings`
      )
    } catch (err: unknown) {
      const apiErr = err as { body?: { error?: string } }
      toast.error(apiErr?.body?.error || "Failed to create application")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="px-2 py-3">
        <AppBreadcrumb
          title="Back to Applications"
          href="/dashboard/organization/applications"
        />
      </div>

      <div className="space-y-6">
        <div className="px-6 space-y-1">
          <h2 className="text-2xl font-semibold">Create Application</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 space-y-6">
          {/* App type tiles */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Choose an application type
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {APP_TYPES.map((appTypeOption) => (
                <button
                  key={appTypeOption.type}
                  type="button"
                  onClick={() => setSelectedType(appTypeOption.type)}
                  className={`rounded-md border p-4 text-left text-sm transition-colors ${
                    selectedType === appTypeOption.type
                      ? "border-primary ring-1 ring-primary bg-primary/10 font-medium"
                      : "border-gray-300 bg-background hover:bg-muted/30"
                  }`}
                >
                  <p className="font-semibold text-sm leading-tight mb-1.5">
                    {appTypeOption.label}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {appTypeOption.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Application Details card */}
          {selectedType && (
            <Card>
              <CardHeader>
                <CardTitle>Application Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="app-name">Name</Label>
                  <Input
                    autoComplete="off"
                    id="app-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Application"
                    maxLength={128}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="app-description">Description (optional)</Label>
                  <Input
                    autoComplete="off"
                    id="app-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={512}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="app-callbacks">
                    Callback URLs (one per line, optional)
                  </Label>
                  <textarea
                    id="app-callbacks"
                    value={callbacks}
                    onChange={(e) => setCallbacks(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!name.trim() || loading}
                  >
                    {loading ? "Creating..." : "Create Application"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </div>
  )
}
