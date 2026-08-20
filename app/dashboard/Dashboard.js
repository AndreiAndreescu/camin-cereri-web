"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

const ROLE_LABELS = {
  admin: "Admin",
  administrator_centru: "Administrator de Centru",
};

const STATUS_LABELS = {
  asteptare: "În așteptare",
  in_curs: "În curs de rezolvare",
  rezolvat: "Rezolvat",
  respins: "Respins",
};

const CAN_DECIDE = ["admin"];

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "A apărut o eroare.");
  return data;
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(str) {
  return String(str ?? "");
}

export default function Dashboard({ user }) {
  const router = useRouter();
  const canDecide = CAN_DECIDE.includes(user.role);
  const isAdmin = user.role === "admin";
  const userCenterIds = user.center_ids || [];

  const [centers, setCenters] = useState([]);
  const [requests, setRequests] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [shoppingByCenter, setShoppingByCenter] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [newReqProductFilter, setNewReqProductFilter] = useState("");
  const [editReqProductFilter, setEditReqProductFilter] = useState("");
  const [catalogProductFilter, setCatalogProductFilter] = useState("");

  const [filterCenter, setFilterCenter] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterUrgent, setFilterUrgent] = useState(false);

  const [reqCenter, setReqCenter] = useState("");
  const [reqUrgent, setReqUrgent] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState({}); // { [productId]: { cantitate, detalii } }
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingRequestId, setEditingRequestId] = useState(null);
  const [editReqCenter, setEditReqCenter] = useState("");
  const [editReqUrgent, setEditReqUrgent] = useState(false);
  const [editSelectedProducts, setEditSelectedProducts] = useState({});
  const [editLegacyItems, setEditLegacyItems] = useState([]); // produse care nu mai exista in catalog
  const [editRequestError, setEditRequestError] = useState("");
  const [savingEditRequest, setSavingEditRequest] = useState(false);

  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "administrator_centru",
    center_ids: [],
  });
  const [userError, setUserError] = useState("");
  const [userSuccess, setUserSuccess] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUser, setEditingUser] = useState({ full_name: "", role: "administrator_centru", center_ids: [], password: "" });
  const [editingUserError, setEditingUserError] = useState("");

  const [newCenterName, setNewCenterName] = useState("");
  const [centerError, setCenterError] = useState("");
  const [creatingCenter, setCreatingCenter] = useState(false);

  const [newProductName, setNewProductName] = useState("");
  const [productError, setProductError] = useState("");
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingProductName, setEditingProductName] = useState("");
  const [editingProductError, setEditingProductError] = useState("");

  const centerName = useCallback(
    (id) => centers.find((c) => c.id === Number(id))?.name || "—",
    [centers]
  );

  // Centrele pentru care userul curent are voie sa creeze o cerere: toate,
  // daca e admin, sau doar cele la care e asignat, daca e administrator de centru.
  const requestableCenters = useMemo(() => {
    if (user.role !== "administrator_centru") return centers;
    return centers.filter((c) => userCenterIds.includes(c.id));
  }, [centers, user.role, userCenterIds]);

  const loadRequests = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterCenter) params.set("center_id", filterCenter);
    if (filterStatus) params.set("status", filterStatus);
    if (filterUrgent) params.set("urgent", "1");
    const { requests } = await api("/api/requests?" + params.toString());
    setRequests(requests);
  }, [filterCenter, filterStatus, filterUrgent]);

  const loadShoppingList = useCallback(async () => {
    if (!isAdmin) return;
    const { items, byCenter } = await api("/api/shopping-list");
    setShoppingList(items);
    setShoppingByCenter(byCenter || []);
  }, [isAdmin]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    const { users } = await api("/api/users");
    setUsers(users);
  }, [isAdmin]);

  const loadProducts = useCallback(async () => {
    const { products } = await api("/api/products");
    setProducts(products);
  }, []);

  useEffect(() => {
    (async () => {
      const { centers } = await api("/api/centers");
      setCenters(centers);
    })();
  }, []);

  useEffect(() => {
    if (requestableCenters.length === 0) return;
    if (requestableCenters.some((c) => String(c.id) === reqCenter)) return;
    setReqCenter(String(requestableCenters[0].id));
  }, [requestableCenters, reqCenter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    loadShoppingList();
  }, [loadShoppingList]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function onLogout() {
    await api("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function onCreateUser(e) {
    e.preventDefault();
    setUserError("");
    setUserSuccess("");
    setCreatingUser(true);
    try {
      await api("/api/users", { method: "POST", body: JSON.stringify(newUser) });
      setUserSuccess(`Cont creat: ${newUser.email}`);
      setNewUser((u) => ({ ...u, email: "", password: "", full_name: "", center_ids: [] }));
      await loadUsers();
    } catch (err) {
      setUserError(err.message);
    } finally {
      setCreatingUser(false);
    }
  }

  async function onDeleteUser(id, label) {
    if (!confirm(`Ștergi contul „${label}"? Nu se mai poate loga după asta.`)) return;
    try {
      await api(`/api/users/${id}`, { method: "DELETE" });
      await loadUsers();
    } catch (err) {
      alert(err.message);
    }
  }

  function onStartEditUser(u) {
    setEditingUserId(u.id);
    setEditingUser({
      full_name: u.full_name,
      role: u.role,
      center_ids: u.center_ids || [],
      password: "",
    });
    setEditingUserError("");
  }

  function onCancelEditUser() {
    setEditingUserId(null);
    setEditingUserError("");
  }

  async function onSaveEditUser(id) {
    setEditingUserError("");
    try {
      const payload = {
        full_name: editingUser.full_name,
        role: editingUser.role,
        center_ids: editingUser.center_ids,
      };
      if (editingUser.password) payload.password = editingUser.password;
      const { user: updated } = await api(`/api/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setUsers((us) => us.map((u) => (u.id === id ? { ...u, ...updated } : u)));
      setEditingUserId(null);
    } catch (err) {
      setEditingUserError(err.message);
    }
  }

  async function onCreateCenter(e) {
    e.preventDefault();
    setCenterError("");
    setCreatingCenter(true);
    try {
      const { center } = await api("/api/centers", {
        method: "POST",
        body: JSON.stringify({ name: newCenterName }),
      });
      setCenters((cs) => [...cs, center].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCenterName("");
    } catch (err) {
      setCenterError(err.message);
    } finally {
      setCreatingCenter(false);
    }
  }

  async function onDeleteCenter(id, label) {
    if (!confirm(`Ștergi centrul „${label}"?`)) return;
    try {
      await api(`/api/centers/${id}`, { method: "DELETE" });
      setCenters((cs) => cs.filter((c) => c.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  async function onCreateProduct(e) {
    e.preventDefault();
    setProductError("");
    setCreatingProduct(true);
    try {
      const { product } = await api("/api/products", {
        method: "POST",
        body: JSON.stringify({ name: newProductName }),
      });
      setProducts((ps) => [...ps, product].sort((a, b) => a.name.localeCompare(b.name)));
      setNewProductName("");
    } catch (err) {
      setProductError(err.message);
    } finally {
      setCreatingProduct(false);
    }
  }

  async function onDeleteProduct(id, label) {
    if (!confirm(`Ștergi produsul „${label}" din catalog?`)) return;
    try {
      await api(`/api/products/${id}`, { method: "DELETE" });
      setProducts((ps) => ps.filter((p) => p.id !== id));
      setSelectedProducts((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
    } catch (err) {
      alert(err.message);
    }
  }

  function onStartEditProduct(p) {
    setEditingProductId(p.id);
    setEditingProductName(p.name);
    setEditingProductError("");
  }

  function onCancelEditProduct() {
    setEditingProductId(null);
    setEditingProductName("");
    setEditingProductError("");
  }

  async function onSaveEditProduct(id) {
    setEditingProductError("");
    try {
      const { product } = await api(`/api/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editingProductName }),
      });
      setProducts((ps) => ps.map((p) => (p.id === id ? product : p)).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingProductId(null);
      setEditingProductName("");
    } catch (err) {
      setEditingProductError(err.message);
    }
  }

  function toggleProduct(id, checked) {
    setSelectedProducts((s) => {
      const next = { ...s };
      if (checked) next[id] = next[id] ?? { cantitate: "", detalii: "", culoare: "", marime: "", sex: "" };
      else delete next[id];
      return next;
    });
  }

  function setProductQty(id, value) {
    setSelectedProducts((s) => ({ ...s, [id]: { ...(s[id] || {}), cantitate: value } }));
  }

  function setProductDetalii(id, value) {
    setSelectedProducts((s) => ({ ...s, [id]: { ...(s[id] || {}), detalii: value } }));
  }

  function setProductCuloare(id, value) {
    setSelectedProducts((s) => ({ ...s, [id]: { ...(s[id] || {}), culoare: value } }));
  }

  function setProductMarime(id, value) {
    setSelectedProducts((s) => ({ ...s, [id]: { ...(s[id] || {}), marime: value } }));
  }

  function setProductSex(id, value) {
    setSelectedProducts((s) => ({ ...s, [id]: { ...(s[id] || {}), sex: value } }));
  }

  async function onSubmitNewRequest(e) {
    e.preventDefault();
    setFormError("");

    const items = products
      .filter((p) => selectedProducts[p.id] !== undefined)
      .map((p) => ({
        produs: p.name,
        cantitate: String(selectedProducts[p.id]?.cantitate || "").trim(),
        detalii: String(selectedProducts[p.id]?.detalii || "").trim(),
        culoare: String(selectedProducts[p.id]?.culoare || "").trim(),
        marime: String(selectedProducts[p.id]?.marime || "").trim(),
        sex: String(selectedProducts[p.id]?.sex || "").trim(),
      }));

    if (items.length === 0) {
      setFormError("Bifează cel puțin un produs.");
      return;
    }
    if (items.some((it) => !it.cantitate)) {
      setFormError("Completează cantitatea pentru fiecare produs bifat.");
      return;
    }

    setSubmitting(true);
    const payload = { urgent: reqUrgent, items, center_id: reqCenter };

    try {
      await api("/api/requests", { method: "POST", body: JSON.stringify(payload) });
      setSelectedProducts({});
      setReqUrgent(false);
      await loadRequests();
      await loadShoppingList();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Pregateste formularul de editare pentru o cerere inca in asteptare:
  // potriveste fiecare produs din cerere cu catalogul curent (dupa nume). Cele
  // care nu se mai regasesc in catalog (produs redenumit/sters intre timp)
  // raman editabile separat, ca sa nu se piarda datele deja introduse.
  function onStartEditRequest(r) {
    const selected = {};
    const legacy = [];
    r.items.forEach((it, idx) => {
      const matched = products.find((p) => p.name === it.produs);
      if (matched) {
        selected[matched.id] = {
          cantitate: it.cantitate,
          detalii: it.detalii,
          culoare: it.culoare,
          marime: it.marime,
          sex: it.sex,
        };
      } else {
        legacy.push({
          key: `legacy-${r.id}-${idx}`,
          produs: it.produs,
          cantitate: it.cantitate,
          detalii: it.detalii,
          culoare: it.culoare,
          marime: it.marime,
          sex: it.sex,
        });
      }
    });
    setEditingRequestId(r.id);
    setEditReqCenter(String(r.center_id));
    setEditReqUrgent(r.urgent);
    setEditSelectedProducts(selected);
    setEditLegacyItems(legacy);
    setEditRequestError("");
  }

  function onCancelEditRequest() {
    setEditingRequestId(null);
    setEditRequestError("");
  }

  function editToggleProduct(id, checked) {
    setEditSelectedProducts((s) => {
      const next = { ...s };
      if (checked) next[id] = next[id] ?? { cantitate: "", detalii: "", culoare: "", marime: "", sex: "" };
      else delete next[id];
      return next;
    });
  }

  function editSetProductField(id, field, value) {
    setEditSelectedProducts((s) => ({ ...s, [id]: { ...(s[id] || {}), [field]: value } }));
  }

  function editUpdateLegacyItem(key, field, value) {
    setEditLegacyItems((items) => items.map((it) => (it.key === key ? { ...it, [field]: value } : it)));
  }

  function editRemoveLegacyItem(key) {
    setEditLegacyItems((items) => items.filter((it) => it.key !== key));
  }

  async function onSaveEditRequest(id) {
    setEditRequestError("");

    const catalogItems = products
      .filter((p) => editSelectedProducts[p.id] !== undefined)
      .map((p) => ({
        produs: p.name,
        cantitate: String(editSelectedProducts[p.id]?.cantitate || "").trim(),
        detalii: String(editSelectedProducts[p.id]?.detalii || "").trim(),
        culoare: String(editSelectedProducts[p.id]?.culoare || "").trim(),
        marime: String(editSelectedProducts[p.id]?.marime || "").trim(),
        sex: String(editSelectedProducts[p.id]?.sex || "").trim(),
      }));
    const legacyItemsPayload = editLegacyItems.map((it) => ({
      produs: it.produs,
      cantitate: String(it.cantitate || "").trim(),
      detalii: String(it.detalii || "").trim(),
      culoare: String(it.culoare || "").trim(),
      marime: String(it.marime || "").trim(),
      sex: String(it.sex || "").trim(),
    }));
    const items = [...catalogItems, ...legacyItemsPayload];

    if (items.length === 0) {
      setEditRequestError("Bifează sau păstrează cel puțin un produs.");
      return;
    }
    if (items.some((it) => !it.cantitate)) {
      setEditRequestError("Completează cantitatea pentru fiecare produs.");
      return;
    }

    setSavingEditRequest(true);
    try {
      await api(`/api/requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ urgent: editReqUrgent, items, center_id: editReqCenter }),
      });
      setEditingRequestId(null);
      await loadRequests();
      await loadShoppingList();
    } catch (err) {
      setEditRequestError(err.message);
    } finally {
      setSavingEditRequest(false);
    }
  }

  async function decide(id, decision) {
    try {
      await api(`/api/requests/${id}/decide`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      await loadRequests();
      await loadShoppingList();
    } catch (err) {
      alert(err.message);
    }
  }

  async function resolve(id) {
    try {
      await api(`/api/requests/${id}/resolve`, { method: "POST" });
      await loadRequests();
      await loadShoppingList();
    } catch (err) {
      alert(err.message);
    }
  }

  async function deleteRequest(id) {
    if (!confirm("Ștergi acest referat de necesitate din listă? Nu se mai poate recupera.")) return;
    try {
      await api(`/api/requests/${id}`, { method: "DELETE" });
      await loadRequests();
    } catch (err) {
      alert(err.message);
    }
  }

  // Deschide o fereastra noua, cu doar continutul unei singure cereri, gata
  // de printat (Ctrl+P se deschide automat). Disponibil pentru admin si
  // administrator de centru, la orice cerere.
  function printRequest(r) {
    const rowsHtml = r.items
      .map(
        (it) =>
          `<tr><td>${it.nr_crt}</td><td>${escapeHtml(it.produs)}</td><td>${escapeHtml(
            it.cantitate
          )}</td><td>${escapeHtml(it.culoare)}</td><td>${escapeHtml(it.marime)}</td><td>${escapeHtml(
            it.sex
          )}</td><td>${escapeHtml(it.detalii)}</td></tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="ro"><head><meta charset="utf-8"><title>Referat de Necesitate #${r.id}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a2e; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  p { font-size: 13px; color: #555; margin: 2px 0 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; font-size: 13px; }
  th { text-transform: uppercase; font-size: 11px; color: #666; }
</style>
</head><body>
  <h1>Referat de Necesitate #${r.id} — ${escapeHtml(centerName(r.center_id))}${r.urgent ? " (URGENT)" : ""}</h1>
  <p>Status: ${STATUS_LABELS[r.status] || r.status} · Creat de ${escapeHtml(r.created_by_name)} pe ${fmtDate(
      r.created_at
    )}</p>
  <table>
    <thead><tr><th>Nr. crt.</th><th>Produs</th><th>Cantitate</th><th>Culoare</th><th>Mărime</th><th>Sex</th><th>Detalii</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body></html>`;

    const win = window.open("", "_blank", "width=700,height=800");
    if (!win) {
      alert("Browserul a blocat fereastra de printare. Permite pop-up-uri pentru acest site și încearcă din nou.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  // Descarca lista "De luat" ca fisier .csv, care se deschide direct in Excel
  // (cu diacritice corecte si separator ";", potrivit pentru Excel in limba romana).
  function exportShoppingListCSV() {
    const header = ["Nr. crt.", "Produs", "Cantitate", "Culoare", "Mărime", "Sex", "Detalii"];
    const rows = shoppingList.map((it) => [
      it.nr_crt,
      it.produs,
      it.cantitate,
      it.culoare || "",
      it.marime || "",
      it.sex || "",
      it.detalii || "",
    ]);
    const csvLines = [header, ...rows].map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
    );
    const csvContent = "\uFEFF" + csvLines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `de-luat-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Deschide fereastra de printare a browserului, arata doar lista "De luat"
  // (restul paginii e ascuns prin regulile @media print din globals.css).
  function printShoppingList() {
    window.print();
  }

  return (
    <div id="app-screen">
      <header className="topbar">
        <div className="brand">Cămin Romantic — Referate de Necesitate</div>
        <div className="who">
          <span>{user.full_name}</span>
          <span className="badge-role">{ROLE_LABELS[user.role] || user.role}</span>
          <button className="link-btn" onClick={onLogout}>
            Ieși din cont
          </button>
        </div>
      </header>

      <main>
        <div className="page-hero">
          <h1>Referate de Necesitate</h1>
          <p className="page-subtitle">Gestionează referatele de necesitate pentru toate centrele</p>
        </div>

        <section className="panel">
          <div className="panel-header">
            <h2>Referat de Necesitate nou</h2>
          </div>
          <form className="new-request" onSubmit={onSubmitNewRequest}>
            <div className="row">
              <div className="field">
                <label>Centru</label>
                <select value={reqCenter} onChange={(e) => setReqCenter(e.target.value)}>
                  {requestableCenters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field urgent-field">
                <label>
                  <input
                    type="checkbox"
                    checked={reqUrgent}
                    onChange={(e) => setReqUrgent(e.target.checked)}
                  />{" "}
                  Urgent
                </label>
              </div>
            </div>

            {products.length === 0 ? (
              <p className="muted-note">
                Nu există niciun produs în catalog încă. {isAdmin ? 'Adaugă produse mai jos, în panoul "Produse".' : "Cere administratorului să adauge produse în catalog."}
              </p>
            ) : (
              <>
              <div className="field" style={{ marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="Caută un produs…"
                  value={newReqProductFilter}
                  onChange={(e) => setNewReqProductFilter(e.target.value)}
                />
              </div>
              <table className="items-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Produs</th>
                    <th>Cantitate</th>
                    <th>Culoare (opțional)</th>
                    <th>Mărime (opțional)</th>
                    <th>Sex (opțional)</th>
                    <th>Detalii (opțional)</th>
                  </tr>
                </thead>
                <tbody>
                  {products
                    .filter((p) => p.name.toLowerCase().includes(newReqProductFilter.trim().toLowerCase()))
                    .map((p) => {
                    const checked = selectedProducts[p.id] !== undefined;
                    return (
                      <tr
                        key={p.id}
                        className={`product-row ${checked ? "product-row-checked" : ""}`}
                        onClick={(e) => {
                          if (["INPUT", "SELECT", "OPTION"].includes(e.target.tagName)) return;
                          toggleProduct(p.id, !checked);
                        }}
                      >
                        <td>
                          <input
                            type="checkbox"
                            className="product-checkbox"
                            checked={checked}
                            onChange={(e) => toggleProduct(p.id, e.target.checked)}
                          />
                        </td>
                        <td>{p.name}</td>
                        <td>
                          <input
                            type="text"
                            placeholder="ex: 5 buc"
                            disabled={!checked}
                            value={selectedProducts[p.id]?.cantitate || ""}
                            onChange={(e) => setProductQty(p.id, e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="ex: albastru"
                            disabled={!checked}
                            value={selectedProducts[p.id]?.culoare || ""}
                            onChange={(e) => setProductCuloare(p.id, e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="ex: XL"
                            disabled={!checked}
                            value={selectedProducts[p.id]?.marime || ""}
                            onChange={(e) => setProductMarime(p.id, e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            disabled={!checked}
                            value={selectedProducts[p.id]?.sex || ""}
                            onChange={(e) => setProductSex(p.id, e.target.value)}
                          >
                            <option value=""></option>
                            <option value="Masculin">Masculin</option>
                            <option value="Feminin">Feminin</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="ex: orice observație"
                            disabled={!checked}
                            value={selectedProducts[p.id]?.detalii || ""}
                            onChange={(e) => setProductDetalii(p.id, e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </>
            )}

            <div style={{ marginTop: 14 }}>
              <button type="submit" className="primary-btn" disabled={submitting || products.length === 0}>
                {submitting ? "Se trimite…" : "Trimite referatul"}
              </button>
            </div>
            <p className="error">{formError}</p>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Referate de Necesitate</h2>
            <div className="filters">
              <select value={filterCenter} onChange={(e) => setFilterCenter(e.target.value)}>
                <option value="">Toate centrele</option>
                {requestableCenters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Toate statusurile</option>
                <option value="asteptare">În așteptare</option>
                <option value="in_curs">În curs de rezolvare</option>
                <option value="rezolvat">Rezolvat</option>
                <option value="respins">Respins</option>
              </select>
              <label className="urgent-filter">
                <input
                  type="checkbox"
                  checked={filterUrgent}
                  onChange={(e) => setFilterUrgent(e.target.checked)}
                />{" "}
                Doar urgente
              </label>
            </div>
          </div>

          <div className="requests-list">
            {requests.length === 0 && <p className="muted-note">Nu există referate de necesitate de afișat.</p>}
            {requests.map((r) =>
              editingRequestId === r.id ? (
                <div key={r.id} className="request-card">
                  <div className="request-top">
                    <div className="request-title">Editare referat de necesitate #{r.id}</div>
                  </div>
                  <div className="row">
                    <div className="field">
                      <label>Centru</label>
                      <select value={editReqCenter} onChange={(e) => setEditReqCenter(e.target.value)}>
                        {requestableCenters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field urgent-field">
                      <label>
                        <input
                          type="checkbox"
                          checked={editReqUrgent}
                          onChange={(e) => setEditReqUrgent(e.target.checked)}
                        />{" "}
                        Urgent
                      </label>
                    </div>
                  </div>

                  {editLegacyItems.length > 0 && (
                    <>
                      <p className="muted-note" style={{ marginBottom: 6 }}>
                        Produse care nu mai sunt în catalog (au fost redenumite sau șterse între timp) —
                        rămân în referat așa cum au fost scrise, sau le poți elimina:
                      </p>
                      <table className="items-table" style={{ marginBottom: 16 }}>
                        <thead>
                          <tr>
                            <th>Produs</th>
                            <th>Cantitate</th>
                            <th>Culoare</th>
                            <th>Mărime</th>
                            <th>Sex</th>
                            <th>Detalii</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {editLegacyItems.map((it) => (
                            <tr key={it.key}>
                              <td>{escapeHtml(it.produs)}</td>
                              <td>
                                <input
                                  type="text"
                                  value={it.cantitate}
                                  onChange={(e) => editUpdateLegacyItem(it.key, "cantitate", e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={it.culoare}
                                  onChange={(e) => editUpdateLegacyItem(it.key, "culoare", e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={it.marime}
                                  onChange={(e) => editUpdateLegacyItem(it.key, "marime", e.target.value)}
                                />
                              </td>
                              <td>
                                <select
                                  value={it.sex}
                                  onChange={(e) => editUpdateLegacyItem(it.key, "sex", e.target.value)}
                                >
                                  <option value=""></option>
                                  <option value="Masculin">Masculin</option>
                                  <option value="Feminin">Feminin</option>
                                </select>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={it.detalii}
                                  onChange={(e) => editUpdateLegacyItem(it.key, "detalii", e.target.value)}
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="remove-item-btn"
                                  onClick={() => editRemoveLegacyItem(it.key)}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}

                  <div className="field" style={{ marginBottom: 10 }}>
                    <input
                      type="text"
                      placeholder="Caută un produs…"
                      value={editReqProductFilter}
                      onChange={(e) => setEditReqProductFilter(e.target.value)}
                    />
                  </div>
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Produs</th>
                        <th>Cantitate</th>
                        <th>Culoare</th>
                        <th>Mărime</th>
                        <th>Sex</th>
                        <th>Detalii</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products
                        .filter((p) => p.name.toLowerCase().includes(editReqProductFilter.trim().toLowerCase()))
                        .map((p) => {
                        const checked = editSelectedProducts[p.id] !== undefined;
                        return (
                          <tr
                            key={p.id}
                            className={`product-row ${checked ? "product-row-checked" : ""}`}
                            onClick={(e) => {
                              if (["INPUT", "SELECT", "OPTION"].includes(e.target.tagName)) return;
                              editToggleProduct(p.id, !checked);
                            }}
                          >
                            <td>
                              <input
                                type="checkbox"
                                className="product-checkbox"
                                checked={checked}
                                onChange={(e) => editToggleProduct(p.id, e.target.checked)}
                              />
                            </td>
                            <td>{p.name}</td>
                            <td>
                              <input
                                type="text"
                                placeholder="ex: 5 buc"
                                disabled={!checked}
                                value={editSelectedProducts[p.id]?.cantitate || ""}
                                onChange={(e) => editSetProductField(p.id, "cantitate", e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                disabled={!checked}
                                value={editSelectedProducts[p.id]?.culoare || ""}
                                onChange={(e) => editSetProductField(p.id, "culoare", e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                disabled={!checked}
                                value={editSelectedProducts[p.id]?.marime || ""}
                                onChange={(e) => editSetProductField(p.id, "marime", e.target.value)}
                              />
                            </td>
                            <td>
                              <select
                                disabled={!checked}
                                value={editSelectedProducts[p.id]?.sex || ""}
                                onChange={(e) => editSetProductField(p.id, "sex", e.target.value)}
                              >
                                <option value=""></option>
                                <option value="Masculin">Masculin</option>
                                <option value="Feminin">Feminin</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="text"
                                disabled={!checked}
                                value={editSelectedProducts[p.id]?.detalii || ""}
                                onChange={(e) => editSetProductField(p.id, "detalii", e.target.value)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="request-actions" style={{ marginTop: 14 }}>
                    <button
                      className="action-btn resolve-btn"
                      onClick={() => onSaveEditRequest(r.id)}
                      disabled={savingEditRequest}
                    >
                      {savingEditRequest ? "Se salvează…" : "Salvează"}
                    </button>
                    <button className="secondary-btn" type="button" onClick={onCancelEditRequest}>
                      Anulează
                    </button>
                  </div>
                  {editRequestError && <p className="error">{editRequestError}</p>}
                </div>
              ) : (
                <div key={r.id} className={`request-card ${r.urgent ? "urgent" : ""}`}>
                  <div className="request-top">
                    <div>
                      <div className="request-title">
                        Referat de Necesitate — {centerName(r.center_id)}{" "}
                        {r.urgent && <span className="urgent-tag">URGENT</span>}
                      </div>
                      <div className="request-meta">#{r.id} · Produse schimbate/cumpărate</div>
                    </div>
                    <span className={`status-pill status-${r.status}`}>{STATUS_LABELS[r.status]}</span>
                  </div>

                  <div className="request-body">
                    <table className="mini-table">
                      <thead>
                        <tr>
                          <th>Nr. crt.</th>
                          <th>Produs</th>
                          <th>Cantitate</th>
                          <th>Culoare</th>
                          <th>Mărime</th>
                          <th>Sex</th>
                          <th>Detalii</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.items.map((it) => (
                          <tr key={it.nr_crt}>
                            <td>{it.nr_crt}</td>
                            <td>{escapeHtml(it.produs)}</td>
                            <td>{escapeHtml(it.cantitate)}</td>
                            <td>{escapeHtml(it.culoare)}</td>
                            <td>{escapeHtml(it.marime)}</td>
                            <td>{escapeHtml(it.sex)}</td>
                            <td>{escapeHtml(it.detalii)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="timeline">
                    Creat de {r.created_by_name} pe {fmtDate(r.created_at)}
                  </div>
                  {r.decided_at && (
                    <div className="timeline">
                      {r.status === "respins" ? "Respins" : "Acceptat"} de {r.decided_by_name} pe{" "}
                      {fmtDate(r.decided_at)}
                    </div>
                  )}
                  {r.resolved_at && (
                    <div className="timeline">
                      Rezolvat de {r.resolved_by_name} pe {fmtDate(r.resolved_at)}
                    </div>
                  )}

                  {canDecide && r.status === "asteptare" && (
                    <div className="request-actions">
                      <button className="action-btn accept-btn" onClick={() => decide(r.id, "accept")}>
                        Acceptă
                      </button>
                      <button className="action-btn reject-btn" onClick={() => decide(r.id, "reject")}>
                        Respinge
                      </button>
                    </div>
                  )}
                  {canDecide && r.status === "in_curs" && (
                    <div className="request-actions">
                      <button className="action-btn resolve-btn" onClick={() => resolve(r.id)}>
                        Marchează rezolvat
                      </button>
                    </div>
                  )}
                  <div className="request-actions">
                    {r.status === "asteptare" && (
                      <button className="secondary-btn" type="button" onClick={() => onStartEditRequest(r)}>
                        Editează
                      </button>
                    )}
                    <button className="secondary-btn" type="button" onClick={() => printRequest(r)}>
                      Printează
                    </button>
                    {(isAdmin
                      ? r.status === "rezolvat" || r.status === "respins"
                      : user.role === "administrator_centru") && (
                      <button className="action-btn reject-btn" onClick={() => deleteRequest(r.id)}>
                        Șterge referatul
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {isAdmin && (
          <section className="panel">
            <div className="panel-header">
              <h2>De luat (referate acceptate)</h2>
              <div className="filters no-print">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={exportShoppingListCSV}
                  disabled={shoppingList.length === 0}
                >
                  Descarcă (Excel)
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={printShoppingList}
                  disabled={shoppingList.length === 0}
                >
                  Printează
                </button>
              </div>
            </div>
            <div id="printable-shopping-list">
              <h3 className="print-only-title">Listă „De luat" — {fmtDate(new Date().toISOString())}</h3>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Nr. crt.</th>
                    <th>Produs</th>
                    <th>Cantitate</th>
                    <th>Culoare</th>
                    <th>Mărime</th>
                    <th>Sex</th>
                    <th>Detalii</th>
                  </tr>
                </thead>
                <tbody>
                  {shoppingList.map((it) => (
                    <tr key={it.nr_crt}>
                      <td>{it.nr_crt}</td>
                      <td>{escapeHtml(it.produs)}</td>
                      <td>{escapeHtml(it.cantitate)}</td>
                      <td>{escapeHtml(it.culoare)}</td>
                      <td>{escapeHtml(it.marime)}</td>
                      <td>{escapeHtml(it.sex)}</td>
                      <td>{escapeHtml(it.detalii)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {shoppingList.length === 0 && <p className="muted-note">Nimic de luat momentan.</p>}
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="panel">
            <div className="panel-header">
              <h2>Caută produs pe centre</h2>
            </div>
            <p className="muted-note" style={{ marginTop: -8, marginBottom: 14 }}>
              Scrie numele (sau o parte din nume) unui produs ca să vezi ce centru l-a cerut și în ce
              cantitate, printre referatele acceptate momentan.
            </p>
            <div className="field" style={{ marginBottom: 14 }}>
              <input
                type="text"
                placeholder="ex: detergent"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
            {productSearch.trim() === "" ? (
              <p className="muted-note">Scrie ceva mai sus ca să vezi rezultate.</p>
            ) : (
              (() => {
                const q = productSearch.trim().toLowerCase();
                const results = shoppingByCenter.filter((it) => it.produs.toLowerCase().includes(q));
                if (results.length === 0) {
                  return <p className="muted-note">Niciun rezultat pentru „{productSearch}".</p>;
                }
                return (
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Centru</th>
                        <th>Produs</th>
                        <th>Cantitate</th>
                        <th>Culoare</th>
                        <th>Mărime</th>
                        <th>Sex</th>
                        <th>Detalii</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((it, idx) => (
                        <tr key={idx}>
                          <td>{centerName(it.center_id)}</td>
                          <td>{escapeHtml(it.produs)}</td>
                          <td>{escapeHtml(it.cantitate)}</td>
                          <td>{escapeHtml(it.culoare)}</td>
                          <td>{escapeHtml(it.marime)}</td>
                          <td>{escapeHtml(it.sex)}</td>
                          <td>{escapeHtml(it.detalii)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()
            )}
          </section>
        )}

        <section className="panel">
          <div className="panel-header">
            <h2>Produse</h2>
          </div>
          <p className="muted-note" style={{ marginTop: -8, marginBottom: 14 }}>
            Catalogul din care se poate alege la un referat de necesitate nou. Admin și administrator de centru pot
            adăuga, edita și șterge produse. Ștergerea nu afectează referatele deja trimise.
          </p>

          <div className="field" style={{ marginBottom: 14 }}>
            <input
              type="text"
              placeholder="Caută un produs…"
              value={catalogProductFilter}
              onChange={(e) => setCatalogProductFilter(e.target.value)}
            />
          </div>

          <div className="requests-list" style={{ marginBottom: 18 }}>
            {products
              .filter((p) => p.name.toLowerCase().includes(catalogProductFilter.trim().toLowerCase()))
              .map((p) => (
              <div key={p.id} className="request-card">
                {editingProductId === p.id ? (
                  <div className="row" style={{ marginBottom: 0, alignItems: "flex-end" }}>
                    <div className="field" style={{ flex: 1 }}>
                      <label>Nume produs</label>
                      <input
                        type="text"
                        value={editingProductName}
                        onChange={(e) => setEditingProductName(e.target.value)}
                      />
                    </div>
                    <button className="action-btn resolve-btn" onClick={() => onSaveEditProduct(p.id)}>
                      Salvează
                    </button>
                    <button className="secondary-btn" type="button" onClick={onCancelEditProduct}>
                      Anulează
                    </button>
                  </div>
                ) : (
                  <div className="request-top">
                    <div className="request-title">{p.name}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="secondary-btn" type="button" onClick={() => onStartEditProduct(p)}>
                        Editează
                      </button>
                      <button className="action-btn reject-btn" onClick={() => onDeleteProduct(p.id, p.name)}>
                        Șterge
                      </button>
                    </div>
                  </div>
                )}
                {editingProductId === p.id && editingProductError && (
                  <p className="error">{editingProductError}</p>
                )}
              </div>
            ))}
            {products.length === 0 && <p className="muted-note">Niciun produs definit încă.</p>}
            {products.length > 0 &&
              products.filter((p) => p.name.toLowerCase().includes(catalogProductFilter.trim().toLowerCase())).length === 0 && (
                <p className="muted-note">Niciun produs găsit pentru „{catalogProductFilter}".</p>
              )}
          </div>

          <form className="new-request" onSubmit={onCreateProduct}>
            <div className="row">
              <div className="field">
                <label>Nume produs nou</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Detergent"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="primary-btn" disabled={creatingProduct}>
              {creatingProduct ? "Se adaugă…" : "Adaugă produs"}
            </button>
            {productError && <p className="error">{productError}</p>}
          </form>
        </section>

        {isAdmin && (
          <section className="panel">
            <div className="panel-header">
              <h2>Centre</h2>
            </div>

            <div className="requests-list" style={{ marginBottom: 18 }}>
              {centers.map((c) => (
                <div key={c.id} className="request-card">
                  <div className="request-top">
                    <div className="request-title">{c.name}</div>
                    <button className="action-btn reject-btn" onClick={() => onDeleteCenter(c.id, c.name)}>
                      Șterge
                    </button>
                  </div>
                </div>
              ))}
              {centers.length === 0 && <p className="muted-note">Se încarcă…</p>}
            </div>

            <form className="new-request" onSubmit={onCreateCenter}>
              <div className="row">
                <div className="field">
                  <label>Nume centru nou</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: LMP Centru Nou"
                    value={newCenterName}
                    onChange={(e) => setNewCenterName(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="primary-btn" disabled={creatingCenter}>
                {creatingCenter ? "Se adaugă…" : "Adaugă centru"}
              </button>
              {centerError && <p className="error">{centerError}</p>}
            </form>
          </section>
        )}

        {isAdmin && (
          <section className="panel">
            <div className="panel-header">
              <h2>Utilizatori</h2>
            </div>

            <div className="requests-list" style={{ marginBottom: 18 }}>
              {users.map((u) => (
                <div key={u.id} className="request-card">
                  {editingUserId === u.id ? (
                    <div>
                      <div className="row">
                        <div className="field">
                          <label>Nume complet</label>
                          <input
                            type="text"
                            value={editingUser.full_name}
                            onChange={(e) => setEditingUser((v) => ({ ...v, full_name: e.target.value }))}
                          />
                        </div>
                        <div className="field">
                          <label>Rol</label>
                          <select
                            value={editingUser.role}
                            onChange={(e) => setEditingUser((v) => ({ ...v, role: e.target.value }))}
                          >
                            <option value="administrator_centru">Administrator de Centru</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div className="field">
                          <label>Parolă nouă (opțional)</label>
                          <input
                            type="text"
                            placeholder="lasă gol dacă nu o schimbi"
                            minLength={6}
                            value={editingUser.password}
                            onChange={(e) => setEditingUser((v) => ({ ...v, password: e.target.value }))}
                          />
                        </div>
                      </div>
                      {editingUser.role === "administrator_centru" && (
                        <div className="field" style={{ marginTop: 10 }}>
                          <label>Centre (poate avea mai multe)</label>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                              gap: "6px 14px",
                              marginTop: 6,
                            }}
                          >
                            {centers.map((c) => (
                              <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                                <input
                                  type="checkbox"
                                  checked={editingUser.center_ids.includes(c.id)}
                                  onChange={(e) => {
                                    setEditingUser((v) => ({
                                      ...v,
                                      center_ids: e.target.checked
                                        ? [...v.center_ids, c.id]
                                        : v.center_ids.filter((id) => id !== c.id),
                                    }));
                                  }}
                                />
                                {c.name}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                        <button className="action-btn resolve-btn" onClick={() => onSaveEditUser(u.id)}>
                          Salvează
                        </button>
                        <button className="secondary-btn" type="button" onClick={onCancelEditUser}>
                          Anulează
                        </button>
                      </div>
                      {editingUserError && <p className="error">{editingUserError}</p>}
                    </div>
                  ) : (
                    <div className="request-top">
                      <div>
                        <div className="request-title">{u.full_name}</div>
                        <div className="request-meta">
                          {u.email} · {ROLE_LABELS[u.role]}
                          {u.center_ids && u.center_ids.length > 0
                            ? ` · ${u.center_ids.map(centerName).join(", ")}`
                            : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="secondary-btn" type="button" onClick={() => onStartEditUser(u)}>
                          Editează
                        </button>
                        {u.id !== user.id && (
                          <button className="action-btn reject-btn" onClick={() => onDeleteUser(u.id, u.full_name)}>
                            Șterge
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {users.length === 0 && <p className="muted-note">Se încarcă…</p>}
            </div>

            <form className="new-request" onSubmit={onCreateUser}>
              <div className="row">
                <div className="field">
                  <label>Nume complet</label>
                  <input
                    type="text"
                    required
                    value={newUser.full_name}
                    onChange={(e) => setNewUser((u) => ({ ...u, full_name: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Parolă</label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    placeholder="minim 6 caractere"
                    value={newUser.password}
                    onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                  />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Rol</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
                  >
                    <option value="administrator_centru">Administrator de Centru</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              {newUser.role === "administrator_centru" && (
                <div className="field" style={{ marginTop: 10 }}>
                  <label>Centre (poate avea mai multe)</label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: "6px 14px",
                      marginTop: 6,
                    }}
                  >
                    {centers.map((c) => (
                      <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                        <input
                          type="checkbox"
                          checked={newUser.center_ids.includes(c.id)}
                          onChange={(e) => {
                            setNewUser((u) => ({
                              ...u,
                              center_ids: e.target.checked
                                ? [...u.center_ids, c.id]
                                : u.center_ids.filter((id) => id !== c.id),
                            }));
                          }}
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <button type="submit" className="primary-btn" style={{ marginTop: 14 }} disabled={creatingUser}>
                {creatingUser ? "Se creează…" : "Creează cont"}
              </button>
              {userError && <p className="error">{userError}</p>}
              {userSuccess && <p style={{ color: "var(--done)", fontSize: 13, fontWeight: 500 }}>{userSuccess}</p>}
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
