import { NextResponse } from "next/server";
import { requireUser, requireRole } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Doar admin poate edita un utilizator: nume, rol, centre asignate, si
// optional o parola noua (daca vrea sa reseteze parola cuiva). Emailul nu
// se schimba de-aici (ar necesita reconfirmare din partea contului Supabase).
export async function PATCH(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return roleError;

  const id = params.id;
  const body = await request.json().catch(() => ({}));
  const { full_name, role, password } = body || {};
  const centerIds = Array.isArray(body.center_ids) ? body.center_ids.map(Number).filter(Boolean) : [];

  if (!full_name || !role) {
    return NextResponse.json({ error: "Numele și rolul sunt obligatorii." }, { status: 400 });
  }
  if (!["admin", "administrator_centru"].includes(role)) {
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

  const db = supabaseAdmin();

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .update({ full_name, role })
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

  const { error: dbError } = await supabaseAdmin().auth.admin.deleteUser(id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
