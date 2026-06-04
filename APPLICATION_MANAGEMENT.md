# Application Management Setup Guide

This guide walks you through enabling the Application Management feature in your SaaStart deployment. This feature adds a full developer portal experience where your external developers and partners can self-service create OAuth2 clients, manage credentials (client secret rotation, private key JWT keys), and configure API access grants — all scoped to their organization.

### Problems We're Solving

**Fragmented Access Control — Security and Compliance Gaps**
Siloed identity management for users, developers, and partners makes auditing, monitoring, and policy enforcement inconsistent across your platform.

**DIY Partner Identity Workarounds — Inefficient, Insecure, Unscalable**
Organizations resort to brittle, stitched-together auth flows using non-identity systems like Apigee, or manually issuing credentials via email, SFTP, or internal tools.

**API Adoption Bottleneck**
Without a platform to provision external developers and partners with scoped API access, organizations can't scale API integrations, reuse workflows, or grow their ecosystem.

**Lost Identity Intelligence**
When identity data lives in disconnected systems, risk signals and insights are weakened — making it harder to detect threats and enforce adaptive policies.

### Architecture

- **Organization-scoped**: All applications are third-party clients tagged with `client_metadata.org_id` — each org can only see and manage its own apps
- **Profile-driven configuration**: `config/app-profiles.json` controls allowed app types, token lifetimes, refresh token policies, and which APIs/scopes are available to developers

## Prerequisites

- A working SaaStart deployment (bootstrap script already run)
- Auth0 tenant with Management API access
- At least one Resource Server (API) configured in your Auth0 tenant

## Step 1: Run the Bootstrap Script

If you haven't already, run the bootstrap script to configure your tenant. The script now includes the Application Management scopes automatically:

```bash
node scripts/bootstrap.mjs <your-tenant-domain>
```

If you've already bootstrapped, you'll need to manually add the following scopes to your Management API client grant (the M2M app that the portal uses):

```
read:clients
create:clients
update:clients
delete:clients
read:client_keys
update:client_keys
read:client_credentials
create:client_credentials
update:client_credentials
delete:client_credentials
read:client_grants
create:client_grants
update:client_grants
delete:client_grants
read:resource_servers
```

You can do this in the Auth0 Dashboard under Applications > APIs > Auth0 Management API > Machine to Machine Applications > [your M2M app] > permissions.

## Step 2: Configure App Profiles

Edit `config/app-profiles.json` to define what third-party applications can do in your tenant.

### Profile Structure

```json
{
  "profiles": [
    {
      "client_profile_id": "cpr_YourUniqueId",
      "name": "Third Party Applications",
      "description": "System profile for all dynamically created third-party applications",
      "profile_type": "system",
      "is_first_party": {
        "default": false
      },
      "app_type": {
        "default": "regular_web",
        "allowed_values": ["native", "regular_web", "spa"]
      },
      "client_configuration": {
        "oidc_conformant": true,
        "grant_types": ["authorization_code", "refresh_token"],
        "refresh_token": {
          "rotation_type": "rotating",
          "expiration_type": "expiring",
          "token_lifetime": {
            "default": 2592000,
            "allowed_values": [2000000, 10000000]
          },
          "idle_token_lifetime": 1296000,
          "leeway": 0
        },
        "require_proof_of_possession": false
      },
      "client_grant_configuration": {
        "resource_servers": []
      }
    }
  ]
}
```

### Key Configuration Options

#### `app_type`

Controls which application types developers can create:

| Value | Description |
|-------|-------------|
| `native` | Mobile, desktop, CLI apps (iOS, Electron, etc.) |
| `regular_web` | Traditional web apps with server-side rendering (Node.js, PHP, etc.) |
| `spa` | Single Page Applications (React, Angular, Vue) |

Set `allowed_values` to the subset you want to offer. The `default` is used when no type is specified.

#### `client_configuration`

Properties applied to every client created through the portal:

- `oidc_conformant` — Must be `true` when refresh token rotation is enabled
- `grant_types` — Must include `"refresh_token"` when rotation is enabled
- `refresh_token.token_lifetime` — Can be a fixed number (rigid) or `{ "default": N, "allowed_values": [min, max] }` (configurable range shown to developers in the settings page)
- `require_proof_of_possession` — Set to `true` to require DPoP tokens

#### `client_grant_configuration.resource_servers`

This is where you configure which APIs are available to third-party applications and what scopes they can access.

```json
"resource_servers": [
  {
    "identifier": "https://api.yourcompany.com/",
    "allow_offline_access": false,
    "subject_type": "user",
    "scopes": ["read:data", "write:data"]
  }
]
```

| Field | Description |
|-------|-------------|
| `identifier` | The audience/identifier of your Auth0 Resource Server |
| `allow_offline_access` | Whether refresh tokens are allowed for this API |
| `subject_type` | `"user"` for user-delegated access, `"client"` for machine-to-machine |
| `scopes` | The maximum set of scopes developers can grant. Omit to allow all scopes defined on the resource server. Empty array `[]` means no scopes allowed. |

When a developer creates an application, client grants are automatically created for all configured resource servers with the specified scopes. Developers can then reduce (but not expand) scopes from the APIs tab.

## Step 3: Environment Variables

Add to your `.env.local`:

```bash
# Required (should already exist from bootstrap)
NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_MANAGEMENT_API_DOMAIN=your-tenant.us.auth0.com
AUTH0_MANAGEMENT_CLIENT_ID=your_m2m_client_id
AUTH0_MANAGEMENT_CLIENT_SECRET=your_m2m_client_secret

# Optional: Custom audience for the My Org API
# If not set, defaults to https://${NEXT_PUBLIC_AUTH0_DOMAIN}/my-org/
NEXT_PUBLIC_AUTH0_AUDIENCE=https://your-custom-domain/my-org/
```

## Step 4: Verify Setup

1. Start the dev server: `npm run dev`
2. Log in as an organization member
3. Navigate to Dashboard > Applications
4. Create a test application
5. Verify:
   - Application is created with the correct app type
   - APIs tab shows your configured resource servers as authorized
   - Settings page shows all fields (name, description, URIs, token lifetime)
   - Credentials tab allows secret rotation and PKJ key management

## How It Works

### Architecture

```
Developer Portal UI (Next.js client components)
  -> Next.js Route Handlers at /api/my-org/**
    -> Auth0 Management API
```

### Organization Scoping

Applications are tagged with `client_metadata.org_id` on creation. All API routes filter by this metadata to ensure organization isolation — developers can only see and manage their own organization's applications.

### Feature Overview

| Feature | Description |
|---------|-------------|
| Create Application | Choose app type, set name/description |
| Settings | Edit name, description, logo, callback URLs, web origins, CORS origins, token lifetime |
| Credentials | View client ID, rotate client secret, upload PKJ public keys |
| API Access | View authorized APIs, edit scopes, revoke access |
| Delete | Remove application (blocked if active grants exist) |

## Troubleshooting

### "Unauthorized" errors when creating/managing apps

Your Management API M2M app is missing required scopes. See Step 1 above.

### APIs tab shows "No APIs are configured"

You haven't added any `resource_servers` to `config/app-profiles.json`. Add at least one resource server with its identifier matching an API in your Auth0 tenant.

### APIs tab shows "No matching APIs were found"

The `identifier` values in your profile don't match any resource servers in your Auth0 tenant. Verify the identifiers match exactly (including trailing slashes).

### "Payload validation error" when creating apps

Check that your `client_configuration` in the profile is valid:
- `expiration_type` must be `"expiring"` when `rotation_type` is `"rotating"`
- `grant_types` must include `"refresh_token"` when rotation is enabled
- `oidc_conformant` must be `true` when rotation is enabled

### Token lifetime validation fails

The developer entered a value outside the `allowed_values` range. The range is enforced client-side with a clear error message.
