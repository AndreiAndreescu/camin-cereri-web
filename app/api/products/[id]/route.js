import { NextResponse } from "next/server";
import { requireUser, requireRole } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Atat admin cat si administratorul de centru pot redenumi un produs din
// catalog. Cererile deja trimise cu numele vechi raman neschimbate (produsul
// e stocat ca text in request_items, nu ca legatura catre catalog) - doar
// produsele noi vor folosi numele nou.
export async function PATCH(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const roleError = requireRole(user, ["admin", "administrator_centru"]);
  if (roleError) return roleError;

  const id = Number(params.id);
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Numele produsului este obligatoriu." }, { status: 400 });
  }

  const { data, error: dbError } = await supabaseAdmin()
    .from("products")
    .update({ name })
    .eq("id", id)
    .select()
    .single();

  if (dbError) {
    const message = dbError.code === "23505" ? "Există deja un produs cu acest nume." : dbError.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ product: data });
}

// Atat admin cat si administratorul de centru pot elimina produse din
// catalog. Cererile deja trimise cu acel produs raman neschimbate (produsul
// e stocat ca text in request_items).
export async function DELETE(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const roleError = requireRole(user, ["admin", "administrator_centru"]);
  if (roleError) return roleError;

  const id = Number(params.id);
  const { error: dbError } = await supabaseAdmin().from("products").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
