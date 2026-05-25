import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:3000/api";
const IDLE_TIMEOUT_MS = 8 * 60 * 1000;

// ─── API HELPER ──────────────────────────────────────────────────────────────
const token = () => localStorage.getItem("hams_token") || "";
const authHeader = () => ({ Authorization: `Bearer ${token()}` });

const api = {
  get: (path) =>
    fetch(`${API_BASE}${path}`, { headers: authHeader() }).then((r) => r.json()),

  post: (path, body) =>
    fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
    }),

  put: (path, body) =>
    fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
    }),

  // Returns { ok, data } — always safe to destructure, never throws
  del: async (path) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "DELETE",
      headers: authHeader(),
    });
    let data = {};
    try { data = await res.json(); } catch (_) { /* empty body */ }
    return { ok: res.ok, status: res.status, data };
  },
};

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  Available:      { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" },
  "In Transit":   { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  "In Use":       { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  Maintenance:    { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  Sterilization:  { bg: "#ede9fe", text: "#5b21b6", border: "#c4b5fd" },
  "Out of Stock": { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" },
};

// Statuses that staff can set manually (system sets In Transit / In Use)
const MANUAL_STATUSES = ["Available", "Maintenance", "Sterilization", "Out of Stock"];

const Badge = ({ status }) => {
  const s = STATUS_COLOR[status] || STATUS_COLOR["Out of Stock"];
  return (
    <span style={{
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
    }}>{status}</span>
  );
};

// ─── AUTH HOOK ────────────────────────────────────────────────────────────────
function useAuth() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hams_user")); } catch { return null; }
  });
  const idleTimer = useRef(null);

  const doLogout = useCallback(() => {
    localStorage.removeItem("hams_token");
    localStorage.removeItem("hams_user");
    clearTimeout(idleTimer.current);
    setUser(null);
  }, []);

  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      doLogout();
      alert("Sesi Anda telah berakhir karena tidak aktif selama 8 menit. Silakan login kembali.");
    }, IDLE_TIMEOUT_MS);
  }, [doLogout]);

  useEffect(() => {
    if (!user) return;
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();
    return () => {
      clearTimeout(idleTimer.current);
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
    };
  }, [user, resetIdleTimer]);

  const login = (tok, userData) => {
    localStorage.setItem("hams_token", tok);
    localStorage.setItem("hams_user", JSON.stringify(userData));
    setUser(userData);
  };

  return { user, login, logout: doLogout };
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Server tidak merespons dengan JSON. Pastikan semua service backend berjalan (node gateway.js, node auth-service.js, dll.)");
      }
      if (!res.ok) throw new Error(data.error || "Login gagal");
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0369a1 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        background: "rgba(255,255,255,0.97)", borderRadius: 20,
        padding: "48px 40px", width: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🏥</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>HAMS</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>Hospital Asset Management System</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Username</label>
          <input style={inputStyle} value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="Masukkan username" required autoFocus />
          <label style={{ ...labelStyle, marginTop: 16 }}>Password</label>
          <input style={inputStyle} type="password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Masukkan password" required />
          {error && (
            <div style={{
              color: "#dc2626", fontSize: 13, margin: "12px 0 0",
              background: "#fef2f2", padding: "10px 12px", borderRadius: 8, lineHeight: 1.5,
            }}>⚠ {error}</div>
          )}
          <button type="submit" disabled={loading} style={{
            width: "100%", marginTop: 24, padding: "13px",
            background: loading ? "#93c5fd" : "#0369a1", color: "white",
            border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}>
            {loading ? "Masuk..." : "Masuk"}
          </button>
        </form>
        <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 20, marginBottom: 0 }}>
          Sesi berakhir otomatis setelah 8 menit tidak aktif
        </p>
      </div>
    </div>
  );
}

// ─── NURSE PORTAL ─────────────────────────────────────────────────────────────
// Nurses ONLY get the scanner. They cannot reach any management pages.
function NursePortal({ user, logout }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <header style={{
        background: "#0f172a", color: "white", padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🏥</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>HAMS</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Portal Perawat</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>👤 {user.username}</span>
          <button onClick={logout} style={{
            padding: "6px 14px", background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7,
            color: "#fca5a5", cursor: "pointer", fontSize: 12, fontWeight: 600,
          }}>🚪 Keluar</button>
        </div>
      </header>
      <div style={{ maxWidth: 560, margin: "32px auto", padding: "0 16px" }}>
        <ScannerPage userRole="nurse" />
      </div>
    </div>
  );
}

// ─── MAIN LAYOUT ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "dashboard",   label: "Dashboard",    icon: "📊", roles: ["admin", "staff"] },
  { key: "assets",      label: "Aset",         icon: "📦", roles: ["admin", "staff"] },
  { key: "wards",       label: "Ruangan",      icon: "🏥", roles: ["admin", "staff"] },
  { key: "transfers",   label: "Transfer",     icon: "🚚", roles: ["admin", "staff"] },
  { key: "scanner",     label: "Scanner QR",   icon: "📷", roles: ["admin", "staff"] },
  { key: "maintenance", label: "Pemeliharaan", icon: "🔧", roles: ["admin", "staff"] },
  { key: "history",     label: "Riwayat",      icon: "📋", roles: ["admin", "staff"] },
  { key: "users",       label: "Kelola Akun",  icon: "👥", roles: ["admin"] },
];

const ROLE_LABEL = { admin: "Admin", staff: "Staff Logistik", nurse: "Perawat" };

function MainLayout({ user, logout, children, activePage, setActivePage }) {
  const allowed = NAV_ITEMS.filter((n) => n.roles.includes(user.role));
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f8fafc" }}>
      <aside style={{
        width: sidebarOpen ? 220 : 64, background: "#0f172a", color: "white",
        display: "flex", flexDirection: "column", transition: "width 0.25s",
        flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflow: "hidden",
      }}>
        <div style={{
          padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>🏥</span>
          {sidebarOpen && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>HAMS</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Asset Management</div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
            marginLeft: "auto", background: "none", border: "none",
            color: "#94a3b8", cursor: "pointer", fontSize: 16, flexShrink: 0,
          }}>{sidebarOpen ? "◀" : "▶"}</button>
        </div>

        <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
          {allowed.map((item) => (
            <button key={item.key} onClick={() => setActivePage(item.key)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "10px 16px",
              background: activePage === item.key ? "rgba(14,165,233,0.18)" : "none",
              border: "none",
              borderLeft: activePage === item.key ? "3px solid #38bdf8" : "3px solid transparent",
              color: activePage === item.key ? "#38bdf8" : "#94a3b8",
              cursor: "pointer", textAlign: "left", fontSize: 13,
              fontWeight: activePage === item.key ? 600 : 400, whiteSpace: "nowrap",
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {sidebarOpen && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>{user.username}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{ROLE_LABEL[user.role] || user.role}</div>
            </div>
          )}
          <button onClick={logout} style={{
            width: "100%", padding: "8px 12px",
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 8, color: "#fca5a5", cursor: "pointer", fontSize: 12, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 6,
            justifyContent: sidebarOpen ? "flex-start" : "center",
          }}>
            <span>🚪</span>{sidebarOpen && "Keluar"}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto", minWidth: 0 }}>{children}</main>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function DashboardPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/assets").then((a) => { setAssets(a.data || []); setLoading(false); });
  }, []);

  const counts = {
    total:       assets.length,
    available:   assets.filter((a) => a.status === "Available").length,
    inTransit:   assets.filter((a) => a.status === "In Transit").length,
    inUse:       assets.filter((a) => a.status === "In Use").length,
    maintenance: assets.filter((a) => a.status === "Maintenance").length,
    steril:      assets.filter((a) => a.status === "Sterilization").length,
  };

  const byType = assets.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {});
  const byWard = assets.reduce((acc, a) => { acc[a.current_ward] = (acc[a.current_ward] || 0) + 1; return acc; }, {});

  if (loading) return <PageShell title="Dashboard"><p style={{ color: "#64748b" }}>Memuat data...</p></PageShell>;

  return (
    <PageShell title="Dashboard Monitoring Aset">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Aset",  value: counts.total,       color: "#0369a1", bg: "#e0f2fe" },
          { label: "Tersedia",    value: counts.available,   color: "#065f46", bg: "#d1fae5" },
          { label: "In Transit",  value: counts.inTransit,   color: "#1e40af", bg: "#dbeafe" },
          { label: "Digunakan",   value: counts.inUse,       color: "#92400e", bg: "#fef3c7" },
          { label: "Maintenance", value: counts.maintenance, color: "#991b1b", bg: "#fee2e2" },
          { label: "Sterilisasi", value: counts.steril,      color: "#5b21b6", bg: "#ede9fe" },
        ].map((c) => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 14, padding: "18px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 11, color: c.color, fontWeight: 600, marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Distribusi per Ruangan</h3>
          {Object.entries(byWard).map(([ward, count]) => (
            <div key={ward} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{ward}</span>
                <span style={{ color: "#64748b" }}>{count} aset</span>
              </div>
              <div style={{ background: "#e2e8f0", borderRadius: 99, height: 7 }}>
                <div style={{ width: `${counts.total ? (count / counts.total) * 100 : 0}%`, background: "#0369a1", height: 7, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Distribusi per Kategori</h3>
          {Object.entries(byType).map(([type, count]) => (
            <div key={type} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{type}</span>
                <span style={{ color: "#64748b" }}>{count} aset</span>
              </div>
              <div style={{ background: "#e2e8f0", borderRadius: 99, height: 7 }}>
                <div style={{ width: `${counts.total ? (count / counts.total) * 100 : 0}%`, background: "#7c3aed", height: 7, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: 20 }}>
        <h3 style={sectionTitle}>Aset Terbaru</h3>
        <DataTable
          cols={["ID", "Nama", "Tipe", "Ruangan", "Status"]}
          rows={assets.slice(0, 8).map((a) => [`#${a.id}`, a.name, a.type, a.current_ward, <Badge key={a.id} status={a.status} />])}
        />
      </div>
    </PageShell>
  );
}

// ─── ASSETS PAGE ──────────────────────────────────────────────────────────────
function AssetsPage({ userRole }) {
  var [assets, setAssets] = useState([]);
  var [wards, setWards]   = useState([]);
  var [loading, setLoading] = useState(true);
  var [search, setSearch]   = useState("");
  var [filterType, setFilterType]     = useState("");
  var [filterStatus, setFilterStatus] = useState("");
  var [showForm, setShowForm] = useState(false);
  var [form, setForm]   = useState({ name: "", type: "", current_ward: "" });
  var [saving, setSaving] = useState(false);
  var [qrModal, setQrModal]     = useState(null);
  var [editStatus, setEditStatus] = useState({ id: null, value: "" });
  
  var [detailModal, setDetailModal] = useState(null);
  var [detailData, setDetailData] = useState({ transfers: [], maintenance: [], loading: false });

  var canEdit = ["admin", "staff"].includes(userRole);

  var load = useCallback(function() {
    setLoading(true);
    Promise.all([api.get("/assets"), api.get("/wards")]).then(function(res) {
      setAssets(res[0].data || []);
      setWards(res[1].data || []);
      setLoading(false);
    });
  }, []);
  
  useEffect(function() { load(); }, [load]);

  var types = [...new Set(assets.map(function(a) { return a.type; }).filter(Boolean))];

  var filtered = assets.filter(function(a) {
    var q = search.toLowerCase();
    var matchSearch = !q || (a.name && a.name.toLowerCase().includes(q)) || String(a.id).includes(q)
      || (a.type && a.type.toLowerCase().includes(q)) || (a.current_ward && a.current_ward.toLowerCase().includes(q));
    return matchSearch && (!filterType || a.type === filterType) && (!filterStatus || a.status === filterStatus);
  });

  var handleAdd = async function(e) {
    e.preventDefault(); setSaving(true);
    var hash = "qr_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
    var res = await api.post("/assets", { name: form.name, type: form.type, current_ward: form.current_ward, qr_hash: hash });
    setSaving(false);
    if (res.ok) { setShowForm(false); setForm({ name: "", type: "", current_ward: "" }); load(); }
    else { var d = await res.json(); alert("Gagal: " + d.error); }
  };

  var handleDelete = async function(id, name) {
    if (!confirm("Hapus " + name + "?")) return;
    var res = await api.del("/assets/" + id);
    if (res.ok) load(); else alert("Gagal: " + res.data.error);
  };

  var handleStatusSave = async function(id, ward) {
    if (!editStatus.value) return;
    var res = await api.put("/assets/" + id + "/location", { current_ward: ward, status: editStatus.value });
    if (res.ok) { load(); setEditStatus({ id: null, value: "" }); }
    else { var d = await res.json(); alert("Gagal: " + d.error); }
  };

  var openQR = async function(hash, name) {
    setQrModal({ hash: hash, name: name, image: null });
    var d = await api.get("/assets/qr/generate/" + hash);
    setQrModal({ hash: hash, name: name, image: d.image });
  };

  var openDetail = async function(asset) {
    setDetailModal(asset);
    setDetailData({ transfers: [], maintenance: [], loading: true });

    var mRes = await api.get("/maintenance/asset/" + asset.id);
    var tRes = await api.get("/transfers/history");

    var mData = mRes.data || [];
    var tData = [];
    
    if (tRes.data) {
      for (var i = 0; i < tRes.data.length; i++) {
        if (String(tRes.data[i].asset_id) === String(asset.id)) {
          tData.push(tRes.data[i]);
        }
      }
    }

    setDetailData({ transfers: tData, maintenance: mData, loading: false });
  };

  var calculateAge = function(dateString) {
    if (!dateString) return "Umur tidak diketahui";
    var d1 = new Date(dateString);
    var d2 = new Date();
    var diff = d2.getTime() - d1.getTime();
    var days = Math.floor(diff / (1000 * 3600 * 24));
    return days + " hari";
  };

  var sterilAssets = assets.filter(function(a) { return a.status === "Sterilization"; });

  return (
    <PageShell title="Manajemen Aset">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <input style={{ ...inputStyle, width: 240 }}
          placeholder="🔍 Cari ID, nama, kategori, ruangan..."
          value={search} onChange={function(e) { setSearch(e.target.value); }} />
        <select style={{ ...inputStyle, width: 160 }} value={filterType} onChange={function(e) { setFilterType(e.target.value); }}>
          <option value="">Semua Kategori</option>
          {types.map(function(t) { return <option key={t}>{t}</option>; })}
        </select>
        <select style={{ ...inputStyle, width: 160 }} value={filterStatus} onChange={function(e) { setFilterStatus(e.target.value); }}>
          <option value="">Semua Status</option>
          {Object.keys(STATUS_COLOR).map(function(s) { return <option key={s}>{s}</option>; })}
        </select>
        <span style={{ color: "#64748b", fontSize: 13 }}>{filtered.length + " aset"}</span>
        {canEdit && (
          <button style={btnPrimary} onClick={function() { setShowForm(!showForm); }}>
            {showForm ? "✕ Tutup" : "+ Daftarkan Aset"}
          </button>
        )}
      </div>

      {filterType && (
        <div style={{ ...cardStyle, marginBottom: 14, background: "#f0f9ff", padding: "12px 16px", fontSize: 13 }}>
          <strong>{"Kategori: " + filterType}</strong>{" — "}
          {Object.entries(filtered.reduce(function(acc, a) { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {}))
            .map(function(entry) { return entry[0] + ": " + entry[1]; }).join("  |  ")}
        </div>
      )}

      {canEdit && showForm && (
        <div style={{ ...cardStyle, marginBottom: 14, background: "#f0fdf4", border: "1.5px solid #86efac" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>Daftarkan Aset Baru</h3>
          <form onSubmit={handleAdd} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={labelStyle}>Nama Aset</label>
              <input style={{ ...inputStyle, width: 190 }} value={form.name}
                onChange={function(e) { setForm({ ...form, name: e.target.value }); }} placeholder="cth: Monitor A1" required />
            </div>
            <div>
              <label style={labelStyle}>Kategori</label>
              <input style={{ ...inputStyle, width: 140 }} list="type-dl" value={form.type}
                onChange={function(e) { setForm({ ...form, type: e.target.value }); }} placeholder="cth: Electronic" required />
              <datalist id="type-dl">{types.map(function(t) { return <option key={t} value={t} />; })}</datalist>
            </div>
            <div>
              <label style={labelStyle}>Ruangan</label>
              <input style={{ ...inputStyle, width: 130 }} list="ward-dl" value={form.current_ward}
                onChange={function(e) { setForm({ ...form, current_ward: e.target.value }); }} placeholder="cth: ICU" required />
              <datalist id="ward-dl">{wards.map(function(w) { return <option key={w.id} value={w.ward_name} />; })}</datalist>
            </div>
            <button type="submit" style={btnPrimary} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
          </form>
        </div>
      )}

      {loading ? <p style={{ color: "#64748b", padding: 20 }}>Memuat data...</p> : (
        <div style={cardStyle}>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {["ID", "Nama", "Kategori", "Ruangan", "Status", canEdit ? "Aksi" : null]
                    .filter(Boolean).map(function(h) { return <th key={h} style={thStyle}>{h}</th>; })}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8" }}>Tidak ada data</td></tr>
                )}
                {filtered.map(function(a) { return (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>{"#" + a.id}</td>
                    <td style={tdStyle}><strong>{a.name}</strong></td>
                    <td style={tdStyle}>{a.type}</td>
                    <td style={tdStyle}>{a.current_ward}</td>
                    <td style={tdStyle}>
                      {canEdit && editStatus.id === a.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <select style={{ ...inputStyle, padding: "4px 8px", fontSize: 12, width: 145 }}
                            value={editStatus.value}
                            onChange={function(e) { setEditStatus({ id: a.id, value: e.target.value }); }}>
                            <option value="">-- Pilih Status --</option>
                            {MANUAL_STATUSES.map(function(s) { return <option key={s}>{s}</option>; })}
                          </select>
                          <button style={{ ...btnSmall, background: "#16a34a", color: "white" }}
                            onClick={function() { handleStatusSave(a.id, a.current_ward); }}>✓</button>
                          <button style={btnSmall} onClick={function() { setEditStatus({ id: null, value: "" }); }}>✕</button>
                        </div>
                      ) : <Badge status={a.status} />}
                    </td>
                    {canEdit && (
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <button style={{ ...btnSmall, background: "#f3e8ff", color: "#7e22ce" }}
                            onClick={function() { openDetail(a); }}>📄 Detail</button>
                          <button style={{ ...btnSmall, background: "#dbeafe", color: "#1e40af" }}
                            onClick={function() { openQR(a.qr_hash, a.name); }}>🖨 QR</button>
                          {!["In Transit", "In Use"].includes(a.status) && (
                            <button style={{ ...btnSmall, background: "#fef3c7", color: "#92400e" }}
                              onClick={function() { setEditStatus({ id: a.id, value: a.status }); }}>✎ Status</button>
                          )}
                          {["Available", "Out of Stock", "Sterilization"].includes(a.status) && (
                            <button style={{ ...btnSmall, background: "#fee2e2", color: "#991b1b" }}
                              onClick={function() { handleDelete(a.id, a.name); }}>🗑</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {qrModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={function() { setQrModal(null); }}>
          <div style={{ background: "white", borderRadius: 16, padding: 32, textAlign: "center", minWidth: 280 }}
            onClick={function(e) { e.stopPropagation(); }}>
            <h3 style={{ margin: "0 0 16px" }}>{"Label QR: " + qrModal.name}</h3>
            {qrModal.image
              ? <img src={qrModal.image} alt="QR Code" style={{ width: 200, height: 200, border: "2px solid #e2e8f0", borderRadius: 8 }} />
              : <div style={{ width: 200, height: 200, background: "#f1f5f9", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", color: "#94a3b8" }}>Memuat...</div>
            }
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "12px 0" }}>{"Hash: " + qrModal.hash}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button style={btnPrimary} onClick={function() { window.print(); }}>🖨 Cetak Stiker</button>
              <button style={{ ...btnPrimary, background: "#64748b" }} onClick={function() { setQrModal(null); }}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {detailModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={function() { setDetailModal(null); }}>
          <div style={{ background: "white", borderRadius: 16, padding: 24, width: 600, maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto" }} onClick={function(e) { e.stopPropagation(); }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{"Detail Aset: " + detailModal.name}</h3>
              <button style={btnSmall} onClick={function() { setDetailModal(null); }}>✕</button>
            </div>

            <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13, border: "1px solid #e2e8f0" }}>
              <div style={{ marginBottom: 4 }}><strong>ID Aset:</strong> {"#" + detailModal.id}</div>
              <div style={{ marginBottom: 4 }}><strong>Kategori:</strong> {detailModal.type}</div>
              <div style={{ marginBottom: 4 }}><strong>Lokasi Terakhir:</strong> {detailModal.current_ward}</div>
              <div><strong>Umur Aset:</strong> {calculateAge(detailModal.created_at)}</div>
            </div>

            <h4 style={{ margin: "0 0 10px", color: "#0f172a" }}>Riwayat Perpindahan</h4>
            <div style={{ marginBottom: 20, border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto" }}>
              {detailData.loading ? <div style={{ padding: 12, fontSize: 13 }}>Memuat data...</div> : (
                detailData.transfers.length === 0 ? <div style={{ padding: 12, fontSize: 13, color: "#64748b" }}>Belum ada riwayat perpindahan</div> : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead style={{ background: "#f1f5f9" }}>
                      <tr><th style={{ padding: 8, textAlign: "left" }}>Rute</th><th style={{ padding: 8, textAlign: "left" }}>Tanggal</th><th style={{ padding: 8, textAlign: "left" }}>Status</th></tr>
                    </thead>
                    <tbody>
                      {detailData.transfers.map(function(t) { return (
                        <tr key={t.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: 8 }}>{t.from_ward + " ➔ " + t.to_ward}</td>
                          <td style={{ padding: 8 }}>{fmtDate(t.requested_at)}</td>
                          <td style={{ padding: 8 }}>{t.transfer_status}</td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                )
              )}
            </div>

            <h4 style={{ margin: "0 0 10px", color: "#0f172a" }}>Riwayat Laporan Kerusakan</h4>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 220, overflowY: "auto" }}>
              {detailData.loading ? <div style={{ padding: 12, fontSize: 13 }}>Memuat data...</div> : (
                detailData.maintenance.length === 0 ? <div style={{ padding: 12, fontSize: 13, color: "#64748b" }}>Aset belum pernah dilaporkan rusak</div> : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <tbody>
                      {detailData.maintenance.map(function(m) { return (
                        <tr key={m.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "12px 10px" }}>
                            <div style={{ marginBottom: 4 }}><strong>{"Tanggal Lapor: " + m.report_date}</strong> <span style={{ color: "#64748b" }}>{"(Oleh: " + m.reporter + ")"}</span></div>
                            <div style={{ marginBottom: 8 }}>{"Kendala: " + m.description}</div>
                            {m.action_date ? (
                              <div style={{ background: "#f0fdf4", borderLeft: "3px solid #22c55e", padding: 8, borderRadius: "0 6px 6px 0" }}>
                                <div style={{ marginBottom: 4 }}><strong>{"Tindakan Selesai (" + m.action_date + ") - Status: " + m.status}</strong></div>
                                <div>{"Keterangan: " + (m.action_notes || "Tidak ada catatan tambahan")}</div>
                              </div>
                            ) : (
                              <div style={{ background: "#fffbeb", borderLeft: "3px solid #f59e0b", padding: 8, borderRadius: "0 6px 6px 0", color: "#92400e" }}>
                                <strong>Belum ada tindakan perbaikan</strong>
                              </div>
                            )}
                          </td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                )
              )}
            </div>

          </div>
        </div>
      )}
    </PageShell>
  );
}
// ─── WARDS PAGE ───────────────────────────────────────────────────────────────
function WardsPage() {
  const [wards, setWards]   = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWard, setNewWard] = useState("");
  const [saving, setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get("/wards"), api.get("/assets")]).then(([w, a]) => {
      setWards(w.data || []);
      setAssets(a.data || []);
      setLoading(false);
    });
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleAddWard = async (e) => {
    e.preventDefault(); setSaving(true);
    const res = await api.post("/wards", { ward_name: newWard });
    setSaving(false);
    if (res.ok) { setNewWard(""); load(); }
    else { const d = await res.json(); alert("Gagal: " + d.error); }
  };

  const handleDeleteWard = async (id, name) => {
    if (!confirm(`Hapus ruangan "${name}"?`)) return;
    const { ok, data } = await api.del(`/wards/${id}`);
    if (ok) load(); else alert("Gagal: " + data.error);
  };

  const getWardAssets = (name) => assets.filter((a) => a.current_ward === name);

  if (loading) return <PageShell title="Manajemen Ruangan"><p style={{ color: "#64748b" }}>Memuat...</p></PageShell>;

  return (
    <PageShell title="Manajemen Ruangan / Lokasi">
      <form onSubmit={handleAddWard} style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "flex-end" }}>
        <div>
          <label style={labelStyle}>Tambah Ruangan Baru</label>
          <input style={{ ...inputStyle, width: 200 }} value={newWard}
            onChange={(e) => setNewWard(e.target.value)} placeholder="Nama ruangan" required />
        </div>
        <button type="submit" style={btnPrimary} disabled={saving}>{saving ? "..." : "+ Tambah"}</button>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {wards.map((w) => {
          const wa = getWardAssets(w.ward_name);
          const available = wa.filter((a) => a.status === "Available").length;
          const inUse     = wa.filter((a) => a.status === "In Use").length;
          const steril    = wa.filter((a) => a.status === "Sterilization").length;
          return (
            <div key={w.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>🏥 {w.ward_name}</h3>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ background: "#dbeafe", color: "#1e40af", borderRadius: 99, padding: "2px 9px", fontSize: 12, fontWeight: 600 }}>{wa.length} aset</span>
                  <button style={{ ...btnSmall, padding: "2px 8px", background: "#fee2e2", color: "#991b1b" }}
                    onClick={() => handleDeleteWard(w.id, w.ward_name)}>🗑</button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ background: "#d1fae5", color: "#065f46", borderRadius: 99, padding: "2px 9px", fontSize: 11 }}>✓ {available} tersedia</span>
                <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 99, padding: "2px 9px", fontSize: 11 }}>◉ {inUse} digunakan</span>
                {steril > 0 && <span style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: 99, padding: "2px 9px", fontSize: 11 }}>🧪 {steril} steril</span>}
              </div>
              {wa.length > 0 && (
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
                  {wa.slice(0, 4).map((a) => (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
                      <span>{a.name}</span><Badge status={a.status} />
                    </div>
                  ))}
                  {wa.length > 4 && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>+{wa.length - 4} lainnya</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}

// ─── TRANSFER PAGE ────────────────────────────────────────────────────────────
function TransferPage({ userRole }) {
  const [assets, setAssets] = useState([]);
  const [wards, setWards]   = useState([]);
  const [form, setForm]     = useState({ assetId: "", qr_hash: "", from_ward: "", to_ward: "" });
  const [msg, setMsg]       = useState(null);
  const [loading, setLoading] = useState(false);
  const canEdit = ["admin", "staff"].includes(userRole);

  const loadData = useCallback(() => {
    Promise.all([api.get("/assets"), api.get("/wards")]).then(([a, w]) => {
      setAssets(a.data || []);
      setWards(w.data || []);
    });
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const availableAssets = assets.filter((a) => a.status === "Available");
  const inTransitAssets = assets.filter((a) => a.status === "In Transit");

  const handleSelectAsset = (id) => {
    const a = assets.find((x) => String(x.id) === String(id));
    if (a) setForm({ assetId: id, qr_hash: a.qr_hash, from_ward: a.current_ward, to_ward: "" });
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (form.from_ward === form.to_ward) {
      setMsg({ type: "error", text: "Ruangan tujuan tidak boleh sama dengan ruangan asal." }); return;
    }
    setLoading(true); setMsg(null);
    const res = await api.post("/transfers", { qr_hash: form.qr_hash, from_ward: form.from_ward, to_ward: form.to_ward });
    const d = await res.json();
    setLoading(false);
    if (res.ok) {
      setMsg({ type: "success", text: "Transfer berhasil diinisiasi! Aset sekarang 'In Transit'." });
      setForm({ assetId: "", qr_hash: "", from_ward: "", to_ward: "" });
      loadData();
    } else {
      setMsg({ type: "error", text: d.error || d.message || "Gagal melakukan transfer" });
    }
  };

  // FIXED: uses new api.del which returns {ok, data} — no more silent failure
  const handleCancel = async (assetId, name) => {
    if (!confirm(`Batalkan transit untuk "${name}"?`)) return;
    const { ok, data } = await api.del(`/transfers/cancel/${assetId}`);
    if (ok) {
      setMsg({ type: "success", text: `Transit untuk "${name}" dibatalkan. Aset kembali 'Available'.` });
      loadData();
    } else {
      setMsg({ type: "error", text: "Gagal membatalkan: " + (data.error || "Server error") });
    }
  };

  return (
    <PageShell title="Transfer Aset Antar Ruangan">
      {canEdit && (
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <h3 style={sectionTitle}>Inisiasi Transfer Baru</h3>
          <form onSubmit={handleTransfer} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={labelStyle}>Pilih Aset (Tersedia)</label>
              <select style={{ ...inputStyle, width: 250 }} value={form.assetId}
                onChange={(e) => handleSelectAsset(e.target.value)} required>
                <option value="">-- Pilih Aset --</option>
                {availableAssets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} (#{a.id}) — {a.current_ward}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Dari Ruangan</label>
              <input style={{ ...inputStyle, width: 130, background: "#f8fafc", color: "#64748b" }}
                value={form.from_ward} readOnly placeholder="Otomatis" />
            </div>
            <div>
              <label style={labelStyle}>Ke Ruangan</label>
              <input style={{ ...inputStyle, width: 140 }} list="ward-dl-t"
                value={form.to_ward} onChange={(e) => setForm({ ...form, to_ward: e.target.value })}
                placeholder="Tujuan" required />
              <datalist id="ward-dl-t">{wards.map((w) => <option key={w.id} value={w.ward_name} />)}</datalist>
            </div>
            <button type="submit" style={btnPrimary} disabled={loading || !form.qr_hash}>
              {loading ? "..." : "🚚 Kirim"}
            </button>
          </form>
          {msg && (
            <div style={{
              marginTop: 12, padding: "10px 14px", borderRadius: 8, fontSize: 13,
              background: msg.type === "success" ? "#d1fae5" : "#fee2e2",
              color:      msg.type === "success" ? "#065f46" : "#991b1b",
            }}>{msg.text}</div>
          )}
        </div>
      )}

      <div style={cardStyle}>
        <h3 style={sectionTitle}>Aset Sedang In Transit ({inTransitAssets.length})</h3>
        {inTransitAssets.length === 0
          ? <p style={{ color: "#94a3b8", fontSize: 14 }}>Tidak ada aset yang sedang dalam perjalanan.</p>
          : (
            <table style={tableStyle}>
              <thead>
                <tr>{["ID", "Nama", "Ruangan Saat Ini", "Status", canEdit ? "Aksi" : null].filter(Boolean).map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {inTransitAssets.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>#{a.id}</td>
                    <td style={tdStyle}><strong>{a.name}</strong></td>
                    <td style={tdStyle}>{a.current_ward}</td>
                    <td style={tdStyle}><Badge status={a.status} /></td>
                    {canEdit && (
                      <td style={tdStyle}>
                        <button style={{ ...btnSmall, background: "#fee2e2", color: "#991b1b" }}
                          onClick={() => handleCancel(a.id, a.name)}>✕ Batalkan</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </PageShell>
  );
}

// ─── SCANNER PAGE ─────────────────────────────────────────────────────────────

function ScannerPage({ userRole }) {
  const [manualHash, setManualHash] = useState("");
  const [result, setResult]         = useState(null);
  const [transfer, setTransfer]     = useState(null);
  const [verifying, setVerifying]   = useState(false);
  const [scanning, setScanning]     = useState(false);
  const [libReady, setLibReady]     = useState(!!window.Html5Qrcode);
  const [reportForm, setReportForm] = useState(false);
  const [reportDesc, setReportDesc] = useState("");
  const [reportSaving, setReportSaving] = useState(false);
  const [actionMsg, setActionMsg]   = useState(null);
  const html5Ref = useRef(null);

  useEffect(() => {
    if (window.Html5Qrcode) { setLibReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.onload = () => setLibReady(true);
    document.head.appendChild(script);
  }, []);

  const reset = () => {
    setResult(null); setTransfer(null); setManualHash("");
    setActionMsg(null); setReportForm(false); setReportDesc("");
  };

  const verify = async (hash) => {
    if (!hash?.trim()) return;
    setVerifying(true); setResult(null); setTransfer(null); setActionMsg(null);
    try {
      const res = await api.get(`/assets/qr/${hash.trim()}`);
      if (res.data) {
        setResult(res.data);
        if (res.data.status === "In Transit") {
          const t = await api.get(`/transfers/active/${res.data.id}`);
          setTransfer(t.data || null);
        }
      } else {
        setResult({ __error: true, msg: res.error || "Aset tidak ditemukan" });
      }
    } catch {
      setResult({ __error: true, msg: "Gagal terhubung ke server" });
    }
    setVerifying(false);
  };

  const startCamera = () => {
    if (!libReady) { alert("Scanner sedang dimuat, coba lagi."); return; }
    setScanning(true); reset();
    setTimeout(() => {
      try {
        html5Ref.current = new window.Html5Qrcode("qr-reader-div");
        html5Ref.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            html5Ref.current.stop().catch(() => {});
            setScanning(false);
            setManualHash(decoded);
            verify(decoded);
          }
        ).catch((err) => { setScanning(false); alert("Kamera tidak tersedia: " + err); });
      } catch (err) { setScanning(false); console.error(err); }
    }, 150);
  };

  const stopCamera = () => {
    if (html5Ref.current) html5Ref.current.stop().catch(() => {});
    setScanning(false);
  };

  const confirmReceive = async () => {
    if (!transfer) return;
    const res = await api.put(`/transfers/receive/${transfer.id}`, {});
    if (res.ok) {
      setActionMsg({ type: "success", text: `✅ Aset berhasil diterima dan sekarang 'In Use' di ${transfer.to_ward}.` });
      setResult({ ...result, status: "In Use", current_ward: transfer.to_ward });
      setTransfer(null);
    } else {
      setActionMsg({ type: "error", text: "Gagal konfirmasi penerimaan." });
    }
  };

  const denyReceive = () => {
    setActionMsg({ type: "warn", text: "⚠ Jangan terima aset ini. Instruksikan porter untuk mengembalikan ke ruangan asal." });
    setTransfer(null);
  };

  const submitReport = async () => {
    if (!reportDesc.trim() || !result) return;
    setReportSaving(true);
    const res = await api.post("/maintenance", {
      asset_id: result.id, asset_name: result.name, type: result.type,
      report_date: new Date().toISOString().split("T")[0],
      description: reportDesc, reporter: "Scanner",
    });
    setReportSaving(false);
    if (res.ok) {
      setActionMsg({ type: "success", text: "📋 Laporan kerusakan berhasil dikirim." });
      setReportForm(false); setReportDesc("");
    } else {
      const d = await res.json();
      setActionMsg({ type: "error", text: "Gagal: " + d.error });
    }
  };

  const msgStyle = (type) => ({
    marginTop: 12, padding: "10px 14px", borderRadius: 8, fontSize: 13,
    background: type === "success" ? "#d1fae5" : type === "warn" ? "#fffbeb" : "#fee2e2",
    color:      type === "success" ? "#065f46" : type === "warn" ? "#92400e" : "#991b1b",
  });

  return (
    <PageShell title="Scanner QR Aset">
      <div style={{ maxWidth: 520 }}>
        {/* Camera */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>📷 Scan dengan Kamera</h3>
          {scanning && <div id="qr-reader-div" style={{ width: "100%", marginBottom: 12, borderRadius: 10, overflow: "hidden" }} />}
          <div style={{ display: "flex", gap: 10 }}>
            {!scanning
              ? <button style={btnPrimary} onClick={startCamera} disabled={!libReady}>
                  {libReady ? "▶ Mulai Kamera" : "Memuat scanner..."}
                </button>
              : <button style={{ ...btnPrimary, background: "#dc2626" }} onClick={stopCamera}>■ Stop Kamera</button>
            }
          </div>
        </div>

        {/* Manual input */}
        <div style={{ ...cardStyle, marginTop: 14 }}>
          <h3 style={sectionTitle}>🔍 Verifikasi Manual</h3>
          <div style={{ display: "flex", gap: 10 }}>
            <input style={{ ...inputStyle, flex: 1 }}
              placeholder="Ketik QR hash, cth: qr_hash_12345"
              value={manualHash} onChange={(e) => setManualHash(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verify(manualHash)} />
            <button style={btnPrimary} onClick={() => verify(manualHash)} disabled={verifying}>
              {verifying ? "..." : "Periksa"}
            </button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div style={{ ...cardStyle, marginTop: 14, borderTop: result.__error ? "4px solid #ef4444" : "4px solid #22c55e" }}>
            {result.__error ? (
              <p style={{ color: "#dc2626", margin: 0 }}>❌ {result.msg}</p>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{result.name}</h3>
                  <Badge status={result.status} />
                </div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 2 }}>
                  <div>📦 <strong>ID:</strong> #{result.id}</div>
                  <div>🏷 <strong>Kategori:</strong> {result.type}</div>
                  <div>📍 <strong>Lokasi Saat Ini:</strong> {result.current_ward}</div>
                </div>

                {transfer && (
                  <div style={{ marginTop: 12, background: "#dbeafe", borderRadius: 10, padding: "12px 14px", fontSize: 13 }}>
                    <div>🚚 <strong>Dikirim dari:</strong> {transfer.from_ward}</div>
                    <div style={{ marginTop: 4 }}>🎯 <strong>Tujuan:</strong>{" "}
                      <strong style={{ color: "#1e40af", fontSize: 16 }}>{transfer.to_ward}</strong>
                    </div>
                    {!actionMsg && (
                      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                        <button style={{ ...btnPrimary, background: "#16a34a", flex: 1 }} onClick={confirmReceive}>
                          ✅ Konfirmasi Terima
                        </button>
                        <button style={{ ...btnPrimary, background: "#dc2626", flex: 1 }} onClick={denyReceive}>
                          ❌ Lokasi Salah
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {actionMsg && <div style={msgStyle(actionMsg.type)}>{actionMsg.text}</div>}

                {!reportForm && !actionMsg && (
                  <button style={{ ...btnSmall, marginTop: 12, background: "#fee2e2", color: "#991b1b", width: "100%", padding: "8px", textAlign: "center" }}
                    onClick={() => setReportForm(true)}>⚠ Laporkan Kerusakan</button>
                )}
                {reportForm && (
                  <div style={{ marginTop: 12 }}>
                    <label style={labelStyle}>Deskripsi Kerusakan</label>
                    <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
                      value={reportDesc} onChange={(e) => setReportDesc(e.target.value)}
                      placeholder="Jelaskan kerusakan yang terlihat..." />
                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                      <button style={{ ...btnPrimary, background: "#dc2626", flex: 1 }} onClick={submitReport} disabled={reportSaving}>
                        {reportSaving ? "..." : "Kirim Laporan"}
                      </button>
                      <button style={{ ...btnPrimary, background: "#64748b" }} onClick={() => setReportForm(false)}>Batal</button>
                    </div>
                  </div>
                )}
              </>
            )}
            <button style={{ ...btnSmall, marginTop: 14, width: "100%", padding: "8px", textAlign: "center" }}
              onClick={reset}>↩ Scan Ulang</button>
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ─── MAINTENANCE PAGE ─────────────────────────────────────────────────────────
function MaintenancePage({ user }) {
  const [reports, setReports]   = useState([]);
  const [assets, setAssets]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState({ asset_id: "", report_date: today(), description: "", reporter: user?.username || "" });
  const [action, setAction] = useState({ action_date: today(), vendor: "", cost: "", duration_days: "", notes: "", status: "Diperbaiki" });
  const canFollowUp = ["admin", "staff"].includes(user?.role);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get("/maintenance"), api.get("/assets")])
      .then(([m, a]) => { setReports(m.data || []); setAssets(a.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleReport = async (e) => {
    e.preventDefault();
    const a = assets.find((x) => String(x.id) === String(form.asset_id));
    const res = await api.post("/maintenance", { ...form, asset_name: a?.name || "", type: a?.type || "" });
    if (res.ok) {
      if (a) await api.put(`/assets/${a.id}/location`, { current_ward: a.current_ward, status: "Maintenance" });
      setShowForm(false);
      setForm({ asset_id: "", report_date: today(), description: "", reporter: user?.username || "" });
      load();
    } else { const d = await res.json(); alert("Gagal: " + d.error); }
  };

  const handleAction = async (e) => {
    e.preventDefault();
    const res = await api.post(`/maintenance/${actionModal}/action`, action);
    if (res.ok) { setActionModal(null); load(); }
    else { const d = await res.json(); alert("Gagal: " + d.error); }
  };

  const filtered = filterStatus ? reports.filter((r) => r.status === filterStatus) : reports;

  return (
    <PageShell title="Laporan & Pemeliharaan Aset">
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select style={{ ...inputStyle, width: 200 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Semua Status Laporan</option>
          {["Dilaporkan", "Diperbaiki", "Diganti", "Selesai"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <button style={btnPrimary} onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Tutup" : "+ Laporkan Kerusakan"}
        </button>
      </div>

      {showForm && (
        <div style={{ ...cardStyle, marginBottom: 16, background: "#fef2f2", border: "1.5px solid #fca5a5" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, color: "#991b1b" }}>Laporan Kerusakan Baru</h3>
          <form onSubmit={handleReport} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={labelStyle}>Aset</label>
              <select style={{ ...inputStyle, width: 240 }} value={form.asset_id}
                onChange={(e) => setForm({ ...form, asset_id: e.target.value })} required>
                <option value="">-- Pilih Aset --</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.name} (#{a.id})</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tanggal</label>
              <input style={{ ...inputStyle, width: 155 }} type="date" value={form.report_date}
                onChange={(e) => setForm({ ...form, report_date: e.target.value })} required />
            </div>
            <div>
              <label style={labelStyle}>Pelapor</label>
              <input style={{ ...inputStyle, width: 140 }} value={form.reporter}
                onChange={(e) => setForm({ ...form, reporter: e.target.value })} required />
            </div>
            <div style={{ flex: "1 1 100%" }}>
              <label style={labelStyle}>Deskripsi Kerusakan</label>
              <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical", width: "100%", boxSizing: "border-box" }}
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Jelaskan kerusakan secara detail..." required />
            </div>
            <button type="submit" style={{ ...btnPrimary, background: "#dc2626" }}>📋 Kirim Laporan</button>
          </form>
        </div>
      )}

      {actionModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setActionModal(null)}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: 460, maxWidth: "95vw" }}
            onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px" }}>Tindak Lanjut Laporan #{actionModal}</h3>
            <form onSubmit={handleAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Tanggal Tindakan</label>
                  <input style={inputStyle} type="date" value={action.action_date}
                    onChange={(e) => setAction({ ...action, action_date: e.target.value })} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Status Baru</label>
                  <select style={inputStyle} value={action.status}
                    onChange={(e) => setAction({ ...action, status: e.target.value })}>
                    {["Diperbaiki", "Diganti", "Selesai"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Vendor / Teknisi</label>
                <input style={inputStyle} value={action.vendor}
                  onChange={(e) => setAction({ ...action, vendor: e.target.value })} placeholder="Nama vendor" />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Biaya (Rp)</label>
                  <input style={inputStyle} type="number" value={action.cost}
                    onChange={(e) => setAction({ ...action, cost: e.target.value })} placeholder="0" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Durasi (Hari)</label>
                  <input style={inputStyle} type="number" value={action.duration_days}
                    onChange={(e) => setAction({ ...action, duration_days: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Catatan</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
                  value={action.notes} onChange={(e) => setAction({ ...action, notes: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" style={btnPrimary}>💾 Simpan</button>
                <button type="button" style={{ ...btnPrimary, background: "#64748b" }} onClick={() => setActionModal(null)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: "#64748b" }}>Memuat data...</p> : (
        <div style={cardStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["#", "Aset", "Tanggal", "Pelapor", "Deskripsi", "Status", canFollowUp ? "Aksi" : null]
                  .filter(Boolean).map((h) => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8" }}>Belum ada laporan kerusakan</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={tdStyle}>#{r.id}</td>
                  <td style={tdStyle}><strong>{r.asset_name}</strong><div style={{ fontSize: 11, color: "#94a3b8" }}>#{r.asset_id}</div></td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{r.report_date}</td>
                  <td style={tdStyle}>{r.reporter}</td>
                  <td style={{ ...tdStyle, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>{r.description}</td>
                  <td style={tdStyle}>
                    <span style={{ background: r.status === "Selesai" ? "#d1fae5" : "#fef3c7", color: r.status === "Selesai" ? "#065f46" : "#92400e", borderRadius: 99, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
                      {r.status}
                    </span>
                  </td>
                  {canFollowUp && (
                    <td style={tdStyle}>
                      {r.status !== "Selesai" && (
                        <button style={{ ...btnSmall, background: "#dbeafe", color: "#1e40af" }}
                          onClick={() => setActionModal(r.id)}>🔧 Tindak Lanjut</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

// ─── HISTORY PAGE ─────────────────────────────────────────────────────────────
function HistoryPage() {
  const [transfers, setTransfers] = useState([]);
  const [assets, setAssets]       = useState([]);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    Promise.all([api.get("/transfers/history"), api.get("/assets")])
      .then(([t, a]) => {
        if (t.data) { setTransfers(t.data); }
        else { setError("Endpoint /api/transfers/history tidak merespons dengan benar."); }
        setAssets(a.data || []);
        setLoading(false);
      }).catch(() => { setError("Gagal memuat data riwayat."); setLoading(false); });
  }, []);

  const getAssetName = (id) => {
    const a = assets.find((x) => x.id === id);
    return a ? a.name : `Aset #${id}`;
  };

  const filtered = transfers.filter((t) => {
    const q = search.toLowerCase();
    return !q || String(t.asset_id).includes(q) || getAssetName(t.asset_id).toLowerCase().includes(q)
      || t.from_ward?.toLowerCase().includes(q) || t.to_ward?.toLowerCase().includes(q);
  });

  const sColor = (s) => ({
    background: s === "Completed" ? "#d1fae5" : s === "In Transit" ? "#dbeafe" : "#fef3c7",
    color:      s === "Completed" ? "#065f46" : s === "In Transit" ? "#1e40af" : "#92400e",
    borderRadius: 99, padding: "2px 10px", fontSize: 12, fontWeight: 600,
  });

  return (
    <PageShell title="Riwayat Pergerakan Aset">
      <input style={{ ...inputStyle, width: 280, marginBottom: 16 }}
        placeholder="🔍 Cari ID, nama aset, ruangan..."
        value={search} onChange={(e) => setSearch(e.target.value)} />

      {loading ? <p style={{ color: "#64748b" }}>Memuat riwayat...</p>
        : error ? (
          <div style={{ ...cardStyle, background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", fontSize: 13 }}>{error}</div>
        ) : (
          <div style={cardStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>{["#", "Aset", "Dari", "Ke", "Status", "Waktu Kirim", "Selesai"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8" }}>
                    {transfers.length === 0 ? "Belum ada riwayat transfer." : "Tidak ada hasil pencarian."}
                  </td></tr>
                )}
                {filtered.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>#{t.id}</td>
                    <td style={tdStyle}><strong>{getAssetName(t.asset_id)}</strong><div style={{ fontSize: 11, color: "#94a3b8" }}>#{t.asset_id}</div></td>
                    <td style={tdStyle}>{t.from_ward}</td>
                    <td style={tdStyle}><strong>{t.to_ward}</strong></td>
                    <td style={tdStyle}><span style={sColor(t.transfer_status)}>{t.transfer_status}</span></td>
                    <td style={{ ...tdStyle, fontSize: 12, color: "#64748b" }}>{fmtDate(t.requested_at)}</td>
                    <td style={{ ...tdStyle, fontSize: 12, color: "#64748b" }}>{t.completed_at ? fmtDate(t.completed_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </PageShell>
  );
}

// ─── USERS PAGE ───────────────────────────────────────────────────────────────
function UsersPage({ currentUser }) {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]     = useState({ username: "", password: "", role: "staff" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState(null);

  const load = useCallback(() => {
    api.get("/auth/users").then((d) => { setUsers(d.data || []); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleRegister = async (e) => {
    e.preventDefault(); setSaving(true); setMsg(null);
    const res = await api.post("/auth/register", form);
    const d = await res.json(); setSaving(false);
    if (res.ok) {
      setMsg({ type: "success", text: `Akun "${form.username}" (${ROLE_LABEL[form.role]}) berhasil dibuat.` });
      setForm({ username: "", password: "", role: "staff" }); load();
    } else { setMsg({ type: "error", text: d.error }); }
  };

  const handleDelete = async (id, username) => {
    if (!confirm(`Hapus akun "${username}"?`)) return;
    const { ok, data } = await api.del(`/auth/users/${id}`);
    if (ok) load(); else alert("Gagal: " + data.error);
  };

  const ROLE_BADGE = {
    admin: { label: "Admin",          bg: "#fee2e2", color: "#991b1b" },
    staff: { label: "Staff Logistik", bg: "#dbeafe", color: "#1e40af" },
    nurse: { label: "Perawat",        bg: "#d1fae5", color: "#065f46" },
  };
  const ACCESS = {
    admin: "Akses penuh",
    staff: "Semua fitur (kecuali Kelola Akun)",
    nurse: "Scanner QR saja",
  };

  return (
    <PageShell title="Kelola Akun Pengguna">
      <button style={{ ...btnPrimary, marginBottom: 16 }} onClick={() => setShowForm(!showForm)}>
        {showForm ? "✕ Tutup" : "+ Buat Akun Baru"}
      </button>

      {showForm && (
        <div style={{ ...cardStyle, marginBottom: 16, background: "#f0f9ff", border: "1.5px solid #7dd3fc" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>Registrasi Akun Baru</h3>
          <form onSubmit={handleRegister} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={labelStyle}>Username</label>
              <input style={{ ...inputStyle, width: 160 }} value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input style={{ ...inputStyle, width: 160 }} type="password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <select style={{ ...inputStyle, width: 165 }} value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="staff">Staff Logistik</option>
                <option value="nurse">Perawat</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" style={btnPrimary} disabled={saving}>{saving ? "..." : "Buat Akun"}</button>
          </form>
          {msg && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, fontSize: 13, background: msg.type === "success" ? "#d1fae5" : "#fee2e2", color: msg.type === "success" ? "#065f46" : "#991b1b" }}>
              {msg.text}
            </div>
          )}
        </div>
      )}

      {loading ? <p>Memuat...</p> : (
        <div style={cardStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>{["ID", "Username", "Role", "Hak Akses", "Dibuat", "Aksi"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const rb = ROLE_BADGE[u.role] || { label: u.role, bg: "#f3f4f6", color: "#374151" };
                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>#{u.id}</td>
                    <td style={tdStyle}>
                      <strong>{u.username}</strong>
                      {u.id === currentUser.id && <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>(Anda)</span>}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: rb.bg, color: rb.color, borderRadius: 99, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{rb.label}</span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: "#64748b" }}>{ACCESS[u.role] || "—"}</td>
                    <td style={{ ...tdStyle, fontSize: 12, color: "#64748b" }}>{new Date(u.created_at).toLocaleDateString("id-ID")}</td>
                    <td style={tdStyle}>
                      {u.id !== currentUser.id && (
                        <button style={{ ...btnSmall, background: "#fee2e2", color: "#991b1b" }}
                          onClick={() => handleDelete(u.id, u.username)}>🗑 Hapus</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function PageShell({ title, children }) {
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1120 }}>
      <h1 style={{ margin: "0 0 22px", fontSize: 21, fontWeight: 700, color: "#0f172a" }}>{title}</h1>
      {children}
    </div>
  );
}

function DataTable({ cols, rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead><tr>{cols.map((c) => <th key={c} style={thStyle}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={cols.length} style={{ ...tdStyle, color: "#94a3b8", textAlign: "center" }}>Tidak ada data</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
              {row.map((cell, j) => <td key={j} style={tdStyle}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const today  = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => { try { return new Date(d).toLocaleString("id-ID"); } catch { return d; } };

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 };
const inputStyle  = { width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" };
const cardStyle   = { background: "white", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", border: "1px solid #e2e8f0" };
const sectionTitle = { margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" };
const tableStyle  = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const thStyle     = { background: "#f8fafc", padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "2px solid #e2e8f0", fontSize: 12, whiteSpace: "nowrap" };
const tdStyle     = { padding: "10px 12px", verticalAlign: "middle" };
const btnPrimary  = { padding: "9px 18px", background: "#0369a1", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" };
const btnSmall    = { padding: "4px 10px", background: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 };


export default function App() {
  const { user, login, logout } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");

  if (!user) return <LoginPage onLogin={login} />;

  // Nurse → scanner-only portal, no sidebar
  if (user.role === "nurse") return <NursePortal user={user} logout={logout} />;

  const pages = {
    dashboard:   <DashboardPage />,
    assets:      <AssetsPage userRole={user.role} />,
    wards:       <WardsPage />,
    transfers:   <TransferPage userRole={user.role} />,
    scanner:     <ScannerPage userRole={user.role} />,
    maintenance: <MaintenancePage user={user} />,
    history:     <HistoryPage />,
    users:       user.role === "admin" ? <UsersPage currentUser={user} /> : null,
  };

  return (
    <MainLayout user={user} logout={logout} activePage={activePage} setActivePage={setActivePage}>
      {pages[activePage] || <PageShell title="Halaman tidak ditemukan" />}
    </MainLayout>
  );
}

