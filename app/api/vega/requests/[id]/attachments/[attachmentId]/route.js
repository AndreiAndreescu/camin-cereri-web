import { NextResponse } from "next/server";
import { requireUser } from "../../../../../../../lib/auth";
import { requireVegaUser, canAccessVegaLocation } from "../../../../../../../lib/vegaAuth";
import { supabaseAdmin } from "../../../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const BUCKET = "vega-atasamente";

async function loadRequestAndAttachment(db, requestId, attachmentId) {
  const { data: req } = await db
    .from("vega_requests")
    .select("id, location_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return { req: null, attachment: null };

  const { data: attachment } = await db
    .from("vega_request_attachments")
    .select("*")
    .eq("id", attachmentId)
    .eq("request_id", requestId)
    .maybeSingle();

  return { req, attachment };
}

export async function GET(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaUser(user);
  if (vegaError) return vegaError;

  const db = supabaseAdmin();
  const { req, attachment } = await loadRequestAndAttachment(db, Number(params.id), Number(params.attachmentId));

  if (!req) return NextResponse.json({ error: "Referatul de necesitate nu a fost găsit." }, { status: 404 });
  if (!attachment) return NextResponse.json({ error: "Fișierul nu a fost găsit." }, { status: 404 });
  if (!canAccessVegaLocation(user, req.location_id)) {
    return NextResponse.json({ error: "Nu ai voie să faci această acțiune." }, { status: 403 });
  }

  const { data, error: urlError } = await db.storage
    .from(BUCKET)
    .createSignedUrl(attachment.storage_path, 60, { download: attachment.file_name });

  if (urlError) return NextResponse.json({ error: urlError.message }, { status: 500 });

  return NextResponse.redirect(data.signedUrl);
}

export async function DELETE(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaUser(user);
  if (vegaError) return vegaError;

  const db = supabaseAdmin();
  const { req, attachment } = await loadRequestAndAttachment(db, Number(params.id), Number(params.attachmentId));

  if (!req) return NextResponse.json({ error: "Referatul de necesitate nu a fost găsit." }, { status: 404 });
  if (!attachment) return NextResponse.json({ error: "Fișierul nu a fost găsit." }, { status: 404 });
  if (!canAccessVegaLocation(user, req.location_id)) {
    return NextResponse.json({ error: "Nu ai voie să faci această acțiune." }, { status: 403 });
  }

  await db.storage.from(BUCKET).remove([attachment.storage_path]);

  const { error: dbError } = await db.from("vega_request_attachments").delete().eq("id", attachment.id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
