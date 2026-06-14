import { useState, useEffect, useCallback, useRef } from "react"; 



// ─── CONFIG ──────────────────────────────────────────────────────────────────
const IDLE_TIMEOUT_MS = 8 * 60 * 1000;




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
function LoginPage(props) {
  var onLogin = props.onLogin;
  var [form, setForm] = useState({ username: "", password: "" });
  var [error, setError] = useState("");
  var [loading, setLoading] = useState(false);

  var handleSubmit = async function(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    var queryStr = 'mutation { login(username: "' + form.username + '", password: "' + form.password + '") { token user { id username role } } }';

    try {
      var res = await fetch("http://localhost:3000/graphql/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryStr })
      });

      var data = await res.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      var loginData = data.data.login;
      onLogin(loginData.token, loginData.user);

    } catch (err) {
      setError(err.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0369a1 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: "rgba(255,255,255,0.97)", borderRadius: 20, padding: "48px 40px", width: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🏥</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>HAMS</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>Hospital Asset Management System</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Username</label>
          <input style={inputStyle} value={form.username} onChange={function(e) { setForm({ username: e.target.value, password: form.password }) }} placeholder="Masukkan username" required autoFocus />
          <label style={{ marginTop: 16, display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>Password</label>
          <input style={inputStyle} type="password" value={form.password} onChange={function(e) { setForm({ username: form.username, password: e.target.value }) }} placeholder="Masukkan password" required />
          {error && (
            <div style={{ color: "#dc2626", fontSize: 13, margin: "12px 0 0", background: "#fef2f2", padding: "10px 12px", borderRadius: 8, lineHeight: 1.5 }}>⚠ {error}</div>
          )}
          <button type="submit" disabled={loading} style={{ width: "100%", marginTop: 24, padding: "13px", background: loading ? "#93c5fd" : "#0369a1", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Masuk..." : "Masuk"}
          </button>
        </form>
        <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 20, marginBottom: 0 }}>Sesi berakhir otomatis setelah 8 menit tidak aktif</p>
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
  var [assets, setAssets] = useState([]);
  var [loading, setLoading] = useState(true);
  var [expandedCat, setExpandedCat] = useState(null); 

  var token = localStorage.getItem("hams_token") || "";

  var load = useCallback(function() {
    setLoading(true);
    var qry = 'query { assets { type sub_category status } }';
    fetch("http://localhost:3000/graphql/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: qry })
    }).then(function(res) {
      return res.json();
    }).then(function(data) {
      if (data.data && data.data.assets) {
        setAssets(data.data.assets);
      }
      setLoading(false);
    }).catch(function() {
      setLoading(false);
    });
  }, [token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(function() { load(); }, [load]);

  var categories = {};
  for (var i = 0; i < assets.length; i++) {
    var a = assets[i];
    var cat = a.type || "Lainnya";
    var sub = a.sub_category || "Umum";

    if (!categories[cat]) {
      categories[cat] = { total: 0, available: 0, inUse: 0, maintenance: 0, subs: {} };
    }
    
    categories[cat].total++;
    if (a.status === "Available") categories[cat].available++;
    if (a.status === "In Use" || a.status === "In Transit") categories[cat].inUse++;
    if (a.status === "Maintenance" || a.status === "Sterilization") categories[cat].maintenance++;

    if (!categories[cat].subs[sub]) {
      categories[cat].subs[sub] = { total: 0, available: 0, inUse: 0, maintenance: 0 };
    }
    
    categories[cat].subs[sub].total++;
    if (a.status === "Available") categories[cat].subs[sub].available++;
    if (a.status === "In Use" || a.status === "In Transit") categories[cat].subs[sub].inUse++;
    if (a.status === "Maintenance" || a.status === "Sterilization") categories[cat].subs[sub].maintenance++;
  }

  if (loading) return <PageShell title="Dashboard HAMS"><p style={{ color: "#64748b" }}>Memuat dashboard...</p></PageShell>;

  return (
    <PageShell title="Dashboard Utama">
      
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ ...cardStyle, flex: 1, minWidth: 200, borderLeft: "4px solid #3b82f6" }}>
          <h3 style={{ margin: "0 0 5px", color: "#64748b", fontSize: 13 }}>Total Aset Terdaftar</h3>
          <p style={{ margin: 0, fontSize: 24, fontWeight: "bold", color: "#1e293b" }}>{assets.length}</p>
        </div>
        <div style={{ ...cardStyle, flex: 1, minWidth: 200, borderLeft: "4px solid #22c55e" }}>
          <h3 style={{ margin: "0 0 5px", color: "#64748b", fontSize: 13 }}>Aset Tersedia</h3>
          <p style={{ margin: 0, fontSize: 24, fontWeight: "bold", color: "#16a34a" }}>
            {assets.filter(function(a) { return a.status === "Available"; }).length}
          </p>
        </div>
        <div style={{ ...cardStyle, flex: 1, minWidth: 200, borderLeft: "4px solid #ef4444" }}>
          <h3 style={{ margin: "0 0 5px", color: "#64748b", fontSize: 13 }}>Sedang Diperbaiki</h3>
          <p style={{ margin: 0, fontSize: 24, fontWeight: "bold", color: "#dc2626" }}>
            {assets.filter(function(a) { return a.status === "Maintenance"; }).length}
          </p>
        </div>
      </div>

      <h3 style={sectionTitle}>Data Per Kategori & Grafik Pemakaian (Klik untuk detail)</h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.keys(categories).map(function(catName) {
          var c = categories[catName];
          var pctUse = c.total > 0 ? Math.round((c.inUse / c.total) * 100) : 0;
          var isExpanded = expandedCat === catName;

          return (
            <div key={catName} style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
              <div 
                style={{ padding: "16px", cursor: "pointer", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, background: isExpanded ? "#f8fafc" : "white" }}
                onClick={function() { setExpandedCat(isExpanded ? null : catName); }}
              >
                <div style={{ width: 180 }}>
                  <h4 style={{ margin: 0, fontSize: 16 }}>{catName}</h4>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{c.total + " Total Aset"}</span>
                </div>
                
                <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
                  <span style={{ background: "#d1fae5", color: "#065f46", padding: "4px 10px", borderRadius: 6 }}>Tersedia: <strong>{c.available}</strong></span>
                  <span style={{ background: "#fef3c7", color: "#92400e", padding: "4px 10px", borderRadius: 6 }}>Dipakai: <strong>{c.inUse}</strong></span>
                  <span style={{ background: "#fee2e2", color: "#991b1b", padding: "4px 10px", borderRadius: 6 }}>Rusak: <strong>{c.maintenance}</strong></span>
                </div>

                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4, color: "#64748b" }}>
                    <span>Pemakaian</span>
                    <span>{pctUse + "%"}</span>
                  </div>
                  <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: pctUse + "%", background: pctUse > 80 ? "#ef4444" : pctUse > 50 ? "#f59e0b" : "#3b82f6", transition: "width 0.5s" }}></div>
                  </div>
                </div>
                
                <div style={{ fontWeight: "bold", color: "#94a3b8" }}>{isExpanded ? "▲" : "▼"}</div>
              </div>

              {isExpanded && (
                <div style={{ background: "#f1f5f9", padding: "16px", borderTop: "1px solid #e2e8f0" }}>
                  <h5 style={{ margin: "0 0 10px", color: "#475569" }}>Detail Sub-Kategori:</h5>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                    {Object.keys(c.subs).map(function(subName) {
                      var s = c.subs[subName];
                      return (
                        <div key={subName} style={{ background: "white", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1" }}>
                          <strong style={{ display: "block", marginBottom: 6, color: "#0f172a" }}>{subName}</strong>
                          <div style={{ fontSize: 12, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tersedia:</span> <b style={{color: "#16a34a"}}>{s.available}</b></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Dipakai:</span> <b style={{color: "#d97706"}}>{s.inUse}</b></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Rusak:</span> <b style={{color: "#dc2626"}}>{s.maintenance}</b></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}

// ─── ASSETS PAGE ──────────────────────────────────────────────────────────────
function AssetsPage() {
  var [assets, setAssets] = useState([]);
  var [wards, setWards]   = useState([]);
  var [loading, setLoading] = useState(true);
  var [search, setSearch]   = useState("");
  var [filterStatus, setFilterStatus] = useState("");
  var [showForm, setShowForm] = useState(false);
  var [form, setForm]   = useState({ name: "", type: "", sub_category: "", current_ward: "" });
  var [saving, setSaving] = useState(false);
  var [qrModal, setQrModal]     = useState(null);
  var [editStatus, setEditStatus] = useState({ id: null, value: "" });
  var [detailModal, setDetailModal] = useState(null);
  var [detailData, setDetailData] = useState({ transfers: [], maintenance: [], loading: false });

  var canEdit = true;
  var token = localStorage.getItem("hams_token") || "";

  var load = useCallback(function() {
    setLoading(true);
    
    var fetchAssets = fetch("http://localhost:3000/graphql/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: "{ assets { id name type sub_category current_ward status qr_hash created_at } }" })
    }).then(function(res) { return res.json(); });

    var fetchWards = fetch("http://localhost:3000/graphql/wards", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: "{ wards { id ward_name } }" })
    }).then(function(res) { return res.json(); });

    Promise.all([fetchAssets, fetchWards]).then(function(results) {
      var assetData = results[0].data ? results[0].data.assets : [];
      var wardData = results[1].data ? results[1].data.wards : [];
      setAssets(assetData || []);
      setWards(wardData || []);
      setLoading(false);
    }).catch(function() {
      setLoading(false);
    });
  }, [token]);
// eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(function() { load(); }, [load]);

  var types = [];
  for (var i = 0; i < assets.length; i++) {
    if (assets[i].type && types.indexOf(assets[i].type) === -1) {
      types.push(assets[i].type);
    }
  }

  var filtered = [];
  for (var j = 0; j < assets.length; j++) {
    var a = assets[j];
    var q = search.toLowerCase();
    var matchSearch = !q || (a.name && a.name.toLowerCase().indexOf(q) > -1) || String(a.id).indexOf(q) > -1 || (a.current_ward && a.current_ward.toLowerCase().indexOf(q) > -1);
    var matchStatus = !filterStatus || a.status === filterStatus;
    if (matchSearch && matchStatus) {
      filtered.push(a);
    }
  }

  var grouped = {};
  for (var k = 0; k < filtered.length; k++) {
    var ast = filtered[k];
    var cat = ast.type || "Tanpa Kategori";
    var sub = ast.sub_category || "Umum";
    if (!grouped[cat]) grouped[cat] = {};
    if (!grouped[cat][sub]) grouped[cat][sub] = [];
    grouped[cat][sub].push(ast);
  }

  var handleAdd = async function(e) {
    e.preventDefault(); 
    setSaving(true);
    var hash = "qr_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
    var mut = 'mutation { addAsset(name: "' + form.name + '", type: "' + form.type + '", sub_category: "' + form.sub_category + '", current_ward: "' + form.current_ward + '", qr_hash: "' + hash + '") { message } }';
    
    try {
      var res = await fetch("http://localhost:3000/graphql/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ query: mut })
      });
      var data = await res.json();
      if (data.errors) {
        alert("Gagal: " + data.errors[0].message);
      } else {
        setShowForm(false); 
        setForm({ name: "", type: "", sub_category: "", current_ward: "" }); 
        load(); 
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
    setSaving(false);
  };

  var handleDelete = async function(id, name) {
    if (!confirm("Hapus " + name + "?")) return;
    var mut = 'mutation { deleteAsset(id: "' + id + '") { message } }';
    
    var res = await fetch("http://localhost:3000/graphql/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: mut })
    });
    var data = await res.json();
    if (data.errors) alert("Gagal: " + data.errors[0].message);
    else load();
  };

  var handleStatusSave = async function(id, ward) {
    if (!editStatus.value) return;
    var mut = 'mutation { updateAssetLocation(id: "' + id + '", current_ward: "' + ward + '", status: "' + editStatus.value + '") { message } }';
    
    var res = await fetch("http://localhost:3000/graphql/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: mut })
    });
    var data = await res.json();
    if (data.errors) alert("Gagal: " + data.errors[0].message);
    else { load(); setEditStatus({ id: null, value: "" }); }
  };

  var openQR = async function(hash, name) {
    setQrModal({ hash: hash, name: name, image: null });
    var qry = 'query { generateQR(hash: "' + hash + '") { image } }';
    
    var res = await fetch("http://localhost:3000/graphql/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: qry })
    });
    var data = await res.json();
    if (data.data && data.data.generateQR) {
      setQrModal({ hash: hash, name: name, image: data.data.generateQR.image });
    }
  };

  var openDetail = async function(asset) {
    setDetailModal(asset);
    setDetailData({ transfers: [], maintenance: [], loading: true });
    
    var qryMaint = 'query { maintenanceByAsset(asset_id: "' + asset.id + '") { id report_date description status action_date action_notes reporter } }';
    var qryTrans = 'query { transfers { id asset_id from_ward to_ward requested_at transfer_status } }';

    var fetchMaint = fetch("http://localhost:3000/graphql/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: qryMaint })
    }).then(function(res) { return res.json(); });

    var fetchTrans = fetch("http://localhost:3000/graphql/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: qryTrans })
    }).then(function(res) { return res.json(); });

    Promise.all([fetchMaint, fetchTrans]).then(function(results) {
      var mData = results[0].data && results[0].data.maintenanceByAsset ? results[0].data.maintenanceByAsset : [];
      var allTransfers = results[1].data && results[1].data.transfers ? results[1].data.transfers : [];
      
      var tData = [];
      for (var p = 0; p < allTransfers.length; p++) {
        if (String(allTransfers[p].asset_id) === String(asset.id)) {
          tData.push(allTransfers[p]);
        }
      }
      setDetailData({ transfers: tData, maintenance: mData, loading: false });
    });
  };

  var calculateAge = function(dateString) {
    if (!dateString) return "Umur tidak diketahui";
    var d1 = new Date(!isNaN(dateString) ? Number(dateString) : dateString);
    var d2 = new Date();
    var diff = d2.getTime() - d1.getTime();
    var days = Math.floor(diff / (1000 * 3600 * 24));
    return days + " hari";
  };

  var fmtDate = function(d) {
    if (!d) return "-";
    var parsedDate = new Date(!isNaN(d) ? Number(d) : d);
    return parsedDate.toLocaleString("id-ID");
  };

  return (
    <PageShell title="Manajemen Aset">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <input style={{ ...inputStyle, width: 240 }}
          placeholder="🔍 Cari ID, nama, ruangan..."
          value={search} onChange={function(e) { setSearch(e.target.value); }} />
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
              <label style={labelStyle}>Sub-Kategori</label>
              <input style={{ ...inputStyle, width: 140 }} value={form.sub_category}
                onChange={function(e) { setForm({ ...form, sub_category: e.target.value }); }} placeholder="cth: Kursi Roda" required />
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
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Object.keys(grouped).map(function(catName) {
            return (
              <div key={catName} style={{ background: "white", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ background: "#f8fafc", padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
                  <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>{"Kategori: " + catName}</h3>
                </div>
                
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                  {Object.keys(grouped[catName]).map(function(subName) {
                    var items = grouped[catName][subName];
                    return (
                      <div key={subName} style={{ border: "1px solid #cbd5e1", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ background: "#f1f5f9", padding: "8px 12px", borderBottom: "1px solid #cbd5e1" }}>
                          <h4 style={{ margin: 0, color: "#334155", fontSize: 14 }}>{"Sub-Kategori: " + subName} <span style={{fontSize: 12, fontWeight: "normal", color: "#64748b"}}>{"(" + items.length + " item)"}</span></h4>
                        </div>
                        
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                            <thead>
                              <tr style={{ background: "white", borderBottom: "1px solid #e2e8f0" }}>
                                <th style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600 }}>ID</th>
                                <th style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600 }}>Nama Item</th>
                                <th style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600 }}>Ruangan</th>
                                <th style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600 }}>Status</th>
                                {canEdit ? <th style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600 }}>Aksi (QR)</th> : null}
                              </tr>
                            </thead>
                            <tbody>
                              {items.map(function(a) {
                                return (
                                  <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "10px 12px" }}>{"#" + a.id}</td>
                                    <td style={{ padding: "10px 12px" }}><strong>{a.name}</strong></td>
                                    <td style={{ padding: "10px 12px" }}>{a.current_ward}</td>
                                    <td style={{ padding: "10px 12px" }}>
                                      {canEdit && editStatus.id === a.id ? (
                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                          <select style={{ ...inputStyle, padding: "4px 8px", fontSize: 12, width: 130 }}
                                            value={editStatus.value}
                                            onChange={function(e) { setEditStatus({ id: a.id, value: e.target.value }); }}>
                                            <option value="">-- Pilih --</option>
                                            {MANUAL_STATUSES.map(function(s) { return <option key={s}>{s}</option>; })}
                                          </select>
                                          <button style={{ ...btnSmall, background: "#16a34a", color: "white" }}
                                            onClick={function() { handleStatusSave(a.id, a.current_ward); }}>✓</button>
                                          <button style={btnSmall} onClick={function() { setEditStatus({ id: null, value: "" }); }}>✕</button>
                                        </div>
                                      ) : <Badge status={a.status} />}
                                    </td>
                                    {canEdit ? (
                                      <td style={{ padding: "10px 12px" }}>
                                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                          <button style={{ ...btnSmall, background: "#dbeafe", color: "#1e40af" }}
                                            onClick={function() { openQR(a.qr_hash, a.name); }}>🖨 QR</button>
                                          <button style={{ ...btnSmall, background: "#f3e8ff", color: "#7e22ce" }}
                                            onClick={function() { openDetail(a); }}>📄 Detail</button>
                                          <button style={{ ...btnSmall, background: "#fef3c7", color: "#92400e" }}
                                            onClick={function() { setEditStatus({ id: a.id, value: a.status }); }}>✎ Status</button>
                                          <button style={{ ...btnSmall, background: "#fee2e2", color: "#991b1b" }}
                                            onClick={function() { handleDelete(a.id, a.name); }}>🗑</button>
                                        </div>
                                      </td>
                                    ) : null}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {Object.keys(grouped).length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", background: "white", borderRadius: 8 }}>Tidak ada data aset</div>
          )}
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
              <div style={{ marginBottom: 4 }}><strong>Kategori:</strong> {detailModal.type} {"(Sub: " + (detailModal.sub_category || "-") + ")"}</div>
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
                            <div style={{ marginBottom: 4 }}><strong>{"Tanggal Lapor: " + fmtDate(m.report_date)}</strong> <span style={{ color: "#64748b" }}>{"(Oleh: " + m.reporter + ")"}</span></div>
                            <div style={{ marginBottom: 8 }}>{"Kendala: " + m.description}</div>
                            {m.action_date ? (
                              <div style={{ background: "#f0fdf4", borderLeft: "3px solid #22c55e", padding: 8, borderRadius: "0 6px 6px 0" }}>
                                <div style={{ marginBottom: 4 }}><strong>{"Tindakan Selesai (" + fmtDate(m.action_date) + ") - Status: " + m.status}</strong></div>
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
  var [wards, setWards]   = useState([]);
  var [assets, setAssets] = useState([]);
  var [loading, setLoading] = useState(true);
  var [newWard, setNewWard] = useState("");
  var [saving, setSaving]   = useState(false);
  var [editWard, setEditWard] = useState({ id: null, name: "" });

  var canEdit = true;
  var token = localStorage.getItem("hams_token") || "";

  var load = useCallback(function() {
    setLoading(true);
    
    var fetchWards = fetch("http://localhost:3000/graphql/wards", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: "{ wards { id ward_name } }" })
    }).then(function(res) { return res.json(); });

    var fetchAssets = fetch("http://localhost:3000/graphql/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: "{ assets { id name current_ward status } }" })
    }).then(function(res) { return res.json(); });

    Promise.all([fetchWards, fetchAssets]).then(function(res) {
      setWards(res[0].data && res[0].data.wards ? res[0].data.wards : []);
      setAssets(res[1].data && res[1].data.assets ? res[1].data.assets : []);
      setLoading(false);
    });
  }, [token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(function() { load(); }, [load]);

  var handleAddWard = async function(e) {
    e.preventDefault(); 
    setSaving(true);
    var mut = 'mutation { addWard(ward_name: "' + newWard + '") { message } }';
    
    try {
      var res = await fetch("http://localhost:3000/graphql/wards", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ query: mut })
      });
      var data = await res.json();
      if (data.errors) {
        alert("Gagal: " + data.errors[0].message);
      } else {
        setNewWard(""); 
        load();
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
    setSaving(false);
  };

  var handleDeleteWard = async function(id, name) {
    if (!confirm("Hapus ruangan " + name + "?")) return;
    var mut = 'mutation { deleteWard(id: "' + id + '") { message } }';
    
    try {
      var res = await fetch("http://localhost:3000/graphql/wards", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ query: mut })
      });
      var data = await res.json();
      if (data.errors) {
        alert("Gagal: " + data.errors[0].message);
      } else {
        load();
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  var handleSaveEdit = async function(id) {
    if (!editWard.name) return;
    var mut = 'mutation { updateWardName(id: "' + id + '", ward_name: "' + editWard.name + '") { message } }';
    
    try {
      var res = await fetch("http://localhost:3000/graphql/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ query: mut })
      });
      var data = await res.json();
      if (data.errors) {
        alert("Gagal update nama ruangan: " + data.errors[0].message);
      } else {
        setEditWard({ id: null, name: "" });
        load();
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  var getWardAssets = function(name) {
    var arr = [];
    for (var i = 0; i < assets.length; i++) {
      if (assets[i].current_ward === name) {
        arr.push(assets[i]);
      }
    }
    return arr;
  };

  if (loading) return <PageShell title="Manajemen Ruangan"><p style={{ color: "#64748b" }}>Memuat...</p></PageShell>;

  return (
    <PageShell title="Manajemen Ruangan / Lokasi">
      {canEdit && (
        <form onSubmit={handleAddWard} style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "flex-end" }}>
          <div>
            <label style={labelStyle}>Tambah Ruangan Baru</label>
            <input style={{ ...inputStyle, width: 200 }} value={newWard}
              onChange={function(e) { setNewWard(e.target.value); }} placeholder="Nama ruangan" required />
          </div>
          <button type="submit" style={btnPrimary} disabled={saving}>{saving ? "..." : "+ Tambah"}</button>
        </form>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {wards.map(function(w) {
          var wa = getWardAssets(w.ward_name);
          var available = 0;
          var inUse = 0;
          var steril = 0;
          for (var i = 0; i < wa.length; i++) {
            if (wa[i].status === "Available") available++;
            if (wa[i].status === "In Use") inUse++;
            if (wa[i].status === "Sterilization") steril++;
          }
          
          return (
            <div key={w.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                {editWard.id === w.id ? (
                  <div style={{ display: "flex", gap: 6, width: "100%" }}>
                    <input style={{ ...inputStyle, padding: "4px 8px", fontSize: 13, flex: 1 }} 
                      value={editWard.name} onChange={function(e) { setEditWard({ id: w.id, name: e.target.value }); }} />
                    <button style={{ ...btnSmall, background: "#16a34a", color: "white" }} 
                      onClick={function() { handleSaveEdit(w.id); }}>✓</button>
                    <button style={btnSmall} 
                      onClick={function() { setEditWard({ id: null, name: "" }); }}>✕</button>
                  </div>
                ) : (
                  <>
                    <h3 style={{ margin: 0, fontSize: 15 }}>{"🏥 " + w.ward_name}</h3>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ background: "#dbeafe", color: "#1e40af", borderRadius: 99, padding: "2px 9px", fontSize: 12, fontWeight: 600 }}>{wa.length + " aset"}</span>
                      {canEdit && (
                        <>
                          <button style={{ ...btnSmall, padding: "2px 8px", background: "#fef3c7", color: "#92400e" }}
                            onClick={function() { setEditWard({ id: w.id, name: w.ward_name }); }}>✎</button>
                          <button style={{ ...btnSmall, padding: "2px 8px", background: "#fee2e2", color: "#991b1b" }}
                            onClick={function() { handleDeleteWard(w.id, w.ward_name); }}>🗑</button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ background: "#d1fae5", color: "#065f46", borderRadius: 99, padding: "2px 9px", fontSize: 11 }}>{"✓ " + available + " tersedia"}</span>
                <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 99, padding: "2px 9px", fontSize: 11 }}>{"◉ " + inUse + " digunakan"}</span>
                {steril > 0 && <span style={{ background: "#ede9fe", color: "#5b21b6", borderRadius: 99, padding: "2px 9px", fontSize: 11 }}>{"🧪 " + steril + " steril"}</span>}
              </div>
              {wa.length > 0 && (
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 8, maxHeight: 180, overflowY: "auto", paddingRight: 4 }}>
                  {wa.map(function(a) { return (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderBottom: "1px solid #f8fafc" }}>
                      <span>{a.name}</span><Badge status={a.status} />
                    </div>
                  );})}
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
function TransferPage(props) {
  var userRole = props.userRole;
  var [assets, setAssets] = useState([]);
  var [wards, setWards]   = useState([]);
  var [form, setForm]     = useState({ assetId: "", qr_hash: "", from_ward: "", to_ward: "" });
  var [msg, setMsg]       = useState(null);
  var [loading, setLoading] = useState(false);
  
  var canEdit = userRole === "admin" || userRole === "staff";
  var token = localStorage.getItem("hams_token") || "";

  var loadData = useCallback(function() {
    var fetchAssets = fetch("http://localhost:3000/graphql/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: "{ assets { id name type current_ward status qr_hash } }" })
    }).then(function(res) { return res.json(); });

    var fetchWards = fetch("http://localhost:3000/graphql/wards", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: "{ wards { id ward_name } }" })
    }).then(function(res) { return res.json(); });

    Promise.all([fetchAssets, fetchWards]).then(function(results) {
      setAssets(results[0].data && results[0].data.assets ? results[0].data.assets : []);
      setWards(results[1].data && results[1].data.wards ? results[1].data.wards : []);
    });
  }, [token]);

  useEffect(function() { loadData(); }, [loadData]);

  var availableAssets = [];
  var inTransitAssets = [];
  for (var i = 0; i < assets.length; i++) {
    if (assets[i].status === "Available") availableAssets.push(assets[i]);
    if (assets[i].status === "In Transit") inTransitAssets.push(assets[i]);
  }

  var handleSelectAsset = function(id) {
    var a = null;
    for (var j = 0; j < assets.length; j++) {
      if (String(assets[j].id) === String(id)) {
        a = assets[j];
        break;
      }
    }
    if (a) setForm({ assetId: id, qr_hash: a.qr_hash, from_ward: a.current_ward, to_ward: "" });
  };

  var handleTransfer = async function(e) {
    e.preventDefault();
    if (form.from_ward === form.to_ward) {
      setMsg({ type: "error", text: "Ruangan tujuan tidak boleh sama dengan ruangan asal." }); 
      return;
    }
    setLoading(true); 
    setMsg(null);

    var mut = 'mutation { initiateTransfer(qr_hash: "' + form.qr_hash + '", from_ward: "' + form.from_ward + '", to_ward: "' + form.to_ward + '") { message } }';

    try {
      var res = await fetch("http://localhost:3000/graphql/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ query: mut })
      });
      var data = await res.json();
      
      if (data.errors) {
        setMsg({ type: "error", text: data.errors[0].message });
      } else {
        setMsg({ type: "success", text: "Transfer berhasil diinisiasi! Aset sekarang 'In Transit'." });
        setForm({ assetId: "", qr_hash: "", from_ward: "", to_ward: "" });
        loadData();
      }
    } catch (err) {
      setMsg({ type: "error", text: "Gagal melakukan transfer: " + err.message });
    }
    setLoading(false);
  };

  var handleCancel = async function(assetId, name) {
    if (!confirm('Batalkan transit untuk "' + name + '"?')) return;
    
    var mut = 'mutation { cancelTransfer(asset_id: "' + assetId + '") { message } }';

    try {
      var res = await fetch("http://localhost:3000/graphql/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ query: mut })
      });
      var data = await res.json();

      if (data.errors) {
        setMsg({ type: "error", text: "Gagal membatalkan: " + data.errors[0].message });
      } else {
        setMsg({ type: "success", text: 'Transit untuk "' + name + '" dibatalkan. Aset kembali Available.' });
        loadData();
      }
    } catch (err) {
      setMsg({ type: "error", text: "Gagal membatalkan: " + err.message });
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
                onChange={function(e) { handleSelectAsset(e.target.value); }} required>
                <option value="">-- Pilih Aset --</option>
                {availableAssets.map(function(a) {
                  return <option key={a.id} value={a.id}>{a.name + " (#" + a.id + ") — " + a.current_ward}</option>;
                })}
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
                value={form.to_ward} onChange={function(e) { setForm({ assetId: form.assetId, qr_hash: form.qr_hash, from_ward: form.from_ward, to_ward: e.target.value }); }}
                placeholder="Tujuan" required />
              <datalist id="ward-dl-t">{wards.map(function(w) { return <option key={w.id} value={w.ward_name} />; })}</datalist>
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
        <h3 style={sectionTitle}>{"Aset Sedang In Transit (" + inTransitAssets.length + ")"}</h3>
        {inTransitAssets.length === 0
          ? <p style={{ color: "#94a3b8", fontSize: 14 }}>Tidak ada aset yang sedang dalam perjalanan.</p>
          : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Nama</th>
                  <th style={thStyle}>Ruangan Saat Ini</th>
                  <th style={thStyle}>Status</th>
                  {canEdit ? <th style={thStyle}>Aksi</th> : null}
                </tr>
              </thead>
              <tbody>
                {inTransitAssets.map(function(a) {
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={tdStyle}>{"#" + a.id}</td>
                      <td style={tdStyle}><strong>{a.name}</strong></td>
                      <td style={tdStyle}>{a.current_ward}</td>
                      <td style={tdStyle}><Badge status={a.status} /></td>
                      {canEdit && (
                        <td style={tdStyle}>
                          <button style={{ ...btnSmall, background: "#fee2e2", color: "#991b1b" }}
                            onClick={function() { handleCancel(a.id, a.name); }}>✕ Batalkan</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>
    </PageShell>
  );
}

// ─── SCANNER PAGE ─────────────────────────────────────────────────────────────
function ScannerPage() {
  var [manualHash, setManualHash] = useState("");
  var [result, setResult]         = useState(null);
  var [transfer, setTransfer]     = useState(null);
  var [maintenanceLog, setMaintenanceLog] = useState(null);
  var [verifying, setVerifying]   = useState(false);
  var [scanning, setScanning]     = useState(false);
  var [libReady, setLibReady]     = useState(!!window.Html5Qrcode);
  var [reportForm, setReportForm] = useState(false);
  var [reportDesc, setReportDesc] = useState("");
  var [reportSaving, setReportSaving] = useState(false);
  var [actionMsg, setActionMsg]   = useState(null);
  var html5Ref = useRef(null);
  
  var token = localStorage.getItem("hams_token") || "";

  useEffect(function() {
    if (window.Html5Qrcode) return;
    var script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.onload = function() { setLibReady(true); };
    document.head.appendChild(script);
  }, []);

  var reset = function() {
    setResult(null); setTransfer(null); setMaintenanceLog(null); setManualHash("");
    setActionMsg(null); setReportForm(false); setReportDesc("");
  };

  var verify = async function(hash) {
    if (!hash || !hash.trim()) return;
    setVerifying(true); setResult(null); setTransfer(null); setMaintenanceLog(null); setActionMsg(null);
    try {
      var qryAsset = 'query { assetByQR(hash: "' + hash.trim() + '") { id name type current_ward status } }';
      var resAsset = await fetch("http://localhost:3000/graphql/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ query: qryAsset })
      });
      var dataAsset = await resAsset.json();

      if (dataAsset.errors) {
        setResult({ __error: true, msg: dataAsset.errors[0].message });
      } else if (dataAsset.data && dataAsset.data.assetByQR) {
        var assetObj = dataAsset.data.assetByQR;
        setResult(assetObj);

        if (assetObj.status === "In Transit") {
          var qryTrans = 'query { activeTransfer(asset_id: "' + assetObj.id + '") { id from_ward to_ward transfer_status } }';
          var resTrans = await fetch("http://localhost:3000/graphql/transfers", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({ query: qryTrans })
          });
          var dataTrans = await resTrans.json();
          if (dataTrans.data && dataTrans.data.activeTransfer) {
            setTransfer(dataTrans.data.activeTransfer);
          }
        }

        var qryMaint = 'query { maintenanceByAsset(asset_id: "' + assetObj.id + '") { id report_date description status action_date action_notes start_date estimated_end_date duration_days cost } }';
        var resMaint = await fetch("http://localhost:3000/graphql/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
          body: JSON.stringify({ query: qryMaint })
        });
        var dataMaint = await resMaint.json();
        if (dataMaint.data && dataMaint.data.maintenanceByAsset) {
          setMaintenanceLog(dataMaint.data.maintenanceByAsset);
        } else {
          setMaintenanceLog([]);
        }
      } else {
        setResult({ __error: true, msg: "Aset tidak ditemukan" });
      }
      // eslint-disable-next-line no-unused-vars
    } catch(e) {
      setResult({ __error: true, msg: "Gagal terhubung ke server" });
    }
    setVerifying(false);
  };

  var startCamera = function() {
    if (!libReady) { alert("Scanner sedang dimuat, coba lagi."); return; }
    setScanning(true); reset();
    setTimeout(function() {
      try {
        html5Ref.current = new window.Html5Qrcode("qr-reader-div");
        html5Ref.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          function(decoded) {
            html5Ref.current.stop().catch(function(){});
            setScanning(false);
            setManualHash(decoded);
            verify(decoded);
          }
        ).catch(function(err) { setScanning(false); alert("Kamera tidak tersedia: " + err); });
      } catch (err) { setScanning(false); console.error(err); }
    }, 150);
  };

  var stopCamera = function() {
    if (html5Ref.current) html5Ref.current.stop().catch(function(){});
    setScanning(false);
  };

  var confirmReceive = async function() {
    if (!transfer) return;
    var mut = 'mutation { receiveTransfer(id: "' + transfer.id + '") { message } }';
    try {
      var res = await fetch("http://localhost:3000/graphql/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ query: mut })
      });
      var data = await res.json();
      if (data.errors) {
        setActionMsg({ type: "error", text: "Gagal konfirmasi: " + data.errors[0].message });
      } else {
        setActionMsg({ type: "success", text: "✅ Aset berhasil diterima dan sekarang 'In Use' di " + transfer.to_ward + "." });
        setResult({ id: result.id, name: result.name, type: result.type, status: "In Use", current_ward: transfer.to_ward });
        setTransfer(null);
      }
      // eslint-disable-next-line no-unused-vars
    } catch(e) {
      setActionMsg({ type: "error", text: "Gagal terhubung ke server." });
    }
  };

  var denyReceive = function() {
    setActionMsg({ type: "warn", text: "⚠ Jangan terima aset ini. Instruksikan porter untuk mengembalikan ke ruangan asal." });
    setTransfer(null);
  };

  var submitReport = async function() {
    if (!reportDesc.trim() || !result) return;
    setReportSaving(true);
    var today = new Date().getTime().toString();
    var mut = 'mutation { createMaintenanceReport(asset_id: "' + result.id + '", asset_name: "' + result.name + '", type: "' + result.type + '", report_date: "' + today + '", description: "' + reportDesc + '", reporter: "Scanner") { message } }';
    
    try {
      var res = await fetch("http://localhost:3000/graphql/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ query: mut })
      });
      var data = await res.json();
      if (data.errors) {
        setActionMsg({ type: "error", text: "Gagal: " + data.errors[0].message });
      } else {
        setActionMsg({ type: "success", text: "📋 Laporan kerusakan berhasil dikirim." });
        setReportForm(false); 
        setReportDesc("");
        
        var qryMaint = 'query { maintenanceByAsset(asset_id: "' + result.id + '") { id report_date description status action_date action_notes start_date estimated_end_date duration_days cost } }';
        var resMaint = await fetch("http://localhost:3000/graphql/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
          body: JSON.stringify({ query: qryMaint })
        });
        var dataMaint = await resMaint.json();
        if (dataMaint.data && dataMaint.data.maintenanceByAsset) {
          setMaintenanceLog(dataMaint.data.maintenanceByAsset);
        }
      }
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      setActionMsg({ type: "error", text: "Gagal mengirim laporan." });
    }
    setReportSaving(false);
  };

  var msgStyle = function(type) {
    return {
      marginTop: 12, padding: "10px 14px", borderRadius: 8, fontSize: 13,
      background: type === "success" ? "#d1fae5" : type === "warn" ? "#fffbeb" : "#fee2e2",
      color:      type === "success" ? "#065f46" : type === "warn" ? "#92400e" : "#991b1b",
    };
  };

  var fmtDate = function(d) {
    if (!d) return "-";
    var parsedDate = new Date(!isNaN(d) ? Number(d) : d);
    return parsedDate.toLocaleString("id-ID").split(" ")[0];
  };

  return (
    <PageShell title="Scanner QR Aset">
      <div style={{ maxWidth: 520 }}>
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

        <div style={{ ...cardStyle, marginTop: 14 }}>
          <h3 style={sectionTitle}>🔍 Verifikasi Manual</h3>
          <div style={{ display: "flex", gap: 10 }}>
            <input style={{ ...inputStyle, flex: 1 }}
              placeholder="Ketik QR hash, cth: qr_hash_12345"
              value={manualHash} onChange={function(e) { setManualHash(e.target.value); }}
              onKeyDown={function(e) { if(e.key === "Enter") verify(manualHash); }} />
            <button style={btnPrimary} onClick={function() { verify(manualHash); }} disabled={verifying}>
              {verifying ? "..." : "Periksa"}
            </button>
          </div>
        </div>

        {result && (
          <div style={{ ...cardStyle, marginTop: 14, borderTop: result.__error ? "4px solid #ef4444" : "4px solid #22c55e" }}>
            {result.__error ? (
              <p style={{ color: "#dc2626", margin: 0 }}>{"❌ " + result.msg}</p>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{result.name}</h3>
                  <Badge status={result.status} />
                </div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 2 }}>
                  <div>📦 <strong>ID:</strong> {"#" + result.id}</div>
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

                {maintenanceLog && (
                  <div style={{ marginTop: 16, borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                    <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#0f172a" }}>🛠 Riwayat Pemeliharaan</h4>
                    {maintenanceLog.length === 0 ? (
                      <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Belum ada riwayat kerusakan.</p>
                    ) : (
                      <div style={{ maxHeight: 250, overflowY: "auto", paddingRight: 5 }}>
                        {maintenanceLog.map(function(m) {
                          return (
                            <div key={m.id} style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: 6, marginBottom: 8, fontSize: 12, borderLeft: m.status === "Selesai" ? "3px solid #22c55e" : "3px solid #f59e0b" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <strong>{fmtDate(m.report_date)}</strong>
                                <span style={{ color: m.status === "Selesai" ? "#16a34a" : "#d97706", fontWeight: 600 }}>{m.status}</span>
                              </div>
                              <div style={{ color: "#475569" }}>{"Kendala: " + m.description}</div>
                              
                              {m.start_date && m.status !== "Selesai" && (
                                <div style={{ background: "#e0f2fe", padding: "6px 8px", borderRadius: 4, marginTop: 8, border: "1px solid #bae6fd" }}>
                                  <div style={{ color: "#0369a1", fontWeight: 600, marginBottom: 2 }}>Informasi Tindak Lanjut:</div>
                                  <div style={{ color: "#0c4a6e" }}>{"Mulai Eksekusi: " + fmtDate(m.start_date)}</div>
                                  <div style={{ color: "#0c4a6e" }}>{"Estimasi Selesai: " + (m.estimated_end_date ? fmtDate(m.estimated_end_date) : "-")}</div>
                                </div>
                              )}

                              {m.status === "Selesai" && m.action_date && (
                                <div style={{ background: "#f0fdf4", padding: "6px 8px", borderRadius: 4, marginTop: 8, border: "1px solid #bbf7d0" }}>
                                  <div style={{ color: "#166534", fontWeight: 600, marginBottom: 2 }}>{"Tindakan Selesai (" + fmtDate(m.action_date) + "):"}</div>
                                  <div style={{ color: "#14532d" }}>{"Durasi: " + m.duration_days + " hari | Biaya: Rp " + m.cost}</div>
                                  <div style={{ color: "#14532d", marginTop: 2 }}>{"Catatan: " + (m.action_notes ? m.action_notes : "-")}</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {actionMsg && <div style={msgStyle(actionMsg.type)}>{actionMsg.text}</div>}

                {!reportForm && !actionMsg && (
                  <button style={{ ...btnSmall, marginTop: 12, background: "#fee2e2", color: "#991b1b", width: "100%", padding: "8px", textAlign: "center" }}
                    onClick={function() { setReportForm(true); }}>⚠ Laporkan Kerusakan</button>
                )}
                
                {reportForm && (
                  <div style={{ marginTop: 12 }}>
                        <label style={labelStyle}>Deskripsi Kerusakan</label>
                    <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
                      value={reportDesc} onChange={function(e) { setReportDesc(e.target.value); }}
                      placeholder="Jelaskan kerusakan yang terlihat..." />
                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                      <button style={{ ...btnPrimary, background: "#dc2626", flex: 1 }} onClick={submitReport} disabled={reportSaving}>
                        {reportSaving ? "..." : "Kirim Laporan"}
                      </button>
                      <button style={{ ...btnPrimary, background: "#64748b" }} onClick={function() { setReportForm(false); }}>Batal</button>
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
function MaintenancePage() {
  var [reports, setReports] = useState([]);
  var [assets, setAssets] = useState([]);
  var [filterStatus, setFilterStatus] = useState("");
  var [modal, setModal] = useState(null);
  var [form, setForm] = useState({
    status: "", start_date: "", est_date: "", vendor: "",
    cost: "", duration: "", notes: ""
  });

  var token = localStorage.getItem("hams_token") || "";

  var load = useCallback(function() {
    var qryMaint = 'query { maintenanceReports { id asset_id asset_name report_date description status reporter action_date vendor cost duration_days action_notes } }';
    var fetchMaint = fetch("http://localhost:3000/graphql/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: qryMaint })
    }).then(function(res) { return res.json(); });

    var qryAssets = 'query { assets { id name } }';
    var fetchAssets = fetch("http://localhost:3000/graphql/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: qryAssets })
    }).then(function(res) { return res.json(); });

    Promise.all([fetchMaint, fetchAssets]).then(function(results) {
      setReports(results[0].data && results[0].data.maintenanceReports ? results[0].data.maintenanceReports : []);
      setAssets(results[1].data && results[1].data.assets ? results[1].data.assets : []);
    });
  }, [token]);

  
  useEffect(function() { load(); }, [load]);

  var handleSave = async function(e) {
    e.preventDefault();
    
    var actionDateStr = form.status === "Selesai" ? new Date().getTime().toString() : "";
    var costNum = form.status === "Selesai" && form.cost ? parseFloat(form.cost) : 0;
    var durNum = form.status === "Selesai" && form.duration ? parseInt(form.duration) : 0;
    var notesStr = form.status === "Selesai" ? form.notes : "";

    var mut = 'mutation { addMaintenanceAction(report_id: "' + modal.id + '", start_date: "' + form.start_date + '", estimated_end_date: "' + form.est_date + '", action_date: "' + actionDateStr + '", vendor: "' + form.vendor + '", cost: ' + costNum + ', duration_days: ' + durNum + ', notes: "' + notesStr + '", status: "' + form.status + '") { message } }';

    try {
      var res = await fetch("http://localhost:3000/graphql/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ query: mut })
      });
      var data = await res.json();
      if (data.errors) {
        alert("Gagal: " + data.errors[0].message);
      } else {
        setModal(null);
        load();
      }
    } catch (err) {
      alert("Gagal menyimpan tindak lanjut: " + err.message);
    }
  };

  var fmtDate = function(d) {
    if (!d) return "-";
    var parsedDate = new Date(!isNaN(d) ? Number(d) : d);
    return parsedDate.toLocaleString("id-ID").split(" ")[0];
  };

  var grouped = {};
  for (var i = 0; i < reports.length; i++) {
    var r = reports[i];
    if (filterStatus && r.status !== filterStatus) continue;
    
    var assetName = "Aset #" + r.asset_id;
    if (r.asset_name) {
      assetName = r.asset_name + " (#" + r.asset_id + ")";
    } else {
      for (var j = 0; j < assets.length; j++) {
        if (String(assets[j].id) === String(r.asset_id)) {
          assetName = assets[j].name + " (#" + assets[j].id + ")";
          break;
        }
      }
    }
    
    if (!grouped[assetName]) grouped[assetName] = [];
    grouped[assetName].push(r);
  }

  return (
    <PageShell title="Laporan & Pemeliharaan Aset">
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <select style={{ ...inputStyle, width: 200 }} value={filterStatus} onChange={function(e) { setFilterStatus(e.target.value); }}>
          <option value="">Semua Status Laporan</option>
          <option value="Dilaporkan">Dilaporkan</option>
          <option value="Diperbaiki">Diperbaiki</option>
          <option value="Selesai">Selesai</option>
        </select>
        <button style={btnPrimary}>+ Laporkan Kerusakan</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {Object.keys(grouped).map(function(assetName) {
          return (
            <div key={assetName} style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
              <div style={{ background: "#f8fafc", padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>{"📦 " + assetName}</h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "white", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "10px 16px", color: "#64748b" }}>ID Laporan</th>
                      <th style={{ padding: "10px 16px", color: "#64748b" }}>Tanggal</th>
                      <th style={{ padding: "10px 16px", color: "#64748b" }}>Deskripsi</th>
                      <th style={{ padding: "10px 16px", color: "#64748b" }}>Status</th>
                      <th style={{ padding: "10px 16px", color: "#64748b" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[assetName].map(function(r) { return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 16px" }}>{"#" + r.id}</td>
                        <td style={{ padding: "10px 16px" }}>{fmtDate(r.report_date)}</td>
                        <td style={{ padding: "10px 16px" }}>{r.description}</td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ fontWeight: 600, color: r.status === "Selesai" ? "#16a34a" : r.status === "Diperbaiki" ? "#ca8a04" : "#dc2626" }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <button style={{ ...btnSmall, background: "#dbeafe", color: "#1e40af" }} onClick={function() { 
                            setModal(r);
                            setForm({
                              status: r.status === "Dilaporkan" ? "Diperbaiki" : r.status,
                              start_date: r.start_date || "",
                              est_date: r.est_date || "",
                              vendor: r.vendor || "",
                              cost: r.cost || "",
                              duration: r.duration || "",
                              notes: r.action_notes || ""
                            });
                          }}>🔧 Tindak Lanjut</button>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={function() { setModal(null); }}>
          <div style={{ background: "white", borderRadius: 16, padding: 24, width: 500, maxWidth: "90vw" }} onClick={function(e) { e.stopPropagation(); }}>
            <h3 style={{ margin: "0 0 20px" }}>{"Tindak Lanjut Laporan #" + modal.id}</h3>
            
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Mulai Eksekusi</label>
                  <input type="date" style={inputStyle} value={form.start_date} onChange={function(e) { setForm({status: form.status, start_date: e.target.value, est_date: form.est_date, vendor: form.vendor, cost: form.cost, duration: form.duration, notes: form.notes}); }} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Estimasi Selesai</label>
                  <input type="date" style={inputStyle} value={form.est_date} onChange={function(e) { setForm({status: form.status, start_date: form.start_date, est_date: e.target.value, vendor: form.vendor, cost: form.cost, duration: form.duration, notes: form.notes}); }} required />
                </div>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Status Saat Ini</label>
                  <select style={inputStyle} value={form.status} onChange={function(e) { setForm({status: e.target.value, start_date: form.start_date, est_date: form.est_date, vendor: form.vendor, cost: form.cost, duration: form.duration, notes: form.notes}); }}>
                    <option value="Diperbaiki">Diperbaiki</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Vendor / Teknisi</label>
                  <input style={inputStyle} value={form.vendor} onChange={function(e) { setForm({status: form.status, start_date: form.start_date, est_date: form.est_date, vendor: e.target.value, cost: form.cost, duration: form.duration, notes: form.notes}); }} placeholder="Nama vendor" required />
                </div>
              </div>

              {form.status === "Selesai" && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 16, borderRadius: 8, display: "flex", flexDirection: "column", gap: 12 }}>
                  <h4 style={{ margin: 0, color: "#16a34a", fontSize: 13 }}>Input Data Final Perbaikan</h4>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Total Biaya (Rp)</label>
                      <input type="number" style={inputStyle} value={form.cost} onChange={function(e) { setForm({status: form.status, start_date: form.start_date, est_date: form.est_date, vendor: form.vendor, cost: e.target.value, duration: form.duration, notes: form.notes}); }} placeholder="cth: 500000" required />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Durasi Asli</label>
                      <input style={inputStyle} value={form.duration} onChange={function(e) { setForm({status: form.status, start_date: form.start_date, est_date: form.est_date, vendor: form.vendor, cost: form.cost, duration: e.target.value, notes: form.notes}); }} placeholder="cth: 2" required />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Catatan Tindakan</label>
                    <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.notes} onChange={function(e) { setForm({status: form.status, start_date: form.start_date, est_date: form.est_date, vendor: form.vendor, cost: form.cost, duration: form.duration, notes: e.target.value}); }} placeholder="Penjelasan apa saja yang diganti/diperbaiki..." required></textarea>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button type="submit" style={btnPrimary}>💾 Simpan</button>
                <button type="button" style={{ ...btnPrimary, background: "#64748b" }} onClick={function() { setModal(null); }}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}

// ─── HISTORY PAGE ─────────────────────────────────────────────────────────────
function HistoryPage() {
  var [transfers, setTransfers] = useState([]);
  var [assets, setAssets]       = useState([]);
  var [search, setSearch]       = useState("");
  var [loading, setLoading]     = useState(true);
  var [error, setError]         = useState(null);

  var [detailModal, setDetailModal] = useState(null);
  var [detailData, setDetailData] = useState({ maintenance: [], loading: false });

  var token = localStorage.getItem("hams_token") || "";

  useEffect(function() {
    var qryTrans = 'query { transferHistory { id asset_id from_ward to_ward transfer_status requested_at completed_at } }';
    var fetchTrans = fetch("http://localhost:3000/graphql/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: qryTrans })
    }).then(function(res) { return res.json(); });

    var qryAssets = 'query { assets { id name } }';
    var fetchAssets = fetch("http://localhost:3000/graphql/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: qryAssets })
    }).then(function(res) { return res.json(); });

    Promise.all([fetchTrans, fetchAssets])
      .then(function(res) {
        if (res[0].data && res[0].data.transferHistory) { 
          setTransfers(res[0].data.transferHistory); 
        } else { 
          setError("Gagal mengambil riwayat transfer."); 
        }
        
        if (res[1].data && res[1].data.assets) {
          setAssets(res[1].data.assets);
        }
        setLoading(false);
      }).catch(function() { 
        setError("Gagal memuat data riwayat."); 
        setLoading(false); 
      });
  }, [token]);

  var fmtDate = function(d) {
    if (!d) return "-";
    var parsedDate = new Date(!isNaN(d) ? Number(d) : d);
    return parsedDate.toLocaleString("id-ID");
  };

  var getAsset = function(id) {
    for (var i = 0; i < assets.length; i++) {
      if (String(assets[i].id) === String(id)) return assets[i];
    }
    return null;
  };

  var getAssetName = function(id) {
    var a = getAsset(id);
    return a ? a.name : "Aset #" + id;
  };

  var openDetail = async function(assetId) {
    var asset = getAsset(assetId);
    if (!asset) {
      asset = { id: assetId, name: "Aset #" + assetId };
    }
    setDetailModal(asset);
    setDetailData({ maintenance: [], loading: true });

    var qryMaint = 'query { maintenanceByAsset(asset_id: "' + assetId + '") { id report_date description status action_date action_notes reporter } }';
    try {
      var res = await fetch("http://localhost:3000/graphql/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ query: qryMaint })
      });
      var data = await res.json();
      var mData = data.data && data.data.maintenanceByAsset ? data.data.maintenanceByAsset : [];
      setDetailData({ maintenance: mData, loading: false });
    } catch  {
      setDetailData({ maintenance: [], loading: false });
    }
  };

  var filtered = [];
  for (var j = 0; j < transfers.length; j++) {
    var t = transfers[j];
    var q = search.toLowerCase();
    var matchId = String(t.asset_id).toLowerCase().indexOf(q) > -1;
    var matchName = getAssetName(t.asset_id).toLowerCase().indexOf(q) > -1;
    var matchFrom = t.from_ward && t.from_ward.toLowerCase().indexOf(q) > -1;
    var matchTo = t.to_ward && t.to_ward.toLowerCase().indexOf(q) > -1;
    
    if (!q || matchId || matchName || matchFrom || matchTo) {
      filtered.push(t);
    }
  }

  var sColor = function(s) {
    return {
      background: s === "Completed" ? "#d1fae5" : s === "In Transit" ? "#dbeafe" : "#fef3c7",
      color:      s === "Completed" ? "#065f46" : s === "In Transit" ? "#1e40af" : "#92400e",
      borderRadius: 99, padding: "2px 10px", fontSize: 12, fontWeight: 600,
    };
  };

  return (
    <PageShell title="Riwayat Pergerakan Aset">
      <input style={{ ...inputStyle, width: 280, marginBottom: 16 }}
        placeholder="🔍 Cari ID, nama aset, ruangan..."
        value={search} onChange={function(e) { setSearch(e.target.value); }} />

      {loading ? <p style={{ color: "#64748b" }}>Memuat riwayat...</p>
        : error ? (
          <div style={{ ...cardStyle, background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", fontSize: 13 }}>{error}</div>
        ) : (
          <div style={cardStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {["#", "Aset", "Dari", "Ke", "Status", "Waktu Kirim", "Selesai", "Aksi"].map(function(h) { return <th key={h} style={thStyle}>{h}</th>; })}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8" }}>
                    {transfers.length === 0 ? "Belum ada riwayat transfer." : "Tidak ada hasil pencarian."}
                  </td></tr>
                )}
                {filtered.map(function(t) { return (
                  <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>{"#" + t.id}</td>
                    <td style={tdStyle}><strong>{getAssetName(t.asset_id)}</strong><div style={{ fontSize: 11, color: "#94a3b8" }}>{"#" + t.asset_id}</div></td>
                    <td style={tdStyle}>{t.from_ward}</td>
                    <td style={tdStyle}><strong>{t.to_ward}</strong></td>
                    <td style={tdStyle}><span style={sColor(t.transfer_status)}>{t.transfer_status}</span></td>
                    <td style={{ ...tdStyle, fontSize: 12, color: "#64748b" }}>{fmtDate(t.requested_at)}</td>
                    <td style={{ ...tdStyle, fontSize: 12, color: "#64748b" }}>{t.completed_at ? fmtDate(t.completed_at) : "—"}</td>
                    <td style={tdStyle}>
                      <button style={{ ...btnSmall, background: "#f3e8ff", color: "#7e22ce" }} onClick={function() { openDetail(t.asset_id); }}>📄 Detail Kerusakan</button>
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        )}

      {detailModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={function() { setDetailModal(null); }}>
          <div style={{ background: "white", borderRadius: 16, padding: 24, width: 600, maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto" }} onClick={function(e) { e.stopPropagation(); }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{"Riwayat Kerusakan: " + detailModal.name}</h3>
              <button style={btnSmall} onClick={function() { setDetailModal(null); }}>✕</button>
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 350, overflowY: "auto" }}>
              {detailData.loading ? <div style={{ padding: 12, fontSize: 13 }}>Memuat data...</div> : (
                detailData.maintenance.length === 0 ? <div style={{ padding: 12, fontSize: 13, color: "#64748b" }}>Aset belum pernah dilaporkan rusak</div> : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <tbody>
                      {detailData.maintenance.map(function(m) { return (
                        <tr key={m.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "12px 10px" }}>
                            <div style={{ marginBottom: 4 }}><strong>{"Tanggal Lapor: " + fmtDate(m.report_date)}</strong> <span style={{ color: "#64748b" }}>{"(Oleh: " + m.reporter + ")"}</span></div>
                            <div style={{ marginBottom: 8 }}>{"Kendala: " + m.description}</div>
                            {m.action_date ? (
                              <div style={{ background: "#f0fdf4", borderLeft: "3px solid #22c55e", padding: 8, borderRadius: "0 6px 6px 0" }}>
                                <div style={{ marginBottom: 4 }}><strong>{"Tindakan Selesai (" + fmtDate(m.action_date) + ") - Status: " + m.status}</strong></div>
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
// ─── USERS PAGE ───────────────────────────────────────────────────────────────
function UsersPage(props) {
  var currentUser = props.currentUser;
  var [users, setUsers]   = useState([]);
  var [loading, setLoading] = useState(true);
  var [showForm, setShowForm] = useState(false);
  var [form, setForm]     = useState({ username: "", password: "", role: "staff" });
  var [saving, setSaving] = useState(false);
  var [msg, setMsg]       = useState(null);

  var token = localStorage.getItem("hams_token") || "";

  var load = useCallback(function() {
    var qry = 'query { users { id username role created_at } }';
    fetch("http://localhost:3000/graphql/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ query: qry })
    }).then(function(res) {
      return res.json();
    }).then(function(data) {
      if (data.data && data.data.users) {
        setUsers(data.data.users);
      }
      setLoading(false);
    }).catch(function() {
      setLoading(false);
    });
  }, [token]);

  
  useEffect(function() { load(); }, [load]);

  var handleRegister = async function(e) {
    e.preventDefault(); 
    setSaving(true); 
    setMsg(null);
    var mut = 'mutation { register(username: "' + form.username + '", password: "' + form.password + '", role: "' + form.role + '") { message } }';
    
    try {
      var res = await fetch("http://localhost:3000/graphql/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ query: mut })
      });
      var data = await res.json();
      
      if (data.errors) {
        setMsg({ type: "error", text: data.errors[0].message });
      } else {
        var roleLabel = form.role === "admin" ? "Admin" : form.role === "staff" ? "Staff Logistik" : "Perawat";
        setMsg({ type: "success", text: 'Akun "' + form.username + '" (' + roleLabel + ') berhasil dibuat.' });
        setForm({ username: "", password: "", role: "staff" }); 
        load();
      }
    } catch  {
      setMsg({ type: "error", text: "Gagal terhubung ke server" });
    }
    setSaving(false);
  };

  var handleDelete = async function(id, username) {
    if (!confirm('Hapus akun "' + username + '"?')) return;
    var mut = 'mutation { deleteUser(id: "' + id + '") { message } }';
    
    try {
      var res = await fetch("http://localhost:3000/graphql/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ query: mut })
      });
      var data = await res.json();
      
      if (data.errors) {
        alert("Gagal: " + data.errors[0].message);
      } else {
        load();
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  var ROLE_BADGE = {
    admin: { label: "Admin",          bg: "#fee2e2", color: "#991b1b" },
    staff: { label: "Staff Logistik", bg: "#dbeafe", color: "#1e40af" },
    nurse: { label: "Perawat",        bg: "#d1fae5", color: "#065f46" },
  };
  
  var ACCESS = {
    admin: "Akses penuh",
    staff: "Semua fitur (kecuali Kelola Akun)",
    nurse: "Scanner QR saja",
  };

  var fmtDate = function(d) {
    if (!d) return "-";
    var parsedDate = new Date(!isNaN(d) ? Number(d) : d);
    return parsedDate.toLocaleDateString("id-ID");
  };

  return (
    <PageShell title="Kelola Akun Pengguna">
      <button style={{ ...btnPrimary, marginBottom: 16 }} onClick={function() { setShowForm(!showForm); }}>
        {showForm ? "✕ Tutup" : "+ Buat Akun Baru"}
      </button>

      {showForm && (
        <div style={{ ...cardStyle, marginBottom: 16, background: "#f0f9ff", border: "1.5px solid #7dd3fc" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14 }}>Registrasi Akun Baru</h3>
          <form onSubmit={handleRegister} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={labelStyle}>Username</label>
              <input style={{ ...inputStyle, width: 160 }} value={form.username}
                onChange={function(e) { setForm({ username: e.target.value, password: form.password, role: form.role }); }} required />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input style={{ ...inputStyle, width: 160 }} type="password" value={form.password}
                onChange={function(e) { setForm({ username: form.username, password: e.target.value, role: form.role }); }} minLength={6} required />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <select style={{ ...inputStyle, width: 165 }} value={form.role}
                onChange={function(e) { setForm({ username: form.username, password: form.password, role: e.target.value }); }}>
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
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Hak Akses</th>
                <th style={thStyle}>Dibuat</th>
                <th style={thStyle}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map(function(u) {
                var rb = ROLE_BADGE[u.role] || { label: u.role, bg: "#f3f4f6", color: "#374151" };
                return (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>{"#" + u.id}</td>
                    <td style={tdStyle}>
                      <strong>{u.username}</strong>
                      {u.id === currentUser.id && <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>(Anda)</span>}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: rb.bg, color: rb.color, borderRadius: 99, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{rb.label}</span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: "#64748b" }}>{ACCESS[u.role] || "—"}</td>
                    <td style={{ ...tdStyle, fontSize: 12, color: "#64748b" }}>{fmtDate(u.created_at)}</td>
                    <td style={tdStyle}>
                      {u.id !== currentUser.id && (
                        <button style={{ ...btnSmall, background: "#fee2e2", color: "#991b1b" }}
                          onClick={function() { handleDelete(u.id, u.username); }}>🗑 Hapus</button>
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

