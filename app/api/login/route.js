import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAuthClient } from "../../../lib/supabaseAuthClient";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { signSession, SESSION_COOKIE } from "../../../lib/session";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { email, password } = body || {};

  if (!email || !password) {
    return NextResponse.json({ error: "Email si parola sunt obligatorii." }, { status: 400 });
  }

  const { data, error } = await supabaseAuthClient().auth.signInWithPassword({ email, password });
  if (error || !data?.user) {
    return NextResponse.json({ error: "Email sau parola gresita." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin()
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Contul nu are un profil configurat in aplicatie. Cere administratorului sa il configureze." },
      { status: 403 }
    );
  }

  // center_ids tine locatiile/centrele asignate userului, indiferent de
  // sectiune: pentru administrator_centru vin din user_centers (Camin
  // Romantic), pentru vega_manager vin din vega_user_locations (Vega
  // Constanta - tabel complet separat). admin/vega_admin nu au restrictii,
  // deci raman cu array gol.
  const linksTable = profile.role === "vega_manager" ? "vega_user_locations" : "user_centers";
  const linksColumn = profile.role === "vega_manager" ? "location_id" : "center_id";

  let centerIds = [];
  if (profile.role === "administrator_centru" || profile.role === "vega_manager") {
    const { data: links } = await supabaseAdmin().from(linksTable).select(linksColumn).eq("user_id", profile.id);
    centerIds = (links || []).map((l) => l[linksColumn]);
  }

  const sessionUser = {
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role,
    center_ids: centerIds,
  };

  const token = signSession(sessionUser);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.json({ user: sessionUser });
}
