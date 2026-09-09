import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { requireVegaAdmin } from "../../../../lib/vegaAuth";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { buildShoppingList, buildShoppingListByCenter } from "../../../../lib/shoppingList";

export const dynamic = "force-dynamic";

// Lista "De luat" (agregata pe ambele locatii) e vizibila doar pentru
// vega_admin - vega_manager vede doar propriile referate, nu situatia
// globala (la fel ca la Camin Romantic).
export async function GET() {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaAdmin(user);
  if (vegaError) return vegaError;

  const db = supabaseAdmin();

  const { data, error: dbError } = await db
    .from("vega_requests")
    .select("*, vega_request_items(*)")
    .eq("status", "in_curs")
    .order("decided_at", { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // buildShoppingList / buildShoppingListByCenter sunt generice - le pasam
  // location_id sub cheia "center_id", pe care o folosesc doar ca sa grupeze.
  const requests = data.map((r) => ({
    center_id: r.location_id,
    items: (r.vega_request_items || [])
      .slice()
      .sort((a, b) => a.nr_crt - b.nr_crt)
      .map((it) => ({
        produs: it.produs,
        cantitate: it.cantitate,
        detalii: it.detalii || "",
        culoare: it.culoare || "",
        marime: it.marime || "",
        sex: it.sex || "",
      })),
  }));

  const byLocation = buildShoppingListByCenter(requests).map((row) => {
    const { center_id, ...rest } = row;
    return { ...rest, location_id: center_id };
  });

  return NextResponse.json({
    items: buildShoppingList(requests),
    byLocation,
  });
}
