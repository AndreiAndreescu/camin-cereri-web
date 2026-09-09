import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { requireVegaAdmin, VEGA_ROLES } from "../../../../../lib/vegaAuth";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Doar vega_admin poate edita un utilizator Vega: nume, email, rol, locații
// asignate, si optional o parola noua. Verificam explicit ca profilul-tinta
// are deja un rol vizibil pentru actor (Vega, sau super_admin daca actorul e
// el insusi super_admin), altfel un cont vega_admin nu ar trebui sa poata
// atinge (nici macar sa vada ca exista) un cont admin/administrator_centru
// de la Camin Romantic - izolarea trebuie sa fie completa, in ambele sensuri.
//
// super_admin poate in plus edita alte conturi super_admin (inclusiv sa
// promoveze un vega_admin/vega_manager la super_admin) - vezi allowedRolesFor
// in ../route.js.
function allowedRolesFor(actor) {
  return actor.role === "super_admin" ? [...VEGA_ROLES, "super_admin"] : VEGA_ROLES;
}

export async function PATCH(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaAdmin(user);
  if (vegaError) return vegaError;

  const id = params.id;
  const db = supabaseAdmin();
  const allowedRoles = allowedRolesFor(user);

  const { data: target, error: targetError } = await db
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .maybeSingle();
  if (targetError) return NextResponse.json({ error: targetError.message }, { status: 500 });
  if (!target || !allowedRoles.includes(target.role)) {
    return NextResponse.json({ error: "Utilizatorul nu a fost găsit." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { full_name, role, password } = body || {};
  const email = body.email ? String(body.email).trim() : "";
  const locationIds = Array.isArray(body.location_ids) ? body.location_ids.map(Number).filter(Boolean) : [];

  if (!full_name || !role || !email) {
    return NextResponse.json({ error: "Numele, emailul și rolul sunt obligatorii." }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Emailul nu pare valid." }, { status: 400 });
  }
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Rol invalid." }, { status: 400 });
  }
  if (role === "vega_manager" && locationIds.length === 0) {
    return NextResponse.json(
      { error: "Cel puțin o locație este obligatorie pentru manager." },
      { status: 400 }
    );
  }
  if (password && password.length < 6) {
    return NextResponse.json({ error: "Parola trebuie să aibă cel puțin 6 caractere." }, { status: 400 });
  }

  const { error: authEmailError } = await db.auth.admin.updateUserById(id, { email, email_confirm: true });
  if (authEmailError) {
    return NextResponse.json({ error: authEmailError.message }, { status: 400 });
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .update({ full_name, role, email })
    .eq("id", id)
    .select("id, email, full_name, role")
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { error: clearError } = await db.from("vega_user_locations").delete().eq("user_id", id);
  if (clearError) {
    return NextResponse.json({ error: clearError.message }, { status: 500 });
  }

  if (role === "vega_manager" && locationIds.length > 0) {
    const { error: linkError } = await db
      .from("vega_user_locations")
      .insert(locationIds.map((location_id) => ({ user_id: id, location_id })));
    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }
  }

  if (password) {
    const { error: pwError } = await db.auth.admin.updateUserById(id, { password });
    if (pwError) {
      return NextResponse.json({ error: pwError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ user: { ...profile, location_ids: role === "vega_manager" ? locationIds : [] } });
}

// Doar vega_admin poate sterge utilizatori Vega, si nu isi poate sterge
// propriul cont. Acelasi filtru de rol ca la PATCH - un vega_admin nu poate
// sterge un cont care nu are deja un rol Vega.
export async function DELETE(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaAdmin(user);
  if (vegaError) return vegaError;

  const id = params.id;
  if (id === user.id) {
    return NextResponse.json({ error: "Nu îți poți șterge propriul cont." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: target, error: targetError } = await db
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .maybeSingle();
  if (targetError) return NextResponse.json({ error: targetError.message }, { status: 500 });
  if (!target || !allowedRolesFor(user).includes(target.role)) {
    return NextResponse.json({ error: "Utilizatorul nu a fost găsit." }, { status: 404 });
  }

  const { error: dbError } = await db.auth.admin.deleteUser(id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
