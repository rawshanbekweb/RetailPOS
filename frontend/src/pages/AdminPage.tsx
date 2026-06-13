import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { productsApi, salesApi, usersApi, storeApi, analyticsApi, type RemoteProduct, type RemoteSale, type RemoteUser, type AnalyticsData } from "../services/api";
import NavBar from "../components/NavBar";

type Tab = "analytics" | "products" | "sales" | "users" | "settings";

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, store } = useAuthStore();
  const [tab, setTab] = useState<Tab>("analytics");

  useEffect(() => {
    if (!user || user.role === "cashier") navigate("/pos");
  }, [user, navigate]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "analytics", label: "Analytics" },
    { key: "products",  label: "Products"  },
    { key: "sales",     label: "Sales"     },
    { key: "users",     label: "Users"     },
    { key: "settings",  label: "Settings"  },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e5e7eb", background: "#fff", padding: "0 24px" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              background: "none", border: "none", padding: "14px 20px", fontWeight: 600,
              fontSize: 14, cursor: "pointer", color: tab === t.key ? "#2196f3" : "#6b7280",
              borderBottom: tab === t.key ? "2px solid #2196f3" : "2px solid transparent",
              marginBottom: -2,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: 24, maxWidth: 1100, width: "100%", margin: "0 auto" }}>
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "products"  && <ProductsTab />}
        {tab === "sales"     && <SalesTab />}
        {tab === "users"     && <UsersTab />}
        {tab === "settings"  && <SettingsTab />}
      </div>
    </div>
  );
}

/* ── Analytics ── */
function AnalyticsTab() {
  const [data, setData]   = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");
  const store = useAuthStore(s => s.store);
  const cur   = store?.currency ?? "UZS";
  const fmt   = (n: string | number) => `${cur} ${parseFloat(String(n)).toLocaleString()}`;

  useEffect(() => {
    analyticsApi.get().then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <p className="error-msg">{error}</p>;
  if (!data)  return <p className="text-gray">Loading…</p>;

  const periods = [
    { label: "Today",     d: data.today        },
    { label: "7 Days",    d: data.last_7_days  },
    { label: "30 Days",   d: data.last_30_days },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Analytics</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {periods.map(p => (
          <div key={p.label} className="card">
            <p className="text-gray text-sm">{p.label}</p>
            <p className="text-2xl font-bold mt-2">{fmt(p.d.revenue)}</p>
            <p className="text-sm text-gray mt-1">{p.d.sale_count} sales · avg {fmt(p.d.avg_transaction)}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Daily Revenue (30 days)</h3>
          {data.daily.length === 0 ? <p className="text-gray text-sm">No data yet</p> : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead><tr><th>Date</th><th>Sales</th><th>Revenue</th></tr></thead>
                <tbody>
                  {data.daily.slice(-14).map(d => (
                    <tr key={d.day}>
                      <td>{d.day}</td>
                      <td>{d.sale_count}</td>
                      <td>{fmt(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Top Products</h3>
          {data.top_products.length === 0 ? <p className="text-gray text-sm">No data yet</p> : (
            <table className="table">
              <thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead>
              <tbody>
                {data.top_products.map((p, i) => (
                  <tr key={i}>
                    <td><div style={{ fontWeight: 600 }}>{p.product_name}</div><div className="text-xs text-gray">{p.product_sku}</div></td>
                    <td>{p.units_sold}</td>
                    <td>{fmt(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Products ── */
function ProductsTab() {
  const [products, setProducts] = useState<RemoteProduct[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RemoteProduct | null>(null);
  const [form, setForm] = useState({ sku: "", name: "", price: "", stock_quantity: "0", low_stock_threshold: "5" });

  const load = () => {
    setLoading(true);
    productsApi.list().then(r => { setProducts(r.products); setLoading(false); }).catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(load, []);

  function openCreate() { setForm({ sku: "", name: "", price: "", stock_quantity: "0", low_stock_threshold: "5" }); setEditItem(null); setShowForm(true); }
  function openEdit(p: RemoteProduct) {
    setForm({ sku: p.sku, name: p.name, price: p.price, stock_quantity: String(p.stock_quantity), low_stock_threshold: String(p.low_stock_threshold) });
    setEditItem(p); setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...form, price: parseFloat(form.price), stock_quantity: parseInt(form.stock_quantity), low_stock_threshold: parseInt(form.low_stock_threshold) };
    try {
      if (editItem) await productsApi.update(editItem.id, body);
      else          await productsApi.create(body);
      setShowForm(false); load();
    } catch (err: any) { setError(err.message); }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2>Products</h2>
        <button className="btn-primary" onClick={openCreate}>+ Add Product</button>
      </div>
      {error && <p className="error-msg mb-4">{error}</p>}
      {loading ? <p className="text-gray">Loading…</p> : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>SKU</th><th>Name</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td className="text-sm text-gray">{p.sku}</td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{parseFloat(p.price).toLocaleString()}</td>
                  <td>
                    <span style={{ color: p.stock_quantity <= p.low_stock_threshold ? "#ef4444" : undefined }}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td><span className={`badge ${p.is_active ? "badge-green" : "badge-gray"}`}>{p.is_active ? "Active" : "Inactive"}</span></td>
                  <td><button className="btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{ marginBottom: 16 }}>{editItem ? "Edit Product" : "New Product"}</h3>
            <form onSubmit={handleSave}>
              <div className="grid-2">
                <div><label className="label">SKU</label><input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} required /></div>
                <div><label className="label">Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
                <div><label className="label">Price</label><input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required /></div>
                <div><label className="label">Stock</label><input type="number" min="0" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} /></div>
                <div><label className="label">Low Stock Threshold</label><input type="number" min="0" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} /></div>
              </div>
              <div className="flex mt-4" style={{ gap: 10 }}>
                <button type="submit" className="btn-primary btn-full">Save</button>
                <button type="button" className="btn-secondary btn-full" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sales ── */
function SalesTab() {
  const [sales,   setSales]   = useState<RemoteSale[]>([]);
  const [loading, setLoading] = useState(true);
  const store = useAuthStore(s => s.store);
  const cur   = store?.currency ?? "UZS";

  useEffect(() => {
    salesApi.list().then(r => { setSales(r.sales); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Recent Sales</h2>
      {loading ? <p className="text-gray">Loading…</p> : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Date</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id}>
                  <td className="text-sm">{new Date(s.client_created_at).toLocaleString()}</td>
                  <td style={{ fontWeight: 700 }}>{cur} {parseFloat(s.total_amount).toLocaleString()}</td>
                  <td><span className="badge badge-blue">{s.payment_method}</span></td>
                  <td><span className={`badge ${s.status === "completed" ? "badge-green" : "badge-red"}`}>{s.status}</span></td>
                </tr>
              ))}
              {sales.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: "#6b7280" }}>No sales yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Users ── */
function UsersTab() {
  const [users,   setUsers]   = useState<RemoteUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", role: "cashier" });
  const [error, setError] = useState("");

  const load = () => {
    usersApi.list().then(r => { setUsers(r.users); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await usersApi.create(form);
      setShowForm(false); setForm({ email: "", password: "", role: "cashier" }); load();
    } catch (err: any) { setError(err.message); }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2>Users</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add User</button>
      </div>
      {loading ? <p className="text-gray">Loading…</p> : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td><span className="badge badge-blue">{u.role}</span></td>
                  <td><span className={`badge ${u.is_active ? "badge-green" : "badge-gray"}`}>{u.is_active ? "Active" : "Inactive"}</span></td>
                  <td className="text-sm text-gray">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{ marginBottom: 16 }}>Add User</h3>
            {error && <p className="error-msg mb-4">{error}</p>}
            <form onSubmit={handleCreate}>
              <div><label className="label">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
              <div className="mt-3"><label className="label">Password</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required /></div>
              <div className="mt-3">
                <label className="label">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div className="flex mt-4" style={{ gap: 10 }}>
                <button type="submit" className="btn-primary btn-full">Create</button>
                <button type="button" className="btn-secondary btn-full" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Settings ── */
function SettingsTab() {
  const { store, setAuth, user, refreshToken, accessToken } = useAuthStore();
  const [form, setForm] = useState({
    name: store?.name ?? "", currency: store?.currency ?? "UZS",
    timezone: store?.timezone ?? "UTC", tax_rate: store?.tax_rate ?? "0",
  });
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaved(false);
    try {
      const updated = await storeApi.update({ ...form, tax_rate: parseFloat(form.tax_rate) });
      setAuth(accessToken!, refreshToken!, user!, updated as any);
      setSaved(true);
    } catch (err: any) { setError(err.message); }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ maxWidth: 500 }}>
      <h2 style={{ marginBottom: 20 }}>Store Settings</h2>
      <div className="card">
        <form onSubmit={handleSave}>
          <div><label className="label">Store Name</label><input value={form.name} onChange={set("name")} required /></div>
          <div className="mt-3">
            <label className="label">Currency</label>
            <select value={form.currency} onChange={set("currency")}>
              <option>UZS</option><option>USD</option><option>EUR</option><option>RUB</option>
            </select>
          </div>
          <div className="mt-3">
            <label className="label">Timezone</label>
            <select value={form.timezone} onChange={set("timezone")}>
              <option value="Asia/Tashkent">Tashkent (UTC+5)</option>
              <option value="Europe/Moscow">Moscow (UTC+3)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">New York</option>
            </select>
          </div>
          <div className="mt-3"><label className="label">Tax Rate (%)</label><input type="number" step="0.01" min="0" max="100" value={form.tax_rate} onChange={set("tax_rate")} /></div>
          {error  && <p className="error-msg mt-3">{error}</p>}
          {saved  && <p style={{ color: "#16a34a", fontSize: 13, marginTop: 8 }}>Settings saved!</p>}
          <button type="submit" className="btn-primary mt-4">Save Changes</button>
        </form>
      </div>
    </div>
  );
}
