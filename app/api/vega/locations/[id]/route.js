import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { requireVegaAdmin } from "../../../../../lib/vegaAuth";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Doar vega_admin poate sterge o locatie. O locatie cu referate asociate nu
// poate fi stearsa (baza de date blocheaza asta automat).
export async function DELETE(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaAdmin(user);
  if (vegaError) return vegaError;

  const id = Number(params.id);
  const { error: dbError } = await supabaseAdmin().from("vega_locations").delete().eq("id", id);

  if (dbError) {
    if (dbError.code === "23503") {
      return NextResponse.json(
        { error: "Această locație are referate de necesitate asociate și nu poate fi ștearsă." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
