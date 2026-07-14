// Landing route. Routes each role to their home, per the navigation map:
// HR/HR Admin -> HR Dashboard; everyone else -> My Reviews.
import { getCurrentUser } from "@/core/auth";
import { isHR } from "@/core/access";
import { redirect } from "next/navigation";

export default async function AppHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (isHR(user)) redirect("/dashboard");
  redirect("/reviews");
}
