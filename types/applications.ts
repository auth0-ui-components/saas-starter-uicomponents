export enum AppType {
  NonInteractive = "non_interactive",
  Web = "regular_web",
  SPA = "spa",
  Native = "native",
}

export enum TokenEndpointAuthMethod {
  None = "none",
  ClientSecretPost = "client_secret_post",
  ClientSecretBasic = "client_secret_basic",
  PrivateKeyJWT = "private_key_jwt",
}

export enum SigningAlgorithm {
  RS256 = "RS256",
  RS384 = "RS384",
  RS512 = "RS512",
  ES256 = "ES256",
  ES384 = "ES384",
  ES512 = "ES512",
  PS256 = "PS256",
  PS384 = "PS384",
  PS512 = "PS512",
}

export enum SubjectType {
  User = "user",
  Client = "client",
}

export enum CredentialType {
  PublicKey = "public_key",
  Cert = "cert",
}

export interface ApiClient {
  client_id: string
  name: string
  description?: string
  app_type: AppType
  token_endpoint_auth_method?: TokenEndpointAuthMethod
  grant_types?: string[]
  callbacks?: string[]
  allowed_logout_urls?: string[]
  web_origins?: string[]
  allowed_origins?: string[]
  initiate_login_uri?: string
  organization_usage?: "deny" | "allow" | "require"
  organization_require_behavior?: "no_prompt" | "pre_login_prompt"
  mobile?: {
    android?: { app_package_name?: string; sha256_cert_fingerprints?: string[] }
    ios?: { team_id?: string; app_bundle_identifier?: string }
  }
  jwt_configuration?: {
    alg?: string
    lifetime_in_seconds?: number
    secret_encoded?: boolean
  }
  created_at: string
  updated_at?: string
}

export interface ApiClientWithSecret extends ApiClient {
  client_secret: string
}

export interface ClientCredential {
  id: string
  name?: string
  credential_type: CredentialType
  pem?: string
  algorithm?: SigningAlgorithm
  thumbprint_sha256?: string
  created_at: string
  updated_at?: string
  expires_at?: string
}

export interface ClientGrant {
  id: string
  client_id: string
  audience: string
  subject_type?: SubjectType
  scope: string[]
  created_at: string
  updated_at?: string
}

export interface ConfigApi {
  identifier: string
  name: string
  description?: string
  allowed_subject_types: ("user" | "client")[]
  scopes: { value: string; description: string }[]
}

// Request types
export interface CreateM2MClientRequest {
  name: string
  description?: string
  app_type: AppType.NonInteractive
  token_endpoint_auth_method?: TokenEndpointAuthMethod.ClientSecretPost | TokenEndpointAuthMethod.ClientSecretBasic | TokenEndpointAuthMethod.PrivateKeyJWT
}

export interface CreateInteractiveClientRequest {
  name: string
  description?: string
  app_type: AppType.Web | AppType.SPA | AppType.Native
  token_endpoint_auth_method?: TokenEndpointAuthMethod
  callbacks?: string[]
  allowed_logout_urls?: string[]
  web_origins?: string[]
  allowed_origins?: string[]
  initiate_login_uri?: string
  mobile?: ApiClient["mobile"]
}

export type CreateClientRequest = CreateM2MClientRequest | CreateInteractiveClientRequest

export interface PatchClientRequest {
  name?: string
  description?: string | null
  token_endpoint_auth_method?: TokenEndpointAuthMethod
}

export interface CreateCredentialRequest {
  name?: string
  credential_type: CredentialType
  pem: string
  algorithm?: SigningAlgorithm
  expires_at?: string
}

export interface CreateGrantRequest {
  client_id: string
  audience: string
  subject_type?: SubjectType
  scope: string[]
}

export interface PatchGrantRequest {
  scope?: string[]
  subject_type?: SubjectType
}
