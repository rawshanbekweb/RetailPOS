import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore(s => s.setAuth);
  const [form, setForm] = useState({ store_name: "", email: "", password: "", currency: "UZS", timezone: "Asia/Tashkent" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await authApi.register({
        store_name:       form.store_name,
        email:            form.email,
        password:         form.password,
        store_timezone:   form.timezone,
        store_currency:   form.currency,
      });
      setAuth(data.access_token, data.refresh_token, data.user as any, data.store as any);
      navigate("/admin");
    } catch (err: any) {
      setError(err.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="card" style={{ width: 400 }}>
        <h2 className="text-center" style={{ marginBottom: 24 }}>Create Your Store</h2>
        <form onSubmit={handleSubmit}>
          <div className="mt-3">
            <label className="label">Store Name</label>
            <input placeholder="My Store" value={form.store_name} onChange={set("store_name")} required />
          </div>
          <div className="mt-3">
            <label className="label">Email</label>
            <input type="email" placeholder="owner@store.com" value={form.email} onChange={set("email")} required />
          </div>
          <div className="mt-3">
            <label className="label">Password</label>
            <input type="password" placeholder="Min 8 characters" value={form.password} onChange={set("password")} required minLength={8} />
          </div>
          <div className="grid-2 mt-3">
            <div>
              <label className="label">Currency</label>
              <select value={form.currency} onChange={set("currency")}>
                <option>UZS</option><option>USD</option><option>EUR</option><option>RUB</option>
              </select>
            </div>
            <div>
              <label className="label">Timezone</label>
              <select value={form.timezone} onChange={set("timezone")}>
                <option value="Asia/Tashkent">Tashkent (UTC+5)</option>
                <option value="Europe/Moscow">Moscow (UTC+3)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">New York</option>
              </select>
            </div>
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn-primary btn-full mt-4" disabled={loading}>
            {loading ? "Creating…" : "Create Store & Continue"}
          </button>
        </form>
        <p className="text-center text-sm text-gray mt-4">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
