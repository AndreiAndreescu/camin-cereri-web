import { NextResponse } from "next/server";
import { requireUser, requireRole, ROLES_CU_DECIZIE } from "../../../../../lib/auth";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;

  const roleError = requireRole(user, ROLES_CU_DECIZIE);
  if (roleError) return roleError;

  const id = Number(params.id);
  const body = await request.json().catch(() => ({}));
  const { decision } = body || {};

  if (!["accept", "reject"].includes(decision)) {
    return NextResponse.json({ error: "Decizie invalida." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: existing, error: fetchError } = await db
    .from("requests")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Cererea nu a fost gasita." }, { status: 404 });
  if (existing.status !== "asteptare") {
    return NextResponse.json({ error: "Cererea a fost deja procesata." }, { status: 409 });
  }

  const { data: updated, error: updateError } = await db
    .from("requests")
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
