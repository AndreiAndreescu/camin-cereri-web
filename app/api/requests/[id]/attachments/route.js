import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const BUCKET = "atasamente-referate";
const MAX_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Admin poate atasa fisiere la orice referat, indiferent de status.
// Administrator de centru poate atasa doar la referatele centrului/centrelor
// lui, tot indiferent de status.
function canAccess(user, centerId) {
  if (user.role === "admin") return true;
  if (user.role === "administrator_centru") {
    return (user.center_ids || []).includes(centerId);
  }
  return false;
}

export async function POST(request, { params }) {
  const { user, error } = requireUser();
  if (error) return error;

  const id = Number(params.id);
  const db = supabaseAdmin();

  const { data: existing, error: fetchError } = await db
    .from("requests")
    .select("id, center_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Referatul de necesitate nu a fost găsit." }, { status: 404 });
  if (!canAccess(user, existing.center_id)) {
    return NextResponse.json({ error: "Nu ai voie să faci această acțiune." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Niciun fișier trimis." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fișierul e prea mare (limita e 15MB)." }, { status: 400 });
  }
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Tip de fișier neacceptat. Poți atașa poze (jpg, png, heic, webp, gif) sau documente (pdf, doc, docx)." },
      { status: 400 }
    );
  }

  const safeName = String(file.name || "fisier").replace(/[^a-zA-Z0-9.\-_ ]/g, "_");
  const storagePath = `${id}/${Date.now()}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(storagePath, Buffer.from(arrayBuffer), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: attachment, error: insertError } = await db
    .from("request_attachments")
    .insert({
      request_id: id,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: user.id,
      uploaded_by_name: user.full_name,
    })
    .select()
    .single();

  if (insertError) {
    // Curatam fisierul din storage daca insertul de metadate a esuat, ca sa
    // nu ramana fisiere "orfane" fara nicio inregistrare.
    await db.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ attachment }, { status: 201 });
}
