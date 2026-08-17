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
// scris diferit de doua persoane.
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

function normalizeAttr(value) {
  return String(value || "").trim().toLowerCase();
}

// Extrage din item cele 4 atribute optionale afisate/folosite la grupare:
// detalii, culoare, marime, sex. Centralizat aici ca sa nu se piarda vreunul
// dintre ele in vreo parte a codului.
function pickAttrs(it) {
  return {
    detalii: String(it.detalii || "").trim(),
    culoare: String(it.culoare || "").trim(),
    marime: String(it.marime || "").trim(),
    sex: String(it.sex || "").trim(),
  };
}

function attrsKey(attrs) {
  return [attrs.detalii, attrs.culoare, attrs.marime, attrs.sex].map(normalizeAttr).join("||");
}

// requests: array de { items: [{produs, cantitate, detalii, culoare, marime,
// sex}, ...] }, deja filtrate pe status "in_curs". Produsele identice (sau cu
// forme singular/plural diferite) CU ACELEASI detalii/culoare/marime/sex se
// aduna intr-un singur rand. Doua produse identice dar cu vreun atribut
// diferit (ex: culoare diferita, marime diferita) raman randuri separate, ca
// sa nu se piarda informatia.
export function buildShoppingList(requests) {
  const groups = new Map();
  const unmerged = [];

  for (const r of requests) {
    for (const it of r.items) {
      const parsed = parseQuantity(it.cantitate);
      const attrs = pickAttrs(it);
      if (!parsed) {
        unmerged.push({ produs: it.produs, cantitate: it.cantitate, ...attrs });
        continue;
      }
      const key = normalizeProductKey(it.produs) + "||" + attrsKey(attrs);
      const displayName = it.produs.trim();
      if (!groups.has(key)) {
        groups.set(key, { produs: displayName, ...attrs, total: 0, units: new Set() });
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
    rows.push({
      produs: g.produs,
      cantitate: formatNumber(g.total) + unitLabel,
      detalii: g.detalii,
      culoare: g.culoare,
      marime: g.marime,
      sex: g.sex,
    });
  }
  for (const u of unmerged) {
    rows.push(u);
  }
  rows.forEach((row, idx) => (row.nr_crt = idx + 1));

  return rows;
}

// La fel ca buildShoppingList, dar pastreaza centrele separate (nu aduna
// cantitatile intre centre diferite) - folosit la cautarea "ce a cerut
// fiecare centru dintr-un anumit produs".
// requests: array de { center_id, items: [{produs, cantitate, detalii,
// culoare, marime, sex}, ...] }.
export function buildShoppingListByCenter(requests) {
  const groups = new Map();
  const unmerged = [];

  for (const r of requests) {
    for (const it of r.items) {
      const parsed = parseQuantity(it.cantitate);
      const attrs = pickAttrs(it);
      if (!parsed) {
        unmerged.push({ produs: it.produs, cantitate: it.cantitate, ...attrs, center_id: r.center_id });
        continue;
      }
      const key = normalizeProductKey(it.produs) + "||" + attrsKey(attrs) + "||" + r.center_id;
      const displayName = it.produs.trim();
      if (!groups.has(key)) {
        groups.set(key, { produs: displayName, ...attrs, center_id: r.center_id, total: 0, units: new Set() });
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
    rows.push({
      produs: g.produs,
      cantitate: formatNumber(g.total) + unitLabel,
      detalii: g.detalii,
      culoare: g.culoare,
      marime: g.marime,
      sex: g.sex,
      center_id: g.center_id,
    });
  }
  for (const u of unmerged) {
    rows.push(u);
  }

  return rows;
}
