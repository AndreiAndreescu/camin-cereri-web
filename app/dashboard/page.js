import { redirect } from "next/navigation";
import { getSessionUser } from "../../lib/auth";
import Dashboard from "./Dashboard";
import VegaDashboard from "./VegaDashboard";

export const dynamic = "force-dynamic";

// Cele doua sectiuni (Camin Romantic si Vega Constanta) sunt complet
// separate - randam o componenta total diferita in functie de rol, ca sa nu
// existe niciun risc ca datele uneia sa ajunga in codul/interfata celeilalte.
export default function DashboardPage() {
  const user = getSessionUser();
  if (!user) redirect("/login");

  if (user.role === "vega_admin" || user.role === "vega_manager") {
    return <VegaDashboard user={user} />;
  }

  return <Dashboard user={user} />;
}
