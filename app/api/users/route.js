import { NextResponse } from "next/server";
import { requireUser, requireRole } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Doar admin poate vedea/crea utilizatori - e panoul care ii permite sa
// adauge administratori de centru direct din browser, fara terminal.
//
// super_admin e un caz special: pe langa admin/administrator_centru, mai
// poate GESTIONA (crea/edita/sterge) si alte conturi super_admin - sa se
// editeze unul pe altul, sa adauge un super_admin nou sau sa promoveze pe
// cineva la super_admin. Asta e allowedRolesFor - foloseste-l doar pentru
// ce poate MODIFICA un actor.
function allowedRolesFor(actor) {
  return actor.role === "super_admin"
    ? ["admin", "administrator_centru", "super_admin"]
    : ["admin", "administrator_centru"];
}

// Un cont admin de la Camin Romantic nu trebuie sa vada NICIODATA conturile
// de la sectiunea separata Vega Constanta (vega_admin / vega_manager), nici
// macar ca existenta - de-aia interogarea de mai jos ramane limitata la
// rolurile Camin Romantic + super_admin, indiferent de actor.
//
// super_admin insa TREBUIE sa apara si in aceasta lista (cerinta: "sa apara
// pentru toata lumea"), doar ca pentru un admin obisnuit (nu super_admin) e
// AFISAT deghizat, ca un simplu "Admin" - fara sa dezvaluie ca respectivul
// cont are si control peste Vega Constanta. Doar contul super_admin insusi
// (sau alt super_admin) il vede cu rolul lui real si il poate edita/sterge -
// vezi can_manage mai jos, folosit de interfata sa ascunda butoanele
// Editează/Șterge pentru randurile pe care actorul nu are voie sa le atinga.
const VISIBLE_ROLES = ["admin", "administrator_centru", "super_admin"];

export async function GET() {
  const { user, error } = requireUser();
  if (error) return error;
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return roleError;

  const { data, error: dbError } = await supabaseAdmin()
    .from("profiles")
    .select("id, email, full_name, role, user_centers(center_id)")
    .in("role", VISIBLE_ROLES)
    .order("created_at", { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const canManageRoles = allowedRolesFor(user);

  const users = (data || []).map((u) => {
    const disguise = u.role === "super_admin" && user.role !== "super_admin";
    return {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: disguise ? "admin" : u.role,
      center_ids: (u.user_centers || []).map((c) => c.center_id),
      can_manage: canManageRoles.includes(u.role),
    };
  });

  return NextResponse.json({ users });
}

export async function POST(request) {
  const { user, error } = requireUser();
  if (error) return error;
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return roleError;

  const body = await request.json().catch(() => ({}));
  const { email, password, full_name, role } = body || {};
  const centerIds = Array.isArray(body.center_ids) ? body.center_ids.map(Number).filter(Boolean) : [];

  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: "Toate câmpurile sunt obligatorii." }, { status: 400 });
  }
  if (!allowedRolesFor(user).includes(role)) {
    return NextResponse.json({ error: "Rol invalid." }, { status: 400 });
  }
  if (role === "administrator_centru" && centerIds.length === 0) {
    return NextResponse.json(
      { error: "Cel puțin un centru este obligatoriu pentru administrator de centru." },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Parola trebuie să aibă cel puțin 6 caractere." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .insert({
      id: created.user.id,
      email,
      full_name,
      role,
    })
    .select("id, email, full_name, role")
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (role === "administrator_centru" && centerIds.length > 0) {
    const { error: linkError } = await db
      .from("user_centers")
      .insert(centerIds.map((center_id) => ({ user_id: profile.id, center_id })));
    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ user: { ...profile, center_ids: centerIds } }, { status: 201 });
}
