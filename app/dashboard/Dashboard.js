"use client";

import { useEffect, useState, useCallback } from "react";
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

  const [centers, setCenters] = useState([]);
  const [requests, setRequests] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);

  const [filterCenter, setFilterCenter] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterUrgent, setFilterUrgent] = useState(false);

  const [reqCenter, setReqCenter] = useState("");
  const [reqUrgent, setReqUrgent] = useState(false);
  const [items, setItems] = useState([{ produs: "", cantitate: "" }]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "administrator_centru",
    center_id: "",
  });
  const [userError, setUserError] = useState("");
  const [userSuccess, setUserSuccess] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const isAdmin = user.role === "admin";

  const [aliases, setAliases] = useState([]);
  const [newAlias, setNewAlias] = useState({ alias: "", canonical: "" });
  const [aliasError, setAliasError] = useState("");
  const [creatingAlias, setCreatingAlias] = useState(false);

  const centerName = useCallback(
    (id) => centers.find((c) => c.id === Number(id))?.name || "—",
    [centers]
  );

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

  const loadAliases = useCallback(async () => {
    if (!isAdmin) return;
    const { aliases } = await api("/api/product-aliases");
    setAliases(aliases);
  }, [isAdmin]);

  useEffect(() => {
    (async () => {
      const { centers } = await api("/api/centers");
      setCenters(centers);
      if (user.role !== "administrator_centru" && centers.length > 0) {
        setReqCenter(String(centers[0].id));
        setNewUser((u) => ({ ...u, center_id: String(centers[0].id) }));
      }
    })();
  }, [user.role]);

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
    loadAliases();
  }, [loadAliases]);

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
      setNewUser((u) => ({ ...u, email: "", password: "", full_name: "" }));
      await loadUsers();
    } catch (err) {
      setUserError(err.message);
    } finally {
      setCreatingUser(false);
    }
  }

  async function onCreateAlias(e) {
    e.preventDefault();
    setAliasError("");
    setCreatingAlias(true);
    try {
      await api("/api/product-aliases", { method: "POST", body: JSON.stringify(newAlias) });
      setNewAlias({ alias: "", canonical: "" });
      await loadAliases();
      await loadShoppingList();
    } catch (err) {
      setAliasError(err.message);
    } finally {
      setCreatingAlias(false);
    }
  }

  async function onDeleteAlias(id) {
    try {
      await api(`/api/product-aliases/${id}`, { method: "DELETE" });
      await loadAliases();
      await loadShoppingList();
    } catch (err) {
      alert(err.message);
    }
  }

  function addItemRow() {
    setItems((rows) => [...rows, { produs: "", cantitate: "" }]);
  }
  function removeItemRow(idx) {
    setItems((rows) => rows.filter((_, i) => i !== idx));
  }
  function updateItemRow(idx, field, value) {
    setItems((rows) => rows.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }

  async function onSubmitNewRequest(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const payload = { urgent: reqUrgent, items };
    if (user.role !== "administrator_centru") {
      payload.center_id = reqCenter;
    }

    try {
      await api("/api/requests", { method: "POST", body: JSON.stringify(payload) });
      setItems([{ produs: "", cantitate: "" }]);
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
              {user.role !== "administrator_centru" && (
                <div className="field">
                  <label>Centru</label>
                  <select value={reqCenter} onChange={(e) => setReqCenter(e.target.value)}>
                    {centers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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

            <table className="items-table">
              <thead>
                <tr>
                  <th>Nr. crt.</th>
                  <th>Produs</th>
                  <th>Cantitate</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <input
                        type="text"
                        placeholder="ex: Detergent"
                        value={row.produs}
                        onChange={(e) => updateItemRow(idx, "produs", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="ex: 5 buc"
                        value={row.cantitate}
                        onChange={(e) => updateItemRow(idx, "cantitate", e.target.value)}
                      />
                    </td>
                    <td>
                      {items.length > 1 && (
                        <button
                          type="button"
                          className="remove-item-btn"
                          onClick={() => removeItemRow(idx)}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="secondary-btn" onClick={addItemRow}>
              + Adaugă produs
            </button>

            <div style={{ marginTop: 14 }}>
              <button type="submit" className="primary-btn" disabled={submitting}>
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
                      </tr>
                    </thead>
                    <tbody>
                      {r.items.map((it) => (
                        <tr key={it.nr_crt}>
                          <td>{it.nr_crt}</td>
                          <td>{escapeHtml(it.produs)}</td>
                          <td>{escapeHtml(it.cantitate)}</td>
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
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>De luat (cereri acceptate)</h2>
          </div>
          <table className="items-table">
            <thead>
              <tr>
                <th>Nr. crt.</th>
                <th>Produs</th>
                <th>Cantitate</th>
              </tr>
            </thead>
            <tbody>
              {shoppingList.map((it) => (
                <tr key={it.nr_crt}>
                  <td>{it.nr_crt}</td>
                  <td>{escapeHtml(it.produs)}</td>
                  <td>{escapeHtml(it.cantitate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {shoppingList.length === 0 && <p className="muted-note">Nimic de luat momentan.</p>}
        </section>

        {isAdmin && (
          <section className="panel">
            <div className="panel-header">
              <h2>Sinonime produse</h2>
            </div>
            <p className="muted-note" style={{ marginTop: -8, marginBottom: 14 }}>
              Pentru produse ca „masă"/„mese", pe care aplicația nu le recunoaște automat ca fiind
              același lucru — le legi o singură dată aici, și de-atunci se adună mereu împreună în
              lista „De luat".
            </p>

            <div className="requests-list" style={{ marginBottom: 18 }}>
              {aliases.map((a) => (
                <div key={a.id} className="request-card">
                  <div className="request-top">
                    <div className="request-title">
                      „{a.alias}" se numără ca „{a.canonical}"
                    </div>
                    <button className="action-btn reject-btn" onClick={() => onDeleteAlias(a.id)}>
                      Șterge
                    </button>
                  </div>
                </div>
              ))}
              {aliases.length === 0 && <p className="muted-note">Niciun sinonim definit încă.</p>}
            </div>

            <form className="new-request" onSubmit={onCreateAlias}>
              <div className="row">
                <div className="field">
                  <label>Cum a fost scris</label>
                  <input
                    type="text"
                    placeholder="ex: mese"
                    required
                    value={newAlias.alias}
                    onChange={(e) => setNewAlias((a) => ({ ...a, alias: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Se numără ca</label>
                  <input
                    type="text"
                    placeholder="ex: masă"
                    required
                    value={newAlias.canonical}
                    onChange={(e) => setNewAlias((a) => ({ ...a, canonical: e.target.value }))}
                  />
                </div>
              </div>
              <button type="submit" className="primary-btn" disabled={creatingAlias}>
                {creatingAlias ? "Se salvează…" : "Adaugă sinonim"}
              </button>
              {aliasError && <p className="error">{aliasError}</p>}
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
                        {u.center_id ? ` · ${centerName(u.center_id)}` : ""}
                      </div>
                    </div>
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
                {newUser.role === "administrator_centru" && (
                  <div className="field">
                    <label>Centru</label>
                    <select
                      value={newUser.center_id}
                      onChange={(e) => setNewUser((u) => ({ ...u, center_id: e.target.value }))}
                    >
                      {centers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <button type="submit" className="primary-btn" disabled={creatingUser}>
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
