import { redirect } from "next/navigation"

import { appClient } from "@/lib/auth0"

/**
 * Post-Authentication Router
 * 
 * Routes users after Auth0 authentication based on their email verification status
 */
export default async function PostAuthRouter() {
  const session = await appClient.getSession()
  
  const dashboardParams = new URLSearchParams({
    returnTo: "/dashboard",
  })
  
  const redirectUrl = session?.user?.email_verified
    ? `/auth/login?${dashboardParams.toString()}`
    : "/onboarding/verify"

  redirect(redirectUrl)
}
