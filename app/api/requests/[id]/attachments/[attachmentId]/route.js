import { NextResponse } from "next/server";
import { requireUser } from "../../../../../../lib/auth";
import { supabaseAdmin } from "../../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const BUCKET = "atasamente-referate";

function canAccess(user, centerId) {
  if (user.role === "admin") return true;
  if (user.role === "administrator_centru") {
    return (user.center_ids || []).includes(centerId);
  }
  return false;
}

async function loadRequestAndAttachment(db, requestId, attachmentId) {
  const { data: req } = await db
    .from("requests")
    .select("id, center_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return { req: null, attachment: null };

  const { data: attachment } = await db
    .from("request_attachments")
    .select("*")
    .eq("id", attachmentId)
    .eq("request_id", requestId)
    .maybeSingle();

  return { req, attachment };
}

// Genereaza un link temporar (60 secunde) de descarcare si redirectioneaza
// catre el - bucket-ul e privat, deci nu exista alt mod de a accesa fisierul
// direct din browser.
export async function GET(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;

  const db = supabaseAdmin();
  const { req, attachment } = await loadRequestAndAttachment(db, Number(params.id), Number(params.attachmentId));

  if (!req) return NextResponse.json({ error: "Referatul de necesitate nu a fost găsit." }, { status: 404 });
  if (!attachment) return NextResponse.json({ error: "Fișierul nu a fost găsit." }, { status: 404 });
  if (!canAccess(user, req.center_id)) {
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

  const db = supabaseAdmin();
  const { req, attachment } = await loadRequestAndAttachment(db, Number(params.id), Number(params.attachmentId));

  if (!req) return NextResponse.json({ error: "Referatul de necesitate nu a fost găsit." }, { status: 404 });
  if (!attachment) return NextResponse.json({ error: "Fișierul nu a fost găsit." }, { status: 404 });
  if (!canAccess(user, req.center_id)) {
    return NextResponse.json({ error: "Nu ai voie să faci această acțiune." }, { status: 403 });
  }

  await db.storage.from(BUCKET).remove([attachment.storage_path]);

  const { error: dbError } = await db.from("request_attachments").delete().eq("id", attachment.id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
