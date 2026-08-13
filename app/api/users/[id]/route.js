import { NextResponse } from "next/server";
import { requireUser, requireRole } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

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
