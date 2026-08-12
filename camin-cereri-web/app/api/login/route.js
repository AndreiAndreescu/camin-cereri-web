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

  const sessionUser = {
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role,
    center_id: profile.center_id,
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
