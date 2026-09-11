import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { requireVegaUser, canAccessVegaLocation } from "../../../../../lib/vegaAuth";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

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
  const { vega_request_items, ...rest } = row;
  return { ...rest, items };
}

// vega_admin sau vega_manager pot edita un referat CAT TIMP e inca "in
// asteptare" - la fel ca la Camin Romantic. vega_manager trebuie sa aiba
// acces atat la locatia veche cat si la cea noua (in caz ca e responsabil de
// mai multe locatii si vrea sa mute referatul).
export async function PATCH(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaUser(user);
  if (vegaError) return vegaError;

  const id = Number(params.id);
  const db = supabaseAdmin();

  const { data: existing, error: fetchError } = await db
    .from("vega_requests")
    .select("id, status, location_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Referatul de necesitate nu a fost găsit." }, { status: 404 });
  if (existing.status !== "asteptare") {
    return NextResponse.json(
      { error: "Poți edita doar referate de necesitate aflate încă în așteptare." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { urgent, items } = body || {};
  const locationId = Number(body.location_id);

  if (!locationId) {
    return NextResponse.json({ error: "Locația este obligatorie." }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Adaugă cel puțin un produs." }, { status: 400 });
  }
  for (const it of items) {
    if (!it.produs || !it.cantitate) {
      return NextResponse.json({ error: "Fiecare produs are nevoie de nume și cantitate." }, { status: 400 });
    }
  }

  if (!canAccessVegaLocation(user, existing.location_id) || !canAccessVegaLocation(user, locationId)) {
    return NextResponse.json(
      { error: "Nu ai voie să muți referate către/de la o locație care nu e a ta." },
      { status: 403 }
    );
  }

  const { data: updatedRequest, error: updateError } = await db
    .from("vega_requests")
    .update({ location_id: locationId, urgent: !!urgent })
    .eq("id", id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { error: deleteItemsError } = await db.from("vega_request_items").delete().eq("request_id", id);
  if (deleteItemsError) return NextResponse.json({ error: deleteItemsError.message }, { status: 500 });

  const itemRows = items.map((it, idx) => ({
    request_id: id,
    nr_crt: idx + 1,
    produs: String(it.produs).trim(),
    cantitate: String(it.cantitate).trim(),
    detalii: it.detalii ? String(it.detalii).trim() : null,
    culoare: it.culoare ? String(it.culoare).trim() : null,
    marime: it.marime ? String(it.marime).trim() : null,
    sex: it.sex && ["Masculin", "Feminin"].includes(it.sex) ? it.sex : null,
  }));

  const { error: insertItemsError } = await db.from("vega_request_items").insert(itemRows);
  if (insertItemsError) return NextResponse.json({ error: insertItemsError.message }, { status: 500 });

  return NextResponse.json({ request: mapRequest({ ...updatedRequest, vega_request_items: itemRows }) });
}

// vega_admin (si super_admin) pot sterge orice referat, dar doar dupa ce a
// fost deja decis (rezolvat sau respins). vega_manager NU mai poate
// accepta/respinge/rezolva (vezi decide/resolve/route.js), deci poate sterge
// DOAR propriile referate cat inca sunt "in asteptare" - de ex. daca a
// gresit ceva la creare - nu si dupa ce au fost procesate de vega_admin.
export async function DELETE(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaUser(user);
  if (vegaError) return vegaError;

  const id = Number(params.id);
  const db = supabaseAdmin();

  const { data: existing, error: fetchError } = await db
    .from("vega_requests")
    .select("id, status, location_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Referatul de necesitate nu a fost găsit." }, { status: 404 });

  if (user.role === "vega_admin" || user.role === "super_admin") {
    if (!["rezolvat", "respins"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Poți șterge doar referate de necesitate deja rezolvate sau respinse." },
        { status: 400 }
      );
    }
  } else if (user.role === "vega_manager") {
    if (!canAccessVegaLocation(user, existing.location_id)) {
      return NextResponse.json({ error: "Nu ai voie să ștergi referate de la altă locație." }, { status: 403 });
    }
    if (existing.status !== "asteptare") {
      return NextResponse.json(
        { error: "Poți șterge doar referate de necesitate aflate încă în așteptare." },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json({ error: "Nu ai voie să faci această acțiune." }, { status: 403 });
  }

  const { error: dbError } = await db.from("vega_requests").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
