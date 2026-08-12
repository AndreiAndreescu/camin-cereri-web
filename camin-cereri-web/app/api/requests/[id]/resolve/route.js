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
  const db = supabaseAdmin();

  const { data: existing, error: fetchError } = await db
    .from("requests")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Cererea nu a fost gasita." }, { status: 404 });
  if (existing.status !== "in_curs") {
    return NextResponse.json(
      { error: "Cererea trebuie sa fie acceptata (in curs de rezolvare) inainte de a fi marcata rezolvata." },
      { status: 409 }
    );
  }

  const { data: updated, error: updateError } = await db
    .from("requests")
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
