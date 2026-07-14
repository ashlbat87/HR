// Employee Import — HR Admin only. Renders the CSV wizard client component.
import { getCurrentUser } from "@/core/auth";
import { isHRAdmin } from "@/core/access";
import { redirect } from "next/navigation";
import { ImportWizard } from "./ImportWizard";

export default async function ImportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (!isHRAdmin(user)) redirect("/reviews");
  return (
    <div>
      <h1>Employee Import</h1>
      <p className="muted">
        Upload a Zoho CSV. We validate and preview before importing anything.
        Fictional data only.
      </p>
      <ImportWizard />
    </div>
  );
}
