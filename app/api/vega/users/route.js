import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { requireVegaAdmin, VEGA_ROLES } from "../../../../lib/vegaAuth";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Doar vega_admin vede/creeaza utilizatori Vega - si DOAR conturi cu rol
// vega_admin/vega_manager sunt returnate aici (filtru explicit pe rol), ca sa
// nu poata aparea niciodata un cont Camin Romantic in aceasta lista.
export async function GET() {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaAdmin(user);
  if (vegaError) return vegaError;

  const { data, error: dbError } = await supabaseAdmin()
    .from("profiles")
    .select("id, email, full_name, role, vega_user_locations(location_id)")
    .in("role", VEGA_ROLES)
    .order("created_at", { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const users = (data || []).map((u) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    location_ids: (u.vega_user_locations || []).map((l) => l.location_id),
  }));

  return NextResponse.json({ users });
}

export async function POST(request) {
  const { user, error } = requireUser();
  if (error) return error;
  const vegaError = requireVegaAdmin(user);
  if (vegaError) return vegaError;

  const body = await request.json().catch(() => ({}));
  const { email, password, full_name, role } = body || {};
  const locationIds = Array.isArray(body.location_ids) ? body.location_ids.map(Number).filter(Boolean) : [];

  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: "Toate câmpurile sunt obligatorii." }, { status: 400 });
  }
  if (!VEGA_ROLES.includes(role)) {
    return NextResponse.json({ error: "Rol invalid." }, { status: 400 });
  }
  if (role === "vega_manager" && locationIds.length === 0) {
    return NextResponse.json(
      { error: "Cel puțin o locație este obligatorie pentru manager." },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Parola trebuie să aibă cel puțin 6 caractere." }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .insert({ id: created.user.id, email, full_name, role })
    .select("id, email, full_name, role")
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (role === "vega_manager" && locationIds.length > 0) {
    const { error: linkError } = await db
      .from("vega_user_locations")
      .insert(locationIds.map((location_id) => ({ user_id: profile.id, location_id })));
    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ user: { ...profile, location_ids: locationIds } }, { status: 201 });
}
