/**
 * Typed fetch client for the My Org proxy API.
 * To swap to the real My Org API when it ships: change BASE to the real URL.
 */

import type {
  ApiClient,
  ApiClientWithSecret,
  ClientCredential,
  ClientGrant,
  ConfigApi,
  CreateClientRequest,
  CreateCredentialRequest,
  CreateGrantRequest,
  PatchClientRequest,
  PatchGrantRequest,
} from "@/types/applications"

const BASE = "/api/my-org"

async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body?.error || `HTTP ${res.status}`) as Error & { status: number; body: unknown }
    err.status = res.status
    err.body = body
    throw err
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Config
export const configApi = {
  getApis: (): Promise<{ apis: ConfigApi[] }> =>
    apiFetch("/config/apis"),
}

// Clients
export const clientsApi = {
  list: (): Promise<{ clients: ApiClient[]; next?: string }> =>
    apiFetch("/clients"),

  create: (body: CreateClientRequest): Promise<ApiClientWithSecret> =>
    apiFetch("/clients", { method: "POST", body: JSON.stringify(body) }),

  get: (clientId: string): Promise<ApiClient> =>
    apiFetch(`/clients/${clientId}`),

  patch: (clientId: string, body: PatchClientRequest): Promise<ApiClient> =>
    apiFetch(`/clients/${clientId}`, { method: "PATCH", body: JSON.stringify(body) }),

  delete: (clientId: string): Promise<void> =>
    apiFetch(`/clients/${clientId}`, { method: "DELETE" }),

  rotateSecret: (clientId: string): Promise<{ client_secret: string }> =>
    apiFetch(`/clients/${clientId}/rotate-secret`, { method: "POST" }),
}

// Client Credentials
export const credentialsApi = {
  list: (clientId: string): Promise<{ credentials: ClientCredential[] }> =>
    apiFetch(`/clients/${clientId}/credentials`),

  create: (clientId: string, body: CreateCredentialRequest): Promise<ClientCredential> =>
    apiFetch(`/clients/${clientId}/credentials`, { method: "POST", body: JSON.stringify(body) }),

  get: (clientId: string, credentialId: string): Promise<ClientCredential> =>
    apiFetch(`/clients/${clientId}/credentials/${credentialId}`),

  patch: (clientId: string, credentialId: string, body: { name?: string }): Promise<ClientCredential> =>
    apiFetch(`/clients/${clientId}/credentials/${credentialId}`, { method: "PATCH", body: JSON.stringify(body) }),

  delete: (clientId: string, credentialId: string): Promise<void> =>
    apiFetch(`/clients/${clientId}/credentials/${credentialId}`, { method: "DELETE" }),
}

// Client Grants
export const grantsApi = {
  list: (params?: { client_id?: string; audience?: string }): Promise<{ grants: ClientGrant[]; next?: string }> => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : ""
    return apiFetch(`/client-grants${qs}`)
  },

  create: (body: CreateGrantRequest): Promise<ClientGrant> =>
    apiFetch("/client-grants", { method: "POST", body: JSON.stringify(body) }),

  get: (grantId: string): Promise<ClientGrant> =>
    apiFetch(`/client-grants/${grantId}`),

  patch: (grantId: string, clientId: string, body: PatchGrantRequest): Promise<ClientGrant> =>
    apiFetch(`/client-grants/${grantId}`, { method: "PATCH", body: JSON.stringify({ ...body, client_id: clientId }) }),

}
