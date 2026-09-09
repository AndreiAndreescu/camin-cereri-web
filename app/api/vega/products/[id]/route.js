import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { requireVegaUser, canAccessVegaLocation } from "../../../../../lib/vegaAuth";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaUser(user);
  if (vegaError) return vegaError;

  const id = Number(params.id);
  const db = supabaseAdmin();

  const { data: existing, error: fetchError } = await db
    .from("vega_products")
    .select("id, location_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Produsul nu a fost găsit." }, { status: 404 });
  if (!canAccessVegaLocation(user, existing.location_id)) {
    return NextResponse.json({ error: "Nu ai voie să editezi acest produs." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Numele produsului este obligatoriu." }, { status: 400 });
  }

  const { data, error: dbError } = await db.from("vega_products").update({ name }).eq("id", id).select().single();
  if (dbError) {
    const message = dbError.code === "23505" ? "Există deja un produs cu acest nume la această locație." : dbError.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ product: data });
}

export async function DELETE(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaUser(user);
  if (vegaError) return vegaError;

  const id = Number(params.id);
  const db = supabaseAdmin();

  const { data: existing, error: fetchError } = await db
    .from("vega_products")
    .select("id, location_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Produsul nu a fost găsit." }, { status: 404 });
  if (!canAccessVegaLocation(user, existing.location_id)) {
    return NextResponse.json({ error: "Nu ai voie să ștergi acest produs." }, { status: 403 });
  }

  const { error: dbError } = await db.from("vega_products").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
