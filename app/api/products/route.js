import { NextResponse } from "next/server";
import { requireUser, requireRole } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Toti utilizatorii logati vad catalogul (ca sa aleaga produse la o cerere
// noua). Atat admin cat si administratorul de centru pot adauga produse noi.

export async function GET() {
  const { user, error } = requireUser();
  if (error) return error;

  const { data, error: dbError } = await supabaseAdmin().from("products").select("*").order("name");
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ products: data });
}

export async function POST(request) {
  const { user, error } = requireUser();
  if (error) return error;
  const roleError = requireRole(user, ["admin", "administrator_centru"]);
  if (roleError) return roleError;

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Numele produsului este obligatoriu." }, { status: 400 });
  }

  const { data, error: dbError } = await supabaseAdmin().from("products").insert({ name }).select().single();
  if (dbError) {
    const message = dbError.code === "23505" ? "Există deja un produs cu acest nume." : dbError.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}
