import { NextResponse } from "next/server";
import { requireUser } from "../../../../../../lib/auth";
import { requireVegaAdmin, canAccessVegaLocation } from "../../../../../../lib/vegaAuth";
import { supabaseAdmin } from "../../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Doar vega_admin (si super_admin) pot marca un referat ca rezolvat -
// vega_manager NU mai poate, la fel ca la decide/route.js.
export async function POST(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaAdmin(user);
  if (vegaError) return vegaError;

  const id = Number(params.id);
  const db = supabaseAdmin();

  const { data: existing, error: fetchError } = await db
    .from("vega_requests")
    .select("id, status, location_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Referatul de necesitate nu a fost găsit." }, { status: 404 });
  if (!canAccessVegaLocation(user, existing.location_id)) {
    return NextResponse.json({ error: "Nu ai voie să faci această acțiune pentru această locație." }, { status: 403 });
  }
  if (existing.status !== "in_curs") {
    return NextResponse.json(
      { error: "Referatul de necesitate trebuie să fie acceptat (în curs de rezolvare) înainte de a fi marcat rezolvat." },
      { status: 409 }
    );
  }

  const { data: updated, error: updateError } = await db
    .from("vega_requests")
    .update({
      status: "rezolvat",
      resolved_by: user.id,
      resolved_by_name: user.full_name,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ request: updated });
}
