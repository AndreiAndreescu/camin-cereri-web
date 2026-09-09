import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { requireVegaUser, canAccessVegaLocation } from "../../../../lib/vegaAuth";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function mapRequest(row) {
  const items = (row.vega_request_items || [])
    .slice()
    .sort((a, b) => a.nr_crt - b.nr_crt)
    .map((it) => ({
      nr_crt: it.nr_crt,
      produs: it.produs,
      cantitate: it.cantitate,
      detalii: it.detalii || "",
      culoare: it.culoare || "",
      marime: it.marime || "",
      sex: it.sex || "",
    }));
  const attachments = (row.vega_request_attachments || [])
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((a) => ({
      id: a.id,
      file_name: a.file_name,
      mime_type: a.mime_type,
      size_bytes: a.size_bytes,
      uploaded_by_name: a.uploaded_by_name,
      created_at: a.created_at,
    }));
  const { vega_request_items, vega_request_attachments, ...rest } = row;
  return { ...rest, items, attachments };
}

// vega_admin vede toate referatele (orice locatie). vega_manager vede DOAR
// referatele locatiei/locatiilor lui - la fel de strict cum administrator de
// centru vede doar centrul lui la Camin Romantic, restrictia se aplica pe
// server, nu doar in interfata.
export async function GET(request) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaUser(user);
  if (vegaError) return vegaError;

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location_id");
  const status = searchParams.get("status");
  const urgent = searchParams.get("urgent");

  let query = supabaseAdmin()
    .from("vega_requests")
    .select("*, vega_request_items(*), vega_request_attachments(*)")
    .order("created_at", { ascending: false });

  if (user.role === "vega_manager") {
    const allowed = user.center_ids || [];
    if (allowed.length === 0) return NextResponse.json({ requests: [] });
    if (locationId) {
      if (!allowed.includes(Number(locationId))) return NextResponse.json({ requests: [] });
      query = query.eq("location_id", locationId);
    } else {
      query = query.in("location_id", allowed);
    }
  } else if (locationId) {
    query = query.eq("location_id", locationId);
  }

  if (status) query = query.eq("status", status);
  if (urgent === "1") query = query.eq("urgent", true);

  const { data, error: dbError } = await query;
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ requests: data.map(mapRequest) });
}

export async function POST(request) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaUser(user);
  if (vegaError) return vegaError;

  const body = await request.json().catch(() => ({}));
  const { urgent, items } = body || {};
  const locationId = Number(body.location_id);

  if (!locationId) {
    return NextResponse.json({ error: "Locația este obligatorie." }, { status: 400 });
  }
  if (!canAccessVegaLocation(user, locationId)) {
    return NextResponse.json({ error: "Nu ai voie să creezi referate pentru această locație." }, { status: 403 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Adaugă cel puțin un produs." }, { status: 400 });
  }
  for (const it of items) {
    if (!it.produs || !it.cantitate) {
      return NextResponse.json({ error: "Fiecare produs are nevoie de nume și cantitate." }, { status: 400 });
    }
  }

  const db = supabaseAdmin();

  const { data: newRequest, error: insertError } = await db
    .from("vega_requests")
    .insert({
      location_id: locationId,
      created_by: user.id,
      created_by_name: user.full_name,
      urgent: !!urgent,
      status: "asteptare",
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const itemRows = items.map((it, idx) => ({
    request_id: newRequest.id,
    nr_crt: idx + 1,
    produs: String(it.produs).trim(),
    cantitate: String(it.cantitate).trim(),
    detalii: it.detalii ? String(it.detalii).trim() : null,
    culoare: it.culoare ? String(it.culoare).trim() : null,
    marime: it.marime ? String(it.marime).trim() : null,
    sex: it.sex && ["Masculin", "Feminin"].includes(it.sex) ? it.sex : null,
  }));

  const { error: itemsError } = await db.from("vega_request_items").insert(itemRows);
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  return NextResponse.json(
    { request: mapRequest({ ...newRequest, vega_request_items: itemRows }) },
    { status: 201 }
  );
}
