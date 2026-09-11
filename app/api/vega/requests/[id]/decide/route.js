import { NextResponse } from "next/server";
import { requireUser } from "../../../../../../lib/auth";
import { requireVegaAdmin, canAccessVegaLocation } from "../../../../../../lib/vegaAuth";
import { supabaseAdmin } from "../../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// La fel ca la Camin Romantic (unde doar admin accepta/respinge, nu si
// administrator de centru), la Vega Constanta doar vega_admin (si
// super_admin) pot accepta/respinge - vega_manager NU mai poate decide,
// doar creeaza si editeaza referatul cat e in asteptare.
export async function POST(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaAdmin(user);
  if (vegaError) return vegaError;

  const id = Number(params.id);
  const body = await request.json().catch(() => ({}));
  const { decision } = body || {};

  if (!["accept", "reject"].includes(decision)) {
    return NextResponse.json({ error: "Decizie invalidă." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: existing, error: fetchError } = await db
    .from("vega_requests")
    .select("id, status, location_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Referatul de necesitate nu a fost găsit." }, { status: 404 });
  if (!canAccessVegaLocation(user, existing.location_id)) {
    return NextResponse.json({ error: "Nu ai voie să decizi pentru această locație." }, { status: 403 });
  }
  if (existing.status !== "asteptare") {
    return NextResponse.json({ error: "Referatul de necesitate a fost deja procesat." }, { status: 409 });
  }

  const { data: updated, error: updateError } = await db
    .from("vega_requests")
    .update({
      status: decision === "accept" ? "in_curs" : "respins",
      decided_by: user.id,
      decided_by_name: user.full_name,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ request: updated });
}
