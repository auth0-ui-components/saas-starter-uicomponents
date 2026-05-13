"use client"

import { useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  IdpKnownResponse,
  SsoProviderTable,
} from "@auth0/universal-components-react"

export default function SSO() {
  const router = useRouter()
  const handleCreate = useCallback((): void => {
    router.push("/dashboard/organization/sso/create/")
  }, [])

  const handleEdit = useCallback((provider: IdpKnownResponse): void => {
    router.push(`/dashboard/organization/sso/edit/${provider.id}`)
  }, [])

  const createAction = useMemo(
    () => ({
      onAfter: handleCreate,
      disabled: false,
    }),
    [handleCreate]
  )

  const editAction = useMemo(
    () => ({
      onAfter: handleEdit,
      disabled: false,
    }),
    [handleEdit]
  )
  return (
    <div className="space-y-2 p-6">
      <SsoProviderTable
        createAction={createAction}
        editAction={editAction}
      />
    </div>
  )
}