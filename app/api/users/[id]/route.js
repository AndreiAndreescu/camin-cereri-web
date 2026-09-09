import { NextResponse } from "next/server";
import { requireUser, requireRole } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Doar admin poate edita un utilizator: nume, email, rol, centre asignate, si
// optional o parola noua (daca vrea sa reseteze parola cuiva). Emailul se
// schimba in ambele locuri - contul de autentificare din Supabase (cu
// email_confirm: true, la fel ca la creare, ca sa nu fie nevoie de
// reconfirmare) si tabelul profiles, care il tine separat pentru afisare.
//
// super_admin poate in plus edita alte conturi super_admin (inclusiv sa
// promoveze un admin/administrator_centru la super_admin, schimband rolul),
// si sa se editeze pe sine. Un admin obisnuit nu poate atinge niciun cont
// super_admin - vezi allowedRolesFor in ../route.js.
function allowedRolesFor(actor) {
  return actor.role === "super_admin"
    ? ["admin", "administrator_centru", "super_admin"]
    : ["admin", "administrator_centru"];
}

export async function PATCH(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return roleError;

  const id = params.id;
  const db = supabaseAdmin();
  const allowedRoles = allowedRolesFor(user);

  // Verificam ca profilul-tinta are deja un rol Camin Romantic vizibil
  // pentru actor, altfel un admin nu ar trebui sa poata atinge (nici macar sa
  // vada ca exista) un cont vega_admin/vega_manager sau (daca nu e el insusi
  // super_admin) un cont super_admin.
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
  const centerIds = Array.isArray(body.center_ids) ? body.center_ids.map(Number).filter(Boolean) : [];

  if (!full_name || !role || !email) {
    return NextResponse.json({ error: "Numele, emailul și rolul sunt obligatorii." }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Emailul nu pare valid." }, { status: 400 });
  }
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Rol invalid." }, { status: 400 });
  }
  if (role === "administrator_centru" && centerIds.length === 0) {
    return NextResponse.json(
      { error: "Cel puțin un centru este obligatoriu pentru administrator de centru." },
      { status: 400 }
    );
  }
  if (password && password.length < 6) {
    return NextResponse.json({ error: "Parola trebuie să aibă cel puțin 6 caractere." }, { status: 400 });
  }

  const { error: authEmailError } = await db.auth.admin.updateUserById(id, {
    email,
    email_confirm: true,
  });
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

  const { error: clearError } = await db.from("user_centers").delete().eq("user_id", id);
  if (clearError) {
    return NextResponse.json({ error: clearError.message }, { status: 500 });
  }

  if (role === "administrator_centru" && centerIds.length > 0) {
    const { error: linkError } = await db
      .from("user_centers")
      .insert(centerIds.map((center_id) => ({ user_id: id, center_id })));
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

  return NextResponse.json({ user: { ...profile, center_ids: role === "administrator_centru" ? centerIds : [] } });
}

// Doar admin poate sterge utilizatori. Un admin nu isi poate sterge propriul
// cont din aplicatie (ca sa nu ramana nimeni fara acces din greseala).
export async function DELETE(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return roleError;

  const id = params.id;
  if (id === user.id) {
    return NextResponse.json({ error: "Nu îți poți șterge propriul cont." }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Acelasi filtru ca la PATCH: un admin obisnuit nu poate sterge un cont
  // care nu are deja un rol Camin Romantic vizibil pentru el (blocheaza orice
  // atingere a conturilor Vega si, daca nu e el insusi super_admin, a
  // conturilor super_admin).
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
