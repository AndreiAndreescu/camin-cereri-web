#!/usr/bin/env node
// Creeaza un utilizator nou (cont + profil cu rol) intr-o singura comanda.
//
// Exemple:
//   npm run create-user -- --email=sefa@caminromantic.com --password=parola123 --name="Numele Sefei" --role=admin
//   npm run create-user -- --email=centru9@caminromantic.com --password=parola123 --name="Nume Administrator" --role=administrator_centru --center="CIA Romantic"
//
// Ca sa vezi numele exacte ale centrelor din baza de date:
//   npm run create-user -- --list-centers

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

function parseArgs() {
  const args = {};
  for (const raw of process.argv.slice(2)) {
    const m = raw.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
    else if (raw.startsWith("--")) args[raw.slice(2)] = true;
  }
  return args;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Lipsesc SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Creeaza un fisier .env.local (vezi .env.example) inainte de a rula scriptul."
    );
    process.exit(1);
  }

  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const args = parseArgs();

  if (args["list-centers"]) {
    const { data, error } = await db.from("centers").select("id, name").order("name");
    if (error) throw error;
    console.log("Centre disponibile:\n");
    data.forEach((c) => console.log(`  [${c.id}] ${c.name}`));
    return;
  }

  const { email, password, name, role, center } = args;

  if (!email || !password || !name || !role) {
    console.error(
      "Lipsesc argumente. Foloseste: --email=... --password=... --name=\"...\" --role=admin|administrator_centru [--center=\"Nume centru\"]"
    );
    process.exit(1);
  }
  if (!["admin", "administrator_centru"].includes(role)) {
    console.error('Rolul trebuie sa fie "admin" sau "administrator_centru".');
    process.exit(1);
  }

  let centerId = null;
  if (role === "administrator_centru") {
    if (!center) {
      console.error('Pentru rolul "administrator_centru" e obligatoriu si --center="Nume centru exact".');
      process.exit(1);
    }
    const { data: centerRow, error: centerError } = await db
      .from("centers")
      .select("id, name")
      .ilike("name", center)
      .maybeSingle();
    if (centerError) throw centerError;
    if (!centerRow) {
      console.error(
        `Nu am gasit niciun centru cu numele exact "${center}". Ruleaza "npm run create-user -- --list-centers" ca sa vezi numele corecte.`
      );
      process.exit(1);
    }
    centerId = centerRow.id;
  }

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) {
    console.error("Eroare la crearea contului:", createError.message);
    process.exit(1);
  }

  const { error: profileError } = await db.from("profiles").insert({
    id: created.user.id,
    email,
    full_name: name,
    role,
    center_id: centerId,
  });
  if (profileError) {
    console.error("Contul a fost creat, dar profilul a esuat:", profileError.message);
    process.exit(1);
  }

  console.log(`Cont creat cu succes: ${email} (rol: ${role}${centerId ? `, centru #${centerId}` : ""}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
