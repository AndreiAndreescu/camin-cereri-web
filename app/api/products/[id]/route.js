import { NextResponse } from "next/server";
import { requireUser, requireRole } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Doar admin poate elimina produse din catalog. Cererile deja trimise cu
// acel produs raman neschimbate (produsul e stocat ca text in request_items).
export async function DELETE(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return roleError;

  const id = Number(params.id);
  const { error: dbError } = await supabaseAdmin().from("products").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
