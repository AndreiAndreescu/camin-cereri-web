import { NextResponse } from "next/server";
import { requireUser, requireRole } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Doar admin poate sterge o cerere, si doar dupa ce a fost deja decisa
// (rezolvata sau respinsa) - cat timp e "in asteptare" sau "in curs", nu se
// poate sterge, ca sa nu dispara ceva care inca trebuie procesat.
export async function DELETE(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return roleError;

  const id = Number(params.id);
  const db = supabaseAdmin();

  const { data: existing, error: fetchError } = await db
    .from("requests")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Cererea nu a fost găsită." }, { status: 404 });
  if (!["rezolvat", "respins"].includes(existing.status)) {
    return NextResponse.json(
      { error: "Poți șterge doar cereri deja rezolvate sau respinse." },
      { status: 400 }
    );
  }

  const { error: dbError } = await db.from("requests").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
