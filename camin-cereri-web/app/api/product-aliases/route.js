import { NextResponse } from "next/server";
import { requireUser, requireRole } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Doar admin gestioneaza sinonimele (ex. "mese" se numara ca "masa").

export async function GET() {
  const { user, error } = requireUser();
  if (error) return error;
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return roleError;

  const { data, error: dbError } = await supabaseAdmin()
    .from("product_aliases")
    .select("*")
    .order("created_at", { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ aliases: data });
}

export async function POST(request) {
  const { user, error } = requireUser();
  if (error) return error;
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return roleError;

  const body = await request.json().catch(() => ({}));
  const { alias, canonical } = body || {};

  if (!alias || !canonical) {
    return NextResponse.json({ error: "Ambele câmpuri sunt obligatorii." }, { status: 400 });
  }

  const { data, error: dbError } = await supabaseAdmin()
    .from("product_aliases")
    .insert({ alias: alias.trim(), canonical: canonical.trim() })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ alias: data }, { status: 201 });
}
