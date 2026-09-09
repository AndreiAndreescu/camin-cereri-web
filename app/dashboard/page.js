import { redirect } from "next/navigation";
import { getSessionUser } from "../../lib/auth";
import Dashboard from "./Dashboard";
import VegaDashboard from "./VegaDashboard";
import SectionChooser from "./SectionChooser";

export const dynamic = "force-dynamic";

// Cele doua sectiuni (Camin Romantic si Vega Constanta) sunt complet
// separate - randam o componenta total diferita in functie de rol, ca sa nu
// existe niciun risc ca datele uneia sa ajunga in codul/interfata celeilalte.
//
// Singura exceptie e contul "super_admin", care vede AMBELE sectiuni: la
// prima intrare alege una din ele (SectionChooser), iar dupa aceea poate
// trece oricand intre ele printr-un buton mereu vizibil in meniul de sus
// (canSwitchSection) - alegerea e tinuta in query param-ul ?section=, citit
// aici, server-side.
export default function DashboardPage({ searchParams }) {
  const user = getSessionUser();
  if (!user) redirect("/login");

  if (user.role === "super_admin") {
    const section = searchParams?.section;
    if (section === "vega") {
      return <VegaDashboard user={user} canSwitchSection />;
    }
    if (section === "camin") {
      return <Dashboard user={user} canSwitchSection />;
    }
    return <SectionChooser user={user} />;
  }

  if (user.role === "vega_admin" || user.role === "vega_manager") {
    return <VegaDashboard user={user} />;
  }

  return <Dashboard user={user} />;
}
