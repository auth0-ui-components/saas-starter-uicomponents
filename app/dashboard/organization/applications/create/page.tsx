import { getDefaultProfile } from "@/lib/app-profile"
import { CreateClientForm } from "../components/create-client-form"

export default function CreateApplicationPage() {
  const profile = getDefaultProfile()
  return <CreateClientForm allowedAppTypes={profile.app_type.allowed_values} />
}
