import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { requireVegaUser, requireVegaAdmin } from "../../../../lib/vegaAuth";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaUser(user);
  if (vegaError) return vegaError;

  const { data, error: dbError } = await supabaseAdmin().from("vega_locations").select("*").order("name");
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ locations: data });
}

// Doar vega_admin poate adauga locatii noi.
export async function POST(request) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaAdmin(user);
  if (vegaError) return vegaError;

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Numele locației este obligatoriu." }, { status: 400 });
  }

  const { data, error: dbError } = await supabaseAdmin().from("vega_locations").insert({ name }).select().single();
  if (dbError) {
    const message = dbError.code === "23505" ? "Există deja o locație cu acest nume." : dbError.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ location: data }, { status: 201 });
}
