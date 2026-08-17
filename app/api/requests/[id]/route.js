import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function mapRequest(row) {
  const items = (row.request_items || [])
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
  const { request_items, ...rest } = row;
  return { ...rest, items };
}

// Admin si administrator de centru pot edita o cerere CAT TIMP e inca "in
// asteptare" (nedecisa). Odata acceptata/respinsa/rezolvata, nu se mai poate
// edita - doar stearsa (vezi DELETE mai jos), ca sa nu se schimbe pe ascuns
// ceva ce a fost deja procesat. Se poate schimba si centrul cererii (util
// pentru un administrator care are mai multe centre si a gresit la creare).
export async function PATCH(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;

  const id = Number(params.id);
  const db = supabaseAdmin();

  const { data: existing, error: fetchError } = await db
    .from("requests")
    .select("id, status, center_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Cererea nu a fost găsită." }, { status: 404 });
  if (existing.status !== "asteptare") {
    return NextResponse.json(
      { error: "Poți edita doar cereri aflate încă în așteptare." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { urgent, items } = body || {};
  const centerId = body.center_id;

  if (!centerId) {
    return NextResponse.json({ error: "Centrul este obligatoriu." }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Adauga cel putin un produs." }, { status: 400 });
  }
  for (const it of items) {
    if (!it.produs || !it.cantitate) {
      return NextResponse.json({ error: "Fiecare produs are nevoie de nume si cantitate." }, { status: 400 });
    }
  }

  if (user.role === "admin") {
    // fara restrictie de centru
  } else if (user.role === "administrator_centru") {
    const allowedCenters = user.center_ids || [];
    if (!allowedCenters.includes(existing.center_id) || !allowedCenters.includes(Number(centerId))) {
      return NextResponse.json(
        { error: "Nu ai voie să muți cereri către/de la un centru care nu e al tău." },
        { status: 403 }
      );
    }
  } else {
    return NextResponse.json({ error: "Nu ai voie să faci această acțiune." }, { status: 403 });
  }

  const { data: updatedRequest, error: updateError } = await db
    .from("requests")
    .update({ center_id: Number(centerId), urgent: !!urgent })
    .eq("id", id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { error: deleteItemsError } = await db.from("request_items").delete().eq("request_id", id);
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

  const { error: insertItemsError } = await db.from("request_items").insert(itemRows);
  if (insertItemsError) return NextResponse.json({ error: insertItemsError.message }, { status: 500 });

  return NextResponse.json({ request: mapRequest({ ...updatedRequest, request_items: itemRows }) });
}

// Admin poate sterge orice cerere, dar doar dupa ce a fost deja decisa
// (rezolvata sau respinsa) - cat timp e "in asteptare" sau "in curs", nu se
// poate sterge, ca sa nu dispara ceva care inca trebuie procesat.
//
// Administrator de centru poate sterge orice cerere a centrului/centrelor
// lui, indiferent de status - util ca sa corecteze rapid o cerere gresita,
// chiar daca inca n-a fost procesata. Nu poate sterge cereri de la alte
// centre.
export async function DELETE(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;

  const id = Number(params.id);
  const db = supabaseAdmin();

  const { data: existing, error: fetchError } = await db
    .from("requests")
    .select("id, status, center_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Cererea nu a fost găsită." }, { status: 404 });

  if (user.role === "admin") {
    if (!["rezolvat", "respins"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Poți șterge doar cereri deja rezolvate sau respinse." },
        { status: 400 }
      );
    }
  } else if (user.role === "administrator_centru") {
    const allowedCenters = user.center_ids || [];
    if (!allowedCenters.includes(existing.center_id)) {
      return NextResponse.json(
        { error: "Nu ai voie să ștergi cereri de la alt centru." },
        { status: 403 }
      );
    }
  } else {
    return NextResponse.json({ error: "Nu ai voie să faci această acțiune." }, { status: 403 });
  }

  const { error: dbError } = await db.from("requests").delete().eq("id", id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
