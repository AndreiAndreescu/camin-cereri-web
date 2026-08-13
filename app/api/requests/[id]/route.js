import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Admin poate sterge orice cerere, dar doar dupa ce a fost deja decisa
// (rezolvata sau respinsa) - cat timp e "in asteptare" sau "in curs", nu se
// poate sterge, ca sa nu dispara ceva care inca trebuie procesat.
//
// Administrator de centru poate sterge orice cerere a centrului/centrelor
// lui, indiferent de status - util ca sa corecteze rapid o cerere gresita,
// chiar daca inca n-a fost procesata. Nu poate sterge cereri de la alte
// centre.
export async function DELETE(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;

  const id = Number(params.id);
  const db = supabaseAdmin();

  const { data: existing, error: fetchError } = await db
    .from("requests")
    .select("id, status, center_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Cererea nu a fost găsită." }, { status: 404 });

  if (user.role === "admin") {
    if (!["rezolvat", "respins"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Poți șterge doar cereri deja rezolvate sau respinse." },
        { status: 400 }
      );
    }
  } else if (user.role === "administrator_centru") {
    const allowedCenters = user.center_ids || [];
    if (!allowedCenters.includes(existing.center_id)) {
      return NextResponse.json(
        { error: "Nu ai voie să ștergi cereri de la alt centru." },
        { status: 403 }
      );
    }
  } else {
    return NextResponse.json({ error: "Nu ai voie să faci această acțiune." }, { status: 403 });
  }

  const { error: dbError } = await db.from("requests").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
