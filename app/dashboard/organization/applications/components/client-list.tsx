"use client"
import { useRouter } from "next/navigation"
import { MoreHorizontalIcon, PlusIcon } from "lucide-react"
import type { ApiClient } from "@/types/applications"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const APP_TYPE_LABELS: Record<string, string> = {
  non_interactive: "Machine to Machine",
  regular_web: "Regular Web Application",
  spa: "Single Page Application",
  native: "Native",
}

interface ClientListProps {
  clients: ApiClient[]
}

export function ClientList({ clients }: ClientListProps) {
  const router = useRouter()

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-3xl font-semibold">Applications</h3>
        <p className="text-muted-foreground">Manage your API clients and their credentials.</p>
      </div>
      <div className="flex justify-end mb-10">
        <Button
          onClick={() => router.push("/dashboard/organization/applications/create")}
        >
          <PlusIcon className="mr-2 h-4 w-4" /> Create Application
        </Button>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          No applications yet. Create one to get started.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-300">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-300 bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Client ID</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.client_id}
                  className="border-b border-gray-300 last:border-0 hover:bg-muted/30 cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/dashboard/organization/applications/${client.client_id}/settings`
                    )
                  }
                >
                  <td className="px-4 py-3 font-medium">{client.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {APP_TYPE_LABELS[client.app_type] ?? client.app_type}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {client.client_id}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                        >
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/dashboard/organization/applications/${client.client_id}/settings`
                            )
                          }
                        >
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/dashboard/organization/applications/${client.client_id}/credentials`
                            )
                          }
                        >
                          Credentials
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/dashboard/organization/applications/${client.client_id}/apis`
                            )
                          }
                        >
                          APIs
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
