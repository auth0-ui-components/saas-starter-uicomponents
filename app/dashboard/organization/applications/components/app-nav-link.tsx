"use client"

import Link from "next/link"
import { useParams, useSelectedLayoutSegment } from "next/navigation"

import { cn } from "@/lib/utils"

export default function AppNavLink({
  slug,
  children,
}: {
  slug: string
  children: React.ReactNode
}) {
  const { client_id } = useParams<{ client_id: string }>()
  const segment = useSelectedLayoutSegment()
  const isActive = slug === segment

  return (
    <Link
      href={`/dashboard/organization/applications/${client_id}/${slug}`}
      className={cn(
        isActive
          ? "font-semibold text-primary underline underline-offset-12"
          : "font-normal text-muted-foreground transition-colors hover:text-foreground"
      )}
    >
      {children}
    </Link>
  )
}
