import { redirect } from "next/navigation";
import { getSessionUser } from "../../lib/auth";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const user = getSessionUser();
  if (!user) redirect("/login");

  return <Dashboard user={user} />;
}
