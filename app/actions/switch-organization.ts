"use server"

import { redirect } from "next/navigation"

export async function switchOrganizationAction(organizationId: string) {
  redirect(`/auth/login?organization=${organizationId}&returnTo=/dashboard`)
}
