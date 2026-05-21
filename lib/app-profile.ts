import fs from "fs"
import path from "path"

export interface AppProfile {
  client_profile_id: string
  name: string
  description?: string
  profile_type: string
  is_first_party: { default: boolean }
  app_type: {
    default: string
    allowed_values: string[]
  }
  client_configuration: {
    oidc_conformant?: boolean
    grant_types?: string[]
    refresh_token?: {
      rotation_type?: string
      expiration_type?: string
      token_lifetime?: number | { default: number; allowed_values?: number[] }
      idle_token_lifetime?: number
      leeway?: number
    }
    require_proof_of_possession?: boolean
  }
  client_grant_configuration: {
    resource_servers: {
      id?: string
      identifier: string
      allow_offline_access?: boolean
      subject_type?: "user" | "client"
      scopes?: string[]
    }[]
  }
}

export function getDefaultProfile(): AppProfile {
  const filePath = path.join(process.cwd(), "config", "app-profiles.json")
  const raw = fs.readFileSync(filePath, "utf-8")
  const config = JSON.parse(raw) as { profiles: AppProfile[] }
  return config.profiles.find((p) => p.profile_type === "system") ?? config.profiles[0]
}
