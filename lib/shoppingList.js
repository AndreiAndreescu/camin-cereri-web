// Extrage numarul de la inceputul unei cantitati ("5 buc" -> {value:5, unit:"buc"}).
function parseQuantity(raw) {
  const m = String(raw).trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return null;
  return { value: parseFloat(m[1].replace(",", ".")), unit: m[2].trim() };
}

function formatNumber(n) {
  const rounded = Math.round(n * 1000) / 1000;
  return String(rounded);
}

// Cheie de grupare "fuzzy" pentru nume de produse: ignora majuscule/minuscule,
// diacritice si formele de plural cele mai comune in romana (scaun/scaune,
// produs/produse, cutie/cutii, floare/flori) ca sa prinda acelasi produs
// scris diferit de doua persoane. Pluralele cu adevarat neregulate (ex.
// masa/mese) tot apar ca randuri separate - pentru alea exista lista de
// sinonime, unde admin le leaga manual o singura data.
function normalizeProductKey(name) {
  let s = String(name)
    .trim()
    .toLowerCase()
    .replace(/[ăâ]/g, "a")
    .replace(/î/g, "i")
    .replace(/ș/g, "s")
    .replace(/ț/g, "t");

  if (s.endsWith("oare") && s.length > 4) s = s.slice(0, -4) + "or";
  else if (s.endsWith("ori") && s.length > 3) s = s.slice(0, -3) + "or";
  else if (s.endsWith("uri") && s.length > 5) s = s.slice(0, -3);
  else if ((s.endsWith("e") || s.endsWith("i")) && s.length > 3) s = s.slice(0, -1);

  return s;
}

// aliases: array de { alias, canonical } definite manual de admin, pentru
// pluralele neregulate pe care regulile automate nu le prind (ex. masa/mese).
function buildAliasMap(aliases) {
  const map = new Map();
  for (const a of aliases || []) {
    const aliasKey = normalizeProductKey(a.alias);
    map.set(aliasKey, {
      canonicalKey: normalizeProductKey(a.canonical),
      canonicalDisplay: a.canonical.trim(),
    });
  }
  return map;
}

// requests: array de { items: [{produs, cantitate}, ...] }, deja filtrate pe
// status "in_curs". Produsele identice (sau cu forme singular/plural diferite)
// se aduna intr-un singur rand.
export function buildShoppingList(requests, aliases = []) {
  const aliasMap = buildAliasMap(aliases);
  const groups = new Map();
  const unmerged = [];

  for (const r of requests) {
    for (const it of r.items) {
      const parsed = parseQuantity(it.cantitate);
      if (!parsed) {
        unmerged.push({ produs: it.produs, cantitate: it.cantitate });
        continue;
      }
      let key = normalizeProductKey(it.produs);
      let displayName = it.produs.trim();
      if (aliasMap.has(key)) {
        const mapped = aliasMap.get(key);
        key = mapped.canonicalKey;
        displayName = mapped.canonicalDisplay;
      }
      if (!groups.has(key)) {
        groups.set(key, { produs: displayName, total: 0, units: new Set() });
      }
      const g = groups.get(key);
      g.total += parsed.value;
      if (parsed.unit) g.units.add(parsed.unit);
    }
  }

  const rows = [];
  for (const g of groups.values()) {
    const unitLabel =
      g.units.size === 1
        ? " " + [...g.units][0]
        : g.units.size > 1
        ? ` (${[...g.units].join(", ")})`
        : "";
    rows.push({ produs: g.produs, cantitate: formatNumber(g.total) + unitLabel });
  }
  for (const u of unmerged) {
    rows.push({ produs: u.produs, cantitate: u.cantitate });
  }
  rows.forEach((row, idx) => (row.nr_crt = idx + 1));

  return rows;
}
