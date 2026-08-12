import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = requireUser();
  if (error) return error;

  const { data, error: dbError } = await supabaseAdmin().from("centers").select("*").order("name");
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ centers: data });
}
