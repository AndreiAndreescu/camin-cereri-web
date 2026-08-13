import { NextResponse } from "next/server";
import { requireUser, requireRole } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = requireUser();
  if (error) return error;

  const { data, error: dbError } = await supabaseAdmin().from("centers").select("*").order("name");
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ centers: data });
}

// Doar admin poate adauga centre noi, direct din aplicatie.
export async function POST(request) {
  const { user, error } = requireUser();
  if (error) return error;
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return roleError;

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Numele centrului este obligatoriu." }, { status: 400 });
  }

  const { data, error: dbError } = await supabaseAdmin().from("centers").insert({ name }).select().single();
  if (dbError) {
    const message = dbError.code === "23505" ? "Există deja un centru cu acest nume." : dbError.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ center: data }, { status: 201 });
}
