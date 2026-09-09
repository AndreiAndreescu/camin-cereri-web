import { NextResponse } from "next/server";

// Sectiunea Vega Constanta (Salon Beauty + Restaurant) e complet separata de
// Camin Romantic - alte 2 roluri, care nu au NICIO legatura cu admin /
// administrator_centru. Un cont Camin Romantic nu trece niciodata de
// requireVegaUser, si un cont Vega nu trece niciodata de requireRole(...,
// ["admin", ...]) din lib/auth.js, pentru ca listele de roluri sunt separate.
export const VEGA_ROLES = ["vega_admin", "vega_manager"];

// vega_admin vede/gestioneaza orice locatie (Salon Beauty SI Restaurant).
// vega_manager e legat de una sau mai multe locatii - stocate in acelasi loc
// din sesiune ca la administrator_centru (user.center_ids), dar populate din
// vega_user_locations, nu din user_centers.
// super_admin vede/gestioneaza AMBELE sectiuni (Camin Romantic SI Vega
// Constanta), deci trece automat orice verificare de-aici, la fel ca un
// vega_admin.
export function canAccessVegaLocation(user, locationId) {
  if (user.role === "vega_admin" || user.role === "super_admin") return true;
  if (user.role === "vega_manager") return (user.center_ids || []).includes(Number(locationId));
  return false;
}

export function requireVegaUser(user) {
  if (!user || !(VEGA_ROLES.includes(user.role) || user.role === "super_admin")) {
    return NextResponse.json({ error: "Nu ai voie sa faci aceasta actiune." }, { status: 403 });
  }
  return null;
}

export function requireVegaAdmin(user) {
  if (!user || !(user.role === "vega_admin" || user.role === "super_admin")) {
    return NextResponse.json({ error: "Nu ai voie sa faci aceasta actiune." }, { status: 403 });
  }
  return null;
}
