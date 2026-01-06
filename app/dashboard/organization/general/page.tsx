"use client"

import { OrganizationDetailsEdit } from "@auth0/universal-components-react/rwa"

import { PageHeader } from "@/components/page-header"

export default function GeneralSettings() {
  return (
    <div className="space-y-2">
      <PageHeader
        title="General Settings"
        description="Update your organization's general settings."
      />

      <OrganizationDetailsEdit hideHeader={true} />
    </div>
  )
}
