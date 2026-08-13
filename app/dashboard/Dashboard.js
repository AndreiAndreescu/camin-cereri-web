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
  const [products, setProducts] = useState([]);

  const [filterCenter, setFilterCenter] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterUrgent, setFilterUrgent] = useState(false);

  const [reqCenter, setReqCenter] = useState("");
  const [reqUrgent, setReqUrgent] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState({}); // { [productId]: { cantitate, detalii } }
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const [newCenterName, setNewCenterName] = useState("");
  const [centerError, setCenterError] = useState("");
  const [creatingCenter, setCreatingCenter] = useState(false);

  const [newProductName, setNewProductName] = useState("");
  const [productError, setProductError] = useState("");
  const [creatingProduct, setCreatingProduct] = useState(false);

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
    const { items } = await api("/api/shopping-list");
    setShoppingList(items);
  }, []);

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

  function toggleProduct(id, checked) {
    setSelectedProducts((s) => {
      const next = { ...s };
      if (checked) next[id] = next[id] ?? { cantitate: "", detalii: "" };
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

  async function onSubmitNewRequest(e) {
    e.preventDefault();
    setFormError("");

    const items = products
      .filter((p) => selectedProducts[p.id] !== undefined)
      .map((p) => ({
        produs: p.name,
        cantitate: String(selectedProducts[p.id]?.cantitate || "").trim(),
        detalii: String(selectedProducts[p.id]?.detalii || "").trim(),
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
    if (!confirm("Ștergi această cerere din listă? Nu se mai poate recupera.")) return;
    try {
      await api(`/api/requests/${id}`, { method: "DELETE" });
      await loadRequests();
    } catch (err) {
      alert(err.message);
    }
  }

  // Descarca lista "De luat" ca fisier .csv, care se deschide direct in Excel
  // (cu diacritice corecte si separator ";", potrivit pentru Excel in limba romana).
  function exportShoppingListCSV() {
    const header = ["Nr. crt.", "Produs", "Cantitate", "Detalii"];
    const rows = shoppingList.map((it) => [it.nr_crt, it.produs, it.cantitate, it.detalii || ""]);
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
        <div className="brand">Cămin Romantic — Cereri</div>
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
          <h1>Cereri produse</h1>
          <p className="page-subtitle">Gestionează cererile de produse pentru toate centrele</p>
        </div>

        <section className="panel">
          <div className="panel-header">
            <h2>Cerere nouă</h2>
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
              <table className="items-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Produs</th>
                    <th>Cantitate</th>
                    <th>Detalii (opțional)</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const checked = selectedProducts[p.id] !== undefined;
                    return (
                      <tr key={p.id}>
                        <td>
                          <input
                            type="checkbox"
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
                            placeholder="ex: culoare albastră"
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
            )}

            <div style={{ marginTop: 14 }}>
              <button type="submit" className="primary-btn" disabled={submitting || products.length === 0}>
                {submitting ? "Se trimite…" : "Trimite cererea"}
              </button>
            </div>
            <p className="error">{formError}</p>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Cereri</h2>
            <div className="filters">
              <select value={filterCenter} onChange={(e) => setFilterCenter(e.target.value)}>
                <option value="">Toate centrele</option>
                {centers.map((c) => (
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
            {requests.length === 0 && <p className="muted-note">Nu există cereri de afișat.</p>}
            {requests.map((r) => (
              <div key={r.id} className={`request-card ${r.urgent ? "urgent" : ""}`}>
                <div className="request-top">
                  <div>
                    <div className="request-title">
                      Produse — {centerName(r.center_id)}{" "}
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
                        <th>Detalii</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.items.map((it) => (
                        <tr key={it.nr_crt}>
                          <td>{it.nr_crt}</td>
                          <td>{escapeHtml(it.produs)}</td>
                          <td>{escapeHtml(it.cantitate)}</td>
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
                {isAdmin && (r.status === "rezolvat" || r.status === "respins") && (
                  <div className="request-actions">
                    <button className="action-btn reject-btn" onClick={() => deleteRequest(r.id)}>
                      Șterge cererea
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>De luat (cereri acceptate)</h2>
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
                  <th>Detalii</th>
                </tr>
              </thead>
              <tbody>
                {shoppingList.map((it) => (
                  <tr key={it.nr_crt}>
                    <td>{it.nr_crt}</td>
                    <td>{escapeHtml(it.produs)}</td>
                    <td>{escapeHtml(it.cantitate)}</td>
                    <td>{escapeHtml(it.detalii)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shoppingList.length === 0 && <p className="muted-note">Nimic de luat momentan.</p>}
          </div>
        </section>

        {isAdmin && (
          <section className="panel">
            <div className="panel-header">
              <h2>Produse</h2>
            </div>
            <p className="muted-note" style={{ marginTop: -8, marginBottom: 14 }}>
              Catalogul din care se poate alege la o cerere nouă. Ștergerea unui produs de aici nu
              afectează cererile deja trimise.
            </p>

            <div className="requests-list" style={{ marginBottom: 18 }}>
              {products.map((p) => (
                <div key={p.id} className="request-card">
                  <div className="request-top">
                    <div className="request-title">{p.name}</div>
                    <button className="action-btn reject-btn" onClick={() => onDeleteProduct(p.id, p.name)}>
                      Șterge
                    </button>
                  </div>
                </div>
              ))}
              {products.length === 0 && <p className="muted-note">Niciun produs definit încă.</p>}
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
        )}

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
                    {u.id !== user.id && (
                      <button className="action-btn reject-btn" onClick={() => onDeleteUser(u.id, u.full_name)}>
                        Șterge
                      </button>
                    )}
                  </div>
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
