import { NextResponse } from "next/server";
import { requireUser, requireRole, ROLES_CU_CREARE } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function mapRequest(row) {
  const items = (row.request_items || [])
    .slice()
    .sort((a, b) => a.nr_crt - b.nr_crt)
    .map((it) => ({ nr_crt: it.nr_crt, produs: it.produs, cantitate: it.cantitate }));
  const { request_items, ...rest } = row;
  return { ...rest, items };
}

export async function GET(request) {
  const { user, error } = requireUser();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const centerId = searchParams.get("center_id");
  const status = searchParams.get("status");
  const urgent = searchParams.get("urgent");

  let query = supabaseAdmin()
    .from("requests")
    .select("*, request_items(*)")
    .order("created_at", { ascending: false });

  if (centerId) query = query.eq("center_id", centerId);
  if (status) query = query.eq("status", status);
  if (urgent === "1") query = query.eq("urgent", true);

  const { data, error: dbError } = await query;
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ requests: data.map(mapRequest) });
}

export async function POST(request) {
  const { user, error } = requireUser();
  if (error) return error;

  const roleError = requireRole(user, ROLES_CU_CREARE);
  if (roleError) return roleError;

  const body = await request.json().catch(() => ({}));
  const { urgent, items } = body || {};
  const centerId = body.center_id;

  if (!centerId) {
    return NextResponse.json({ error: "Centrul este obligatoriu." }, { status: 400 });
  }
  if (user.role === "administrator_centru") {
    const allowedCenters = user.center_ids || [];
    if (!allowedCenters.includes(Number(centerId))) {
      return NextResponse.json({ error: "Nu ai voie sa creezi cereri pentru acest centru." }, { status: 403 });
    }
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Adauga cel putin un produs." }, { status: 400 });
  }
  for (const it of items) {
    if (!it.produs || !it.cantitate) {
      return NextResponse.json({ error: "Fiecare produs are nevoie de nume si cantitate." }, { status: 400 });
    }
  }

  const db = supabaseAdmin();

  const { data: newRequest, error: insertError } = await db
    .from("requests")
    .insert({
      center_id: Number(centerId),
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
  }));

  const { error: itemsError } = await db.from("request_items").insert(itemRows);
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  return NextResponse.json(
    { request: mapRequest({ ...newRequest, request_items: itemRows }) },
    { status: 201 }
  );
}
