import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { buildShoppingList } from "../../../lib/shoppingList";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = requireUser();
  if (error) return error;

  const db = supabaseAdmin();

  const { data, error: dbError } = await db
    .from("requests")
    .select("*, request_items(*)")
    .eq("status", "in_curs")
    .order("decided_at", { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const requests = data.map((r) => ({
    items: (r.request_items || [])
      .slice()
      .sort((a, b) => a.nr_crt - b.nr_crt)
      .map((it) => ({ produs: it.produs, cantitate: it.cantitate, detalii: it.detalii || "" })),
  }));

  return NextResponse.json({ items: buildShoppingList(requests) });
}
