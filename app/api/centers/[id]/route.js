import { NextResponse } from "next/server";
import { requireUser, requireRole } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Doar admin poate sterge centre. Un centru care are cereri asociate nu poate
// fi sters (baza de date blocheaza asta automat) - ii aratam un mesaj clar
// in loc de o eroare tehnica.
export async function DELETE(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return roleError;

  const id = Number(params.id);
  const { error: dbError } = await supabaseAdmin().from("centers").delete().eq("id", id);

  if (dbError) {
    if (dbError.code === "23503") {
      return NextResponse.json(
        { error: "Acest centru are cereri asociate și nu poate fi șters." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
