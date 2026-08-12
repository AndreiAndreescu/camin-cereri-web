import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "./session";

// Doar 2 roluri au cont in aplicatie:
// - admin: creeaza, accepta/respinge si confirma (marcheaza rezolvat) cereri
// - administrator_centru: creeaza cereri, doar pentru centrul propriu
export const ROLES_CU_DECIZIE = ["admin"];
export const ROLES_CU_CREARE = ["admin", "administrator_centru"];

// Citeste userul din cookie-ul de sesiune (semnat, httpOnly). Functioneaza
// atat in Server Components cat si in Route Handlers.
export function getSessionUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

// Helper pentru rutele API: intoarce fie userul, fie un raspuns 401 gata de
// returnat (ca sa oprim executia rutei cu "return error" daca nu e logat).
export function requireUser() {
  const user = getSessionUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Neautentificat." }, { status: 401 }) };
  }
  return { user, error: null };
}

export function requireRole(user, roles) {
  if (!roles.includes(user.role)) {
    return NextResponse.json({ error: "Nu ai voie sa faci aceasta actiune." }, { status: 403 });
  }
  return null;
}
