import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { requireVegaUser, canAccessVegaLocation } from "../../../../lib/vegaAuth";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Catalog SEPARAT per locatie (Salon Beauty si Restaurant nu impart produse
// intre ele). vega_admin vede tot; vega_manager vede doar catalogul
// locatiei/locatiilor lui.
export async function GET(request) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaUser(user);
  if (vegaError) return vegaError;

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location_id");

  let query = supabaseAdmin().from("vega_products").select("*").order("name");

  if (user.role === "vega_manager") {
    const allowed = user.center_ids || [];
    if (allowed.length === 0) return NextResponse.json({ products: [] });
    if (locationId) {
      if (!allowed.includes(Number(locationId))) return NextResponse.json({ products: [] });
      query = query.eq("location_id", locationId);
    } else {
      query = query.in("location_id", allowed);
    }
  } else if (locationId) {
    query = query.eq("location_id", locationId);
  }

  const { data, error: dbError } = await query;
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ products: data });
}

export async function POST(request) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaUser(user);
  if (vegaError) return vegaError;

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const locationId = Number(body.location_id);

  if (!name) {
    return NextResponse.json({ error: "Numele produsului este obligatoriu." }, { status: 400 });
  }
  if (!locationId) {
    return NextResponse.json({ error: "Locația este obligatorie." }, { status: 400 });
  }
  if (!canAccessVegaLocation(user, locationId)) {
    return NextResponse.json({ error: "Nu ai voie să adaugi produse pentru această locație." }, { status: 403 });
  }

  const { data, error: dbError } = await supabaseAdmin()
    .from("vega_products")
    .insert({ name, location_id: locationId })
    .select()
    .single();

  if (dbError) {
    const message = dbError.code === "23505" ? "Există deja un produs cu acest nume la această locație." : dbError.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}
